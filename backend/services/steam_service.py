import os
from steam.webapi import WebAPI
from dotenv import load_dotenv
from services.auth_service import auth_service

load_dotenv()

class SteamService:
    def __init__(self):
        self.api_key = os.getenv("STEAM_API_KEY")
        if self.api_key:
            self.api = WebAPI(key=self.api_key)
        else:
            self.api = None

    async def get_user_games(self, steam_id: str = None):
        # Check for saved session cookies first
        session = auth_service.get_session("user_1", "steam")
        if session:
            return [
                {
                    "id": "steam-scraped-1",
                    "name": "Scraped Game via Cookie",
                    "platform": "Steam",
                    "playtime_forever": 120,
                    "image_url": None
                }
            ]

        if not self.api:
            return {"error": "Steam API key not configured and no session found"}
        
        if not steam_id:
            return {"error": "steam_id required if no session exists"}
            
        try:
            response = self.api.call('IPlayerService.GetOwnedGames', 
                                     steamid=steam_id, 
                                     include_appinfo=True, 
                                     include_played_free_games=True)
            
            games = response.get('response', {}).get('games', [])
            return [
                {
                    "id": str(game['appid']),
                    "name": game['name'],
                    "platform": "Steam",
                    "playtime_forever": game.get('playtime_forever', 0),
                    "image_url": f"https://media.steampowered.com/steamcommunity/public/images/apps/{game['appid']}/{game['img_icon_url']}.jpg" if game.get('img_icon_url') else None
                }
                for game in games
            ]
        except Exception as e:
            return {"error": str(e)}

steam_service = SteamService()
