from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
import requests
import re
import json
import xml.etree.ElementTree as ET
from typing import List, Dict, Optional

from services.auth_service import auth_service, SessionData
from services.steam_service import steam_service
from database import create_db_and_tables, engine, Game

app = FastAPI(title="SyncStore API")

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://syncstore-frontend.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def fetch_steam_metadata(appid: str):
    """Fetches real metadata from the Steam Store API."""
    try:
        url = f"https://store.steampowered.com/api/appdetails?appids={appid}"
        res = requests.get(url, timeout=5)
        data = res.json()
        if data and data.get(appid, {}).get('success'):
            g_data = data[appid]['data']
            desc = g_data.get('short_description', "No data indexed.")
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
    """Ultra-resilient synchronization engine for real Steam libraries."""
    connected_platforms = []
    for p in ["steam", "epic games", "playstation", "xbox"]:
        sess = auth_service.get_session("user_1", p)
        if sess: connected_platforms.append((p, sess))
    
    if not connected_platforms:
        return {"message": "Access Denied: No nodes authenticated.", "scraped": 0}

    with Session(engine) as session:
        # 1. PURGE ALL (Dump Cache)
        for eg in session.exec(select(Game)).all():
            session.delete(eg)
        session.commit()
        print("[SYNC] Global Cache Purged. Starting Deep-Scrape sequence...")

        total_scraped = 0
        for platform, sess in connected_platforms:
            if platform == "steam":
                steam_id = sess.get("user_id")
                if steam_id:
                    print(f"[SYNC] Target Profile: {steam_id}")
                    
                    # LAYER 0: OFFICIAL WEB API (Primary)
                    print(f"[SYNC] Layer 0: Attempting Web API Sync...")
                    api_games = await steam_service.get_user_games(steam_id)
                    if isinstance(api_games, list) and len(api_games) > 0 and "error" not in api_games[0]:
                        print(f"[SYNC] API SUCCESS: Found {len(api_games)} games.")
                        for ag in api_games:
                            aid, name = str(ag['id']), ag['name']
                            existing = session.exec(select(Game).where(Game.platform_game_id == aid, Game.platform == "steam")).first()
                            if not existing:
                                d, y, g = fetch_steam_metadata(aid)
                                session.add(Game(platform_game_id=aid, name=name, platform="steam", image_url=f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{aid}/library_600x900.jpg", description=d, year=y, genre=g))
                                total_scraped += 1
                        session.commit()
                        continue # If API works, skip scraping

                    try:
                        scr = requests.Session()
                        # Use high-fidelity browser headers
                        scr.headers.update({
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept-Language': 'en-US,en;q=0.9',
                            'Referer': 'https://steamcommunity.com/'
                        })

                        # LAYER 1: THE MASTER LIST (Scraping the games tab directly)
                        print(f"[SCRAPER] Layer 1: Attempting Master List Scrape...")
                        games_url = f"https://steamcommunity.com/profiles/{steam_id}/games/?tab=all"
                        res = scr.get(games_url, timeout=15)
                        
                        if "login" not in res.url:
                            match = re.search(r'var rgGames = (\[.*?\]);', res.text)
                            if match:
                                steam_games = json.loads(match.group(1))
                                print(f"[SCRAPER] SUCCESS: Found {len(steam_games)} games in Master List.")
                                for sg in steam_games:
                                    aid, name = str(sg.get('appid')), sg.get('name')
                                    existing = session.exec(select(Game).where(Game.platform_game_id == aid, Game.platform == "steam")).first()
                                    if not existing:
                                        d, y, g = fetch_steam_metadata(aid)
                                        session.add(Game(platform_game_id=aid, name=name, platform="steam", image_url=f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{aid}/library_600x900.jpg", description=d, year=y, genre=g))
                                        total_scraped += 1
                                session.commit()
                                continue # Successfully got the full library, skip fallbacks

                        # LAYER 1.5: XML LIST (Permissive fallback for public profiles)
                        print(f"[SCRAPER] Layer 1.5: Attempting XML Repository Scrape...")
                        xml_url = f"https://steamcommunity.com/profiles/{steam_id}/games/?xml=1"
                        xml_res = scr.get(xml_url, timeout=10)
                        if "<gamesList>" in xml_res.text:
                            root = ET.fromstring(xml_res.content)
                            xml_games = root.findall('.//game')
                            print(f"[SCRAPER] SUCCESS: Found {len(xml_games)} games in XML List.")
                            for g in xml_games:
                                aid = g.find('appID').text
                                name = g.find('name').text
                                existing = session.exec(select(Game).where(Game.platform_game_id == aid, Game.platform == "steam")).first()
                                if not existing:
                                    d, y, g_meta = fetch_steam_metadata(aid)
                                    session.add(Game(platform_game_id=aid, name=name, platform="steam", image_url=f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{aid}/library_600x900.jpg", description=d, year=y, genre=g_meta))
                                    total_scraped += 1
                            session.commit()
                            continue

                        # LAYER 2: RECENT ACTIVITY FALLBACK
                        print(f"[SCRAPER] Layer 2: Falling back to Recent Activity...")
                        prof_res = scr.get(f"https://steamcommunity.com/profiles/{steam_id}/", timeout=10)
                        recent = re.findall(r'https://steamcommunity.com/app/(\d+)">([^<]+)</a>', prof_res.text)
                        for aid, name in recent:
                            existing = session.exec(select(Game).where(Game.platform_game_id == aid, Game.platform == "steam")).first()
                            if not existing:
                                d, y, g = fetch_steam_metadata(aid)
                                session.add(Game(platform_game_id=aid, name=name.strip(), platform="steam", image_url=f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{aid}/library_600x900.jpg", description=d, year=y, genre=g))
                                total_scraped += 1
                        session.commit()

                        # LAYER 3: BADGES (Final pass for owned games with cards)
                        print(f"[SCRAPER] Layer 3: Scanning Badge Repository...")
                        badge_res = scr.get(f"https://steamcommunity.com/profiles/{steam_id}/badges/", timeout=10)
                        badges = re.findall(r'/badges/(\d+)">.*?class="badge_title">([^<]+)<', badge_res.text, re.DOTALL)
                        for aid, title in badges:
                            t = title.strip().replace('&nbsp;', '')
                            # STRICT FILTER: Ignore non-game badges
                            if any(x in t for x in ["Badge", "Level", "Sale", "Awards", "Year", "Steam Replay", "Community", "Corgi", "Pillar", "Agent", "Nomination"]): continue
                            existing = session.exec(select(Game).where(Game.platform_game_id == aid, Game.platform == "steam")).first()
                            if not existing:
                                d, y, g = fetch_steam_metadata(aid)
                                session.add(Game(platform_game_id=aid, name=t, platform="steam", image_url=f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{aid}/library_600x900.jpg", description=d, year=y, genre=g))
                                total_scraped += 1
                        session.commit()

                    except Exception as e:
                        print(f"[SCRAPER] Fatal error for {steam_id}: {e}")

        # Ensure no mock data fallbacks are used. Empty library is better than fake data.
        real_count = len(session.exec(select(Game).where(Game.platform == "steam")).all())
        print(f"[SYNC] Complete. Total verified units: {real_count}")

    return {"message": f"Sync complete. {real_count} real units active.", "scraped": real_count}

@app.get("/health")
async def health():
    return {"status": "healthy"}
