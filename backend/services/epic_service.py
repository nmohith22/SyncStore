import httpx
import logging

logger = logging.getLogger(__name__)

class EpicService:
    def __init__(self):
        # Official Epic Games Launcher OAuth Client details
        self.client_id = "34a02cf8f4414e29b15921876da36f9a"
        self.client_secret = "daafbccc737745039dffe53d94fc76cf"

    async def exchange_code(self, code: str):
        url = "https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token"
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            # Basic Auth header for the client credentials
            # base64(34a02cf8f4414e29b15921876da36f9a:daafbccc737745039dffe53d94fc76cf)
            "Authorization": "Basic MzRhMDJjZjhmNDQxNGUyOWIxNTkyMTg3NmRhMzZmOWE6ZGFhZmJjY2M3Mzc3NDUwMzlkZmZlNTNkOTRmYzc2Y2Y="
        }
        
        data = {
            "grant_type": "authorization_code",
            "code": code
        }
        
        async with httpx.AsyncClient() as client:
            try:
                res = await client.post(url, data=data, headers=headers, timeout=10)
                if res.status_code == 200:
                    return res.json()
                else:
                    logger.error(f"[EPIC_AUTH] Exchange failed with status {res.status_code}: {res.text}")
                    return None
            except Exception as e:
                logger.error(f"[EPIC_AUTH] Exception during token exchange: {e}")
                return None

    async def refresh_tokens(self, refresh_token: str):
        url = "https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token"
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": "Basic MzRhMDJjZjhmNDQxNGUyOWIxNTkyMTg3NmRhMzZmOWE6ZGFhZmJjY2M3Mzc3NDUwMzlkZmZlNTNkOTRmYzc2Y2Y="
        }
        data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token
        }
        async with httpx.AsyncClient() as client:
            try:
                res = await client.post(url, data=data, headers=headers, timeout=10)
                if res.status_code == 200:
                    return res.json()
                else:
                    logger.error(f"[EPIC_AUTH] Refresh failed with status {res.status_code}: {res.text}")
                    return None
            except Exception as e:
                logger.error(f"[EPIC_AUTH] Exception during refresh: {e}")
                return None

    async def get_user_games(self, access_token: str = None, account_id: str = None):
        if not access_token or not account_id:
            logger.warning("[EPIC_API] Missing access token or account ID.")
            return []
            
        base_url = "https://library-service.live.use1a.on.epicgames.com/library/api/public/items"
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        
        games = []
        cursor = None
        
        async with httpx.AsyncClient() as client:
            while True:
                try:
                    params = {
                        "includeAppStates": "true"
                    }
                    if cursor:
                        params["cursor"] = cursor
                        
                    res = await client.get(base_url, headers=headers, params=params, timeout=15)
                    if res.status_code != 200:
                        logger.error(f"[EPIC_API] Failed to fetch library page (cursor={cursor}): {res.status_code} - {res.text}")
                        break
                    
                    data = res.json()
                    records = data.get("records", [])
                    
                    for rec in records:
                        app_name = rec.get("appName")
                        catalog_item_id = rec.get("catalogItemId")
                        catalog_namespace = rec.get("namespace")
                        title = rec.get("sandboxName") or rec.get("title") or app_name
                        
                        image_url = f"https://cdn1.epicgames.com/item/{catalog_namespace}/{catalog_item_id}_tall.jpg"
                        
                        games.append({
                            "id": catalog_item_id or app_name,
                            "name": title,
                            "platform": "Epic",
                            "image_url": image_url,
                            "year": 2023,
                            "genre": "Epic Game"
                        })
                    
                    meta = data.get("responseMetadata", {})
                    cursor = meta.get("nextCursor")
                    if not cursor:
                        break
                except Exception as e:
                    logger.error(f"[EPIC_API] Exception during games fetch (cursor={cursor}): {e}")
                    break
                    
        return games

epic_service = EpicService()
