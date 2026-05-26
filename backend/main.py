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
    connected_platforms = []
    for p in ["steam", "epic games", "playstation", "xbox"]:
        sess = auth_service.get_session("user_1", p)
        if sess: connected_platforms.append((p, sess))
    
    if not connected_platforms:
        return {"message": "Access Denied: No nodes authenticated.", "scraped": 0}

    with Session(engine) as session:
        # --- PERMANENT CACHE PURGE ---
        for eg in session.exec(select(Game)).all():
            session.delete(eg)
        session.commit()
        print("[SYNC] Global purge complete. re-scraping real sources...")

        total_scraped = 0
        for platform, sess in connected_platforms:
            if platform == "steam":
                steam_id = sess.get("user_id")
                if steam_id:
                    print(f"[SCRAPER] Target Lock: {steam_id}")
                    try:
                        scr = requests.Session()
                        scr.headers.update({
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept-Language': 'en-US,en;q=0.9',
                            'Referer': f'https://steamcommunity.com/profiles/{steam_id}/',
                            'X-Requested-With': 'XMLHttpRequest'
                        })

                        # LAYER 1: AJAX JSON (The most complete source)
                        # This is what the browser actually uses to load the list
                        ajax_url = f"https://steamcommunity.com/profiles/{steam_id}/games/?tab=all&js=1"
                        res = scr.get(ajax_url, timeout=15)
                        match = re.search(r'var rgGames = (\[.*?\]);', res.text)
                        
                        if match:
                            steam_games = json.loads(match.group(1))
                            print(f"[SCRAPER] AJAX Success! Identified {len(steam_games)} games.")
                            for sg in steam_games:
                                aid, name = str(sg.get('appid')), sg.get('name')
                                if not session.exec(select(Game).where(Game.platform_game_id == aid)).first():
                                    desc, year, genre = fetch_steam_metadata(aid)
                                    session.add(Game(platform_game_id=aid, name=name, platform="steam", image_url=f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{aid}/library_600x900.jpg", description=desc, year=year, genre=genre))
                                    total_scraped += 1
                        
                        # LAYER 2: BADGES (Fallback for missing games)
                        badge_res = scr.get(f"https://steamcommunity.com/profiles/{steam_id}/badges/", timeout=10)
                        badges = re.findall(r'/badges/(\d+)">.*?class="badge_title">([^<]+)<', badge_res.text, re.DOTALL)
                        for aid, title in badges:
                            t = title.strip().replace('&nbsp;', '')
                            if any(x in t for x in ["Badge", "Level", "Sale", "Awards", "Year", "Steam Replay"]): continue
                            if not session.exec(select(Game).where(Game.platform_game_id == aid)).first():
                                desc, year, genre = fetch_steam_metadata(aid)
                                session.add(Game(platform_game_id=aid, name=t, platform="steam", image_url=f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{aid}/library_600x900.jpg", description=desc, year=year, genre=genre))
                                total_scraped += 1

                        session.commit()
                    except Exception as e: print(f"[SCRAPER] Steam Fatal: {e}")

    return {"message": f"Sync complete. Ingested {total_scraped} real units.", "scraped": total_scraped}

@app.get("/health")
async def health():
    return {"status": "healthy"}
