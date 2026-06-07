import httpx
import logging

logger = logging.getLogger(__name__)

class GOGService:
    def __init__(self):
        # GOG Galaxy 2.0 OAuth credentials (publicly available in open source clients)
        self.client_id = "46899977096215643"
        self.client_secret = "4e87b9cc0f03126f5348882fa4f40f09b5de5884fbfdcf7769cf36113b2e5399"

    async def exchange_code(self, code: str):
        url = "https://auth.gog.com/token"
        params = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": "https://embed.gog.com/on_login_callback?gog_id=1"
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

    async def get_user_games(self, access_token: str = None):
        if not access_token:
            logger.warning("[GOG_API] Missing GOG access token.")
            return []
            
        url = "https://embed.gog.com/account/getFilteredProducts"
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        
        async with httpx.AsyncClient() as client:
            try:
                res = await client.get(url, headers=headers, timeout=15)
                if res.status_code != 200:
                    logger.error(f"[GOG_API] Failed to fetch GOG library: {res.status_code} - {res.text}")
                    return []
                
                data = res.json()
                products = data.get("products", [])
                
                games = []
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
                return games
            except Exception as e:
                logger.error(f"[GOG_API] Exception during GOG library fetch: {e}")
                return []

gog_service = GOGService()
