from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
import requests
import re
import json
import xml.etree.ElementTree as ET
from typing import List, Dict, Optional

from services.auth_service import auth_service, SessionData
from database import create_db_and_tables, engine, Game

app = FastAPI(title="SyncStore API")

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def fetch_steam_metadata(appid: str):
    """Fetches authentic metadata from Steam Store API."""
    try:
        url = f"https://store.steampowered.com/api/appdetails?appids={appid}"
        res = requests.get(url, timeout=5)
        data = res.json()
        if data and data.get(appid, {}).get('success'):
            g_data = data[appid]['data']
            desc = g_data.get('short_description', "Secure archive entry.")
            desc = re.sub('<[^<]+?>', '', desc)
            year = 2023
            if g_data.get('release_date', {}).get('date'):
                ym = re.search(r'\d{4}', g_data['release_date']['date'])
                if ym: year = int(ym.group())
            genres = [g['description'] for g in g_data.get('genres', [])]
            return desc, year, ", ".join(genres)
    except: pass
    return None, 2023, "Steam Game"

@app.get("/games")
async def get_games():
    with Session(engine) as session:
        return session.exec(select(Game)).all()

@app.post("/auth/session")
async def save_session(data: SessionData):
    user_id = "user_1"
    captured_username = data.username or "Verified_Member"
    if data.platform == "steam" and data.user_id:
        try:
            user_url = f"https://steamcommunity.com/profiles/{data.user_id}/?xml=1"
            user_res = requests.get(user_url, timeout=5)
            root = ET.fromstring(user_res.content)
            real_name = root.find('steamID').text
            if real_name: captured_username = real_name
        except: pass
    auth_service.save_session(user_id, data.platform, data.cookies, captured_username, data.user_id)
    print(f"[AUTH] Uplink stable for {data.platform}. User: {captured_username}")
    return {"message": f"Linked {data.platform} to node.", "username": captured_username}

@app.post("/sync/all")
async def trigger_sync(background_tasks: BackgroundTasks):
    """Purges all cached units and scrapes real-time data from all authenticated nodes."""
    connected_platforms = []
    for p in ["steam", "epic games", "playstation", "xbox"]:
        sess = auth_service.get_session("user_1", p)
        if sess: connected_platforms.append((p, sess))
    
    if not connected_platforms:
        return {"message": "Access Denied: No nodes authenticated.", "scraped": 0}

    with Session(engine) as session:
        # --- GLOBAL CACHE PURGE ---
        # Ensure 100% clean state. Get rid of EVERYTHING, including any mock remnants.
        for eg in session.exec(select(Game)).all():
            session.delete(eg)
        session.commit()
        print("[SYNC] Global Cache Purge complete. Re-scraping authenticated nodes...")

        total_scraped = 0
        for platform, sess in connected_platforms:
            if platform == "steam":
                steam_id = sess.get("user_id")
                if steam_id:
                    print(f"[SCRAPER] Target Lock: {steam_id}")
                    try:
                        scr = requests.Session()
                        scr.headers.update({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'})

                        # LAYER 1: RECENT ACTIVITY (Highest visibility)
                        prof_res = scr.get(f"https://steamcommunity.com/profiles/{steam_id}/", timeout=10)
                        recent = re.findall(r'https://steamcommunity.com/app/(\d+)">([^<]+)</a>', prof_res.text)
                        for aid, name in recent:
                            existing = session.exec(select(Game).where(Game.platform_game_id == aid)).first()
                            if not existing:
                                d, y, g = fetch_steam_metadata(aid)
                                session.add(Game(platform_game_id=aid, name=name.strip(), platform="steam", image_url=f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{aid}/library_600x900.jpg", description=d, year=y, genre=g))
                                total_scraped += 1
                        session.commit()

                        # LAYER 2: BADGES (Broad Capture for owned games)
                        badge_res = scr.get(f"https://steamcommunity.com/profiles/{steam_id}/badges/", timeout=10)
                        # More aggressive badge regex
                        badges = re.findall(r'/badges/(\d+)">.*?class="badge_title">([^<]+)<', badge_res.text, re.DOTALL)
                        for aid, title in badges:
                            t = title.strip().replace('&nbsp;', '')
                            if any(x in t for x in ["Badge", "Level", "Sale", "Awards", "Year"]): continue
                            if not session.exec(select(Game).where(Game.platform_game_id == aid)).first():
                                d, y, g = fetch_steam_metadata(aid)
                                session.add(Game(platform_game_id=aid, name=t, platform="steam", image_url=f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{aid}/library_600x900.jpg", description=d, year=y, genre=g))
                                total_scraped += 1
                        session.commit()

                        # LAYER 3: XML (Regex Volume)
                        xml_res = scr.get(f"https://steamcommunity.com/profiles/{steam_id}/games?xml=1", timeout=15)
                        xml_matches = re.findall(r'<game>.*?<appID>(\d+)</appID>.*?<name>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</name>', xml_res.text, re.DOTALL)
                        for aid, name in xml_matches:
                            if not session.exec(select(Game).where(Game.platform_game_id == aid)).first():
                                session.add(Game(platform_game_id=aid, name=name.strip(), platform="steam", image_url=f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{aid}/library_600x900.jpg", description="Authentic Steam Unit", year=2023, genre="Steam Game"))
                                total_scraped += 1
                        session.commit()
                    except Exception as e: print(f"[SCRAPER] Steam Fatal: {e}")

        # Final DB Verification
        real_count = len(session.exec(select(Game)).all())
    return {"message": f"Sync complete. {real_count} real units active.", "scraped": real_count}

@app.get("/health")
async def health():
    return {"status": "healthy"}
