from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
import requests
import re
import json
import xml.etree.ElementTree as ET
from typing import List, Dict, Optional
from pydantic import BaseModel

from services.auth_service import auth_service, SessionData
from services.steam_service import steam_service
from services.epic_service import epic_service
from services.gog_service import gog_service
from database import create_db_and_tables, engine, Game

app = FastAPI(title="SyncStore API")

class SyncRequest(BaseModel):
    steam_api_key: Optional[str] = None

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://syncstore-frontend.onrender.com", "http://localhost:3000"],
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

def parse_playtime_hours(val) -> int:
    if not val:
        return 0
    try:
        if isinstance(val, str):
            val = val.replace(',', '')
        return int(float(val))
    except:
        return 0

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
        
    elif data.platform == "epic":
        if data.auth_code:
            code_to_use = data.auth_code
            if len(code_to_use) == 32:
                print(f"[AUTH] Epic SID detected. Exchanging for authorization code...")
                try:
                    res = requests.get(
                        "https://www.epicgames.com/id/api/redirect?clientId=34a02cf8f4414e29b15921876da36f9a&responseType=code",
                        cookies={"sid": code_to_use},
                        timeout=10
                    )
                    if res.status_code == 200:
                        sid_json = res.json()
                        if sid_json.get("authorizationCode"):
                            code_to_use = sid_json["authorizationCode"]
                            print("[AUTH] Epic SID exchange successful!")
                        else:
                            print(f"[AUTH] Epic SID exchange returned no code: {res.text}")
                    else:
                        print(f"[AUTH] Epic SID exchange failed with status {res.status_code}: {res.text}")
                except Exception as e:
                    print(f"[AUTH] Epic SID exchange exception: {e}")
                    
            tokens = await epic_service.exchange_code(code_to_use)
            if tokens:
                data.access_token = tokens.get("access_token")
                data.user_id = tokens.get("account_id")
                data.refresh_token = tokens.get("refresh_token")
                captured_username = tokens.get("displayName") or "Epic_Gamer"
            else:
                return {"error": "Failed to exchange Epic authorization credentials"}
                
    elif data.platform == "gog":
        if data.auth_code:
            tokens = await gog_service.exchange_code(data.auth_code)
            if tokens:
                data.access_token = tokens.get("access_token")
                data.user_id = tokens.get("user_id")
                data.refresh_token = tokens.get("refresh_token")
                try:
                    res = requests.get(f"https://api.gog.com/users/info/{data.user_id}", headers={"Authorization": f"Bearer {data.access_token}"}, timeout=5)
                    if res.status_code == 200:
                        captured_username = res.json().get("username", "GOG_Gamer")
                except:
                    captured_username = "GOG_Gamer"
            else:
                return {"error": "Failed to exchange GOG authorization code"}
                
    auth_service.save_session(
        user_id=user_id,
        platform=data.platform,
        cookies=data.cookies,
        username=captured_username,
        platform_user_id=data.user_id,
        access_token=data.access_token,
        refresh_token=data.refresh_token,
        steam_api_key=data.steam_api_key
    )
    print(f"[AUTH] Uplink stable for {data.platform}. User: {captured_username}")
    return {"message": f"Linked {data.platform} to node.", "username": captured_username}

@app.post("/sync/all")
async def trigger_sync(request_data: Optional[SyncRequest] = None):
    """Ultra-resilient synchronization engine for real gaming libraries."""
    connected_platforms = []
    # Check for connected sessions
    for p in ["steam", "epic", "epic games", "gog", "playstation", "xbox"]:
        sess = auth_service.get_session("user_1", p)
        if sess: 
            connected_platforms.append((p, sess))
    
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
                steam_api_key = (request_data.steam_api_key if request_data else None) or sess.get("steam_api_key")
                
                # SELF-HEALING: Parse actual Steam ID from cookies if they exist to match the cookie owner
                cookies = sess.get("cookies")
                cookie_steam_id = None
                if cookies:
                    if "steamID" in cookies:
                        cookie_steam_id = cookies["steamID"]
                    elif "steamLoginSecure" in cookies:
                        from urllib.parse import unquote
                        val = unquote(cookies["steamLoginSecure"])
                        if "||" in val:
                            cookie_steam_id = val.split("||")[0]
                
                if cookie_steam_id and cookie_steam_id.startswith("7656119") and len(cookie_steam_id) == 17:
                    if steam_id != cookie_steam_id:
                        print(f"[SYNC] Self-healing Steam ID: {steam_id} -> {cookie_steam_id}")
                        steam_id = cookie_steam_id
                        sess["user_id"] = steam_id
                        auth_service.save_session(
                            user_id="user_1",
                            platform="steam",
                            cookies=cookies,
                            username=sess.get("username", "Verified_Member"),
                            platform_user_id=steam_id,
                            steam_api_key=steam_api_key
                        )
                
                if steam_id:
                    print(f"[SYNC] Target Profile: {steam_id}")
                    
                    # LAYER 0: OFFICIAL WEB API (Primary)
                    print(f"[SYNC] Layer 0: Attempting Web API Sync...")
                    api_games = await steam_service.get_user_games(steam_id, steam_api_key)
                    if isinstance(api_games, list) and len(api_games) > 0 and "error" not in api_games[0]:
                        print(f"[SYNC] API SUCCESS: Found {len(api_games)} games.")
                        for idx, ag in enumerate(api_games, 1):
                            aid, name = str(ag['id']), ag['name']
                            existing = session.exec(select(Game).where(Game.platform_game_id == aid, Game.platform == "steam")).first()
                            if not existing:
                                d, y, g = fetch_steam_metadata(aid)
                                session.add(Game(
                                    platform_game_id=aid, 
                                    name=name, 
                                    platform="steam", 
                                    image_url=ag.get("image_url") or f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{aid}/library_600x900.jpg", 
                                    description=d, 
                                    year=y, 
                                    genre=g,
                                    playtime_hours=int(ag.get("playtime_forever", 0) / 60)
                                ))
                                total_scraped += 1
                            print(f"[SYNC] [Steam] Processing game {idx}/{len(api_games)}: {name}")
                        session.commit()
                        continue # If API works, skip scraping

                    try:
                        scr = requests.Session()
                        scr.headers.update({
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept-Language': 'en-US,en;q=0.9',
                            'Referer': 'https://steamcommunity.com/'
                        })

                        # Inject captured cookies from the user session to authenticate and view private profile lists
                        cookies = sess.get("cookies")
                        if cookies:
                            print(f"[SCRAPER] Authenticating requests with session cookies: {list(cookies.keys())}")
                            for name, val in cookies.items():
                                scr.cookies.set(name, val, domain='steamcommunity.com')
                                scr.cookies.set(name, val, domain='.steamcommunity.com')

                        # LAYER 1: THE MASTER LIST (Scraping the games tab directly)
                        print(f"[SCRAPER] Layer 1: Attempting Master List Scrape...")
                        games_url = f"https://steamcommunity.com/profiles/{steam_id}/games/?tab=all"
                        res = scr.get(games_url, timeout=15)
                        
                        if "login" not in res.url:
                            # Attempt modern JWT Web API session scrape first (post Steam UI redesign)
                            jwt_token = None
                            match = re.search(r'window\.SSR\.loaderData\s*=\s*(\[.*?\]);', res.text)
                            if match:
                                try:
                                    loader_data = json.loads(match.group(1))
                                    for item in loader_data:
                                        if isinstance(item, str):
                                            inner = json.loads(item)
                                            if "strWebAPIToken" in inner:
                                                jwt_token = inner["strWebAPIToken"]
                                                break
                                except Exception as e:
                                    print(f"[SCRAPER] Failed to parse window.SSR.loaderData JWT: {e}")

                            if jwt_token:
                                print(f"[SCRAPER] Extracted WebAPI JWT token. Calling GetOwnedGames...")
                                api_url = "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/"
                                params = {
                                    "access_token": jwt_token,
                                    "steamid": steam_id,
                                    "include_appinfo": "true",
                                    "include_played_free_games": "true"
                                }
                                api_res = requests.get(api_url, params=params, timeout=15)
                                if api_res.status_code == 200:
                                    api_data = api_res.json()
                                    steam_games = api_data.get("response", {}).get("games", [])
                                    print(f"[SCRAPER] SUCCESS: Found {len(steam_games)} games via JWT Web API.")
                                    for idx, sg in enumerate(steam_games, 1):
                                        aid, name = str(sg.get('appid')), sg.get('name')
                                        existing = session.exec(select(Game).where(Game.platform_game_id == aid, Game.platform == "steam")).first()
                                        if not existing:
                                            d, y, g = fetch_steam_metadata(aid)
                                            session.add(Game(
                                                platform_game_id=aid, 
                                                name=name, 
                                                platform="steam", 
                                                image_url=f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{aid}/library_600x900.jpg", 
                                                description=d, 
                                                year=y, 
                                                genre=g,
                                                playtime_hours=int(sg.get("playtime_forever", 0) / 60)
                                            ))
                                            total_scraped += 1
                                        print(f"[SYNC] [Steam] Processing game {idx}/{len(steam_games)}: {name}")
                                    session.commit()
                                    continue

                            # Fallback if JWT parsing fails but we are on the page (though we shouldn't hit this)
                            match_rg = re.search(r'var rgGames = (\[.*?\]);', res.text)
                            if match_rg:
                                steam_games = json.loads(match_rg.group(1))
                                print(f"[SCRAPER] SUCCESS: Found {len(steam_games)} games in legacy rgGames.")
                                for sg in steam_games:
                                    aid, name = str(sg.get('appid')), sg.get('name')
                                    existing = session.exec(select(Game).where(Game.platform_game_id == aid, Game.platform == "steam")).first()
                                    if not existing:
                                        d, y, g = fetch_steam_metadata(aid)
                                        session.add(Game(
                                            platform_game_id=aid, 
                                            name=name, 
                                            platform="steam", 
                                            image_url=f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{aid}/library_600x900.jpg", 
                                            description=d, 
                                            year=y, 
                                            genre=g,
                                            playtime_hours=parse_playtime_hours(sg.get("hours_forever"))
                                        ))
                                        total_scraped += 1
                                session.commit()
                                continue
                        else:
                            print("[SCRAPER] Cookies expired or invalid (redirected to login). Clearing cookies for public fallback...")
                            scr.cookies.clear()

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
                                playtime_val = g.find('hoursOnRecord')
                                playtime = parse_playtime_hours(playtime_val.text if playtime_val is not None else None)
                                existing = session.exec(select(Game).where(Game.platform_game_id == aid, Game.platform == "steam")).first()
                                if not existing:
                                    d, y, g_meta = fetch_steam_metadata(aid)
                                    session.add(Game(
                                        platform_game_id=aid, 
                                        name=name, 
                                        platform="steam", 
                                        image_url=f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{aid}/library_600x900.jpg", 
                                        description=d, 
                                        year=y, 
                                        genre=g_meta,
                                        playtime_hours=playtime
                                    ))
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
                                session.add(Game(
                                    platform_game_id=aid, 
                                    name=name.strip(), 
                                    platform="steam", 
                                    image_url=f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{aid}/library_600x900.jpg", 
                                    description=d, 
                                    year=y, 
                                    genre=g
                                ))
                                total_scraped += 1
                        session.commit()

                        # LAYER 3: BADGES (Final pass for owned games with cards)
                        print(f"[SCRAPER] Layer 3: Scanning Badge Repository...")
                        badge_res = scr.get(f"https://steamcommunity.com/profiles/{steam_id}/badges/", timeout=10)
                        badges = re.findall(r'/badges/(\d+)">.*?class="badge_title">([^<]+)<', badge_res.text, re.DOTALL)
                        for aid, title in badges:
                            t = title.strip().replace('&nbsp;', '')
                            if any(x in t for x in ["Badge", "Level", "Sale", "Awards", "Year", "Steam Replay", "Community", "Corgi", "Pillar", "Agent", "Nomination"]): continue
                            existing = session.exec(select(Game).where(Game.platform_game_id == aid, Game.platform == "steam")).first()
                            if not existing:
                                d, y, g = fetch_steam_metadata(aid)
                                session.add(Game(
                                    platform_game_id=aid, 
                                    name=t, 
                                    platform="steam", 
                                    image_url=f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{aid}/library_600x900.jpg", 
                                    description=d, 
                                    year=y, 
                                    genre=g
                                ))
                                total_scraped += 1
                        session.commit()

                    except Exception as e:
                        print(f"[SCRAPER] Fatal error for {steam_id}: {e}")

            elif platform in ("epic", "epic games"):
                print(f"[SYNC] Epic Games sync initialized for account: {sess.get('user_id')}")
                access_token = sess.get("access_token")
                refresh_token = sess.get("refresh_token")
                
                # Attempt to retrieve games using the existing access token
                epic_games = await epic_service.get_user_games(
                    access_token=access_token,
                    account_id=sess.get("user_id")
                )
                
                # Auto-refresh and retry if the token has expired
                if not epic_games and refresh_token:
                    print("[SYNC] Epic Games token expired or empty. Attempting token refresh...")
                    tokens = await epic_service.refresh_tokens(refresh_token)
                    if tokens and "access_token" in tokens:
                        access_token = tokens["access_token"]
                        refresh_token = tokens.get("refresh_token") or refresh_token
                        print("[SYNC] Epic Games token refresh successful. Updating session on disk...")
                        auth_service.save_session(
                            user_id="user_1",
                            platform="epic",
                            cookies=None,
                            username=sess.get("username", "Epic_Gamer"),
                            platform_user_id=sess.get("user_id"),
                            access_token=access_token,
                            refresh_token=refresh_token
                        )
                        epic_games = await epic_service.get_user_games(
                            access_token=access_token,
                            account_id=sess.get("user_id")
                        )
                
                print(f"[SYNC] Epic Games found: {len(epic_games)}")
                for idx, eg in enumerate(epic_games, 1):
                    eid = eg["id"]
                    existing = session.exec(select(Game).where(Game.platform_game_id == eid, Game.platform == "epic")).first()
                    if not existing:
                        session.add(Game(
                            platform_game_id=eid,
                            name=eg["name"],
                            platform="epic",
                            image_url=eg.get("image_url"),
                            year=eg.get("year", 2023),
                            genre=eg.get("genre", "Epic Game"),
                            user_id="user_1"
                        ))
                        total_scraped += 1
                    print(f"[SYNC] [Epic] Processing game {idx}/{len(epic_games)}: {eg['name']}")
                session.commit()
                
            elif platform == "gog":
                print(f"[SYNC] GOG sync initialized for account: {sess.get('user_id')}")
                access_token = sess.get("access_token")
                refresh_token = sess.get("refresh_token")
                
                # Attempt to retrieve games using the existing access token
                gog_games = await gog_service.get_user_games(
                    access_token=access_token
                )
                
                # Auto-refresh and retry if the token has expired
                if not gog_games and refresh_token:
                    print("[SYNC] GOG token expired or empty. Attempting token refresh...")
                    tokens = await gog_service.refresh_tokens(refresh_token)
                    if tokens and "access_token" in tokens:
                        access_token = tokens["access_token"]
                        refresh_token = tokens.get("refresh_token") or refresh_token
                        print("[SYNC] GOG token refresh successful. Updating session on disk...")
                        auth_service.save_session(
                            user_id="user_1",
                            platform="gog",
                            cookies=None,
                            username=sess.get("username", "GOG_Gamer"),
                            platform_user_id=sess.get("user_id"),
                            access_token=access_token,
                            refresh_token=refresh_token
                        )
                        gog_games = await gog_service.get_user_games(
                            access_token=access_token
                        )
                        
                print(f"[SYNC] GOG games found: {len(gog_games)}")
                for idx, gg in enumerate(gog_games, 1):
                    gid = gg["id"]
                    existing = session.exec(select(Game).where(Game.platform_game_id == gid, Game.platform == "gog")).first()
                    if not existing:
                        session.add(Game(
                            platform_game_id=gid,
                            name=gg["name"],
                            platform="gog",
                            image_url=gg.get("image_url"),
                            year=gg.get("year", 2023),
                            genre=gg.get("genre", "GOG Game"),
                            user_id="user_1"
                        ))
                        total_scraped += 1
                    print(f"[SYNC] [GOG] Processing game {idx}/{len(gog_games)}: {gg['name']}")
                session.commit()

        steam_count = len(session.exec(select(Game).where(Game.platform == "steam")).all())
        epic_count = len(session.exec(select(Game).where(Game.platform == "epic")).all())
        gog_count = len(session.exec(select(Game).where(Game.platform == "gog")).all())
        real_count = len(session.exec(select(Game)).all())
        print(f"[SYNC] Complete. Total verified units: {real_count} (Steam: {steam_count}, Epic: {epic_count}, GOG: {gog_count})")

    return {
        "message": f"Sync complete. {real_count} real units active.", 
        "scraped": real_count,
        "counts": {
            "steam": steam_count,
            "epic": epic_count,
            "gog": gog_count
        }
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)

