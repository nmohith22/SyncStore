import os
from steam.webapi import WebAPI
from dotenv import load_dotenv

load_dotenv()

class SteamService:
    def __init__(self):
        self.api_key = os.getenv("STEAM_API_KEY")

    async def get_user_games(self, steam_id: str = None, api_key: str = None):
        key_to_use = api_key or self.api_key
        if not key_to_use:
            return {"error": "Steam API key not configured"}
        
        if not steam_id:
            return {"error": "steam_id required"}
            
        try:
            # Create WebAPI dynamically with the provided or environment API key
            api = WebAPI(key=key_to_use)
            response = api.call('IPlayerService.GetOwnedGames', 
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
                    "image_url": f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{game['appid']}/library_600x900.jpg"
                }
                for game in games
            ]
        except Exception as e:
            print(f"[STEAM_API] Error: {e}")
            return {"error": str(e)}

steam_service = SteamService()
