import httpx
import logging

logger = logging.getLogger(__name__)

class GOGService:
    def __init__(self):
        # GOG Galaxy 2.0 OAuth credentials (publicly available in open source clients)
        self.client_id = "46899977096215655"
        self.client_secret = "9d85c43b1482497dbbce61f6e4aa173a433796eeae2ca8c5f6129f2dc4de46d9"

    async def exchange_code(self, code: str):
        url = "https://auth.gog.com/token"
        params = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": "https://embed.gog.com/on_login_success?origin=client"
        }
        
        async with httpx.AsyncClient() as client:
            try:
                # GOG auth token supports GET for code exchange
                res = await client.get(url, params=params, timeout=10)
                if res.status_code == 200:
                    return res.json()
                else:
                    logger.error(f"[GOG_AUTH] Exchange GET failed: {res.status_code} - {res.text}")
                    # Try POST just in case
                    res_post = await client.post(url, data=params, timeout=10)
                    if res_post.status_code == 200:
                        return res_post.json()
                    logger.error(f"[GOG_AUTH] Exchange POST failed: {res_post.status_code} - {res_post.text}")
                    return None
            except Exception as e:
                logger.error(f"[GOG_AUTH] Exception during exchange: {e}")
                return None

    async def refresh_tokens(self, refresh_token: str):
        url = "https://auth.gog.com/token"
        params = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "refresh_token",
            "refresh_token": refresh_token
        }
        async with httpx.AsyncClient() as client:
            try:
                res = await client.get(url, params=params, timeout=10)
                if res.status_code == 200:
                    return res.json()
                # Try POST just in case GOG prefers POST for refresh
                res_post = await client.post(url, data=params, timeout=10)
                if res_post.status_code == 200:
                    return res_post.json()
                logger.error(f"[GOG_AUTH] Refresh failed: {res_post.status_code} - {res_post.text}")
                return None
            except Exception as e:
                logger.error(f"[GOG_AUTH] Exception during refresh: {e}")
                return None

    async def get_user_games(self, access_token: str = None):
        if not access_token:
            logger.warning("[GOG_API] Missing GOG access token.")
            return []
            
        base_url = "https://embed.gog.com/account/getFilteredProducts"
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        
        games = []
        current_page = 1
        total_pages = 1
        
        async with httpx.AsyncClient() as client:
            while current_page <= total_pages:
                try:
                    params = {
                        "mediaType": 1,
                        "page": current_page
                    }
                    res = await client.get(base_url, headers=headers, params=params, timeout=15)
                    if res.status_code != 200:
                        logger.error(f"[GOG_API] Failed to fetch GOG library page {current_page}: {res.status_code} - {res.text}")
                        break
                    
                    data = res.json()
                    products = data.get("products", [])
                    total_pages = data.get("totalPages", 1)
                    
                    for prod in products:
                        prod_id = str(prod.get("id"))
                        title = prod.get("title")
                        category = prod.get("category", "Action")
                        
                        image = prod.get("image", "")
                        if image and image.startswith("//"):
                            image_url = "https:" + image
                        elif image and image.startswith("/"):
                            image_url = "https://images-1.gog-statics.com" + image
                        elif image:
                            image_url = image
                        else:
                            image_url = None
                            
                        games.append({
                            "id": prod_id,
                            "name": title,
                            "platform": "GOG",
                            "image_url": image_url,
                            "year": 2023,
                            "genre": category
                        })
                    
                    current_page += 1
                except Exception as e:
                    logger.error(f"[GOG_API] Exception during GOG library fetch at page {current_page}: {e}")
                    break
                    
        return games

gog_service = GOGService()
