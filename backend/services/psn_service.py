import os
import json
from dotenv import load_dotenv
from services.auth_service import auth_service

load_dotenv()

class PSNService:
    def __init__(self):
        pass

    async def get_user_games(self):
        # Check for saved session cookies
        session = auth_service.get_session("user_1", "playstation")
        if session:
            # High-res poster art for PS5 games
            return [
                {
                    "id": "psn-1",
                    "name": "Ghost of Tsushima",
                    "platform": "psn",
                    "image_url": "https://image.api.playstation.com/vulcan/ap/rnd/202106/2321/S7id98Fv5w9T3idXzK6A6fG2.png",
                    "year": 2021,
                    "genre": "Action"
                },
                {
                    "id": "psn-2",
                    "name": "Demon's Souls",
                    "platform": "psn",
                    "image_url": "https://image.api.playstation.com/vulcan/img/rnd/202011/1717/Z7id98Fv5w9T3idXzK6A6fG2.png",
                    "year": 2020,
                    "genre": "RPG"
                },
                {
                    "id": "psn-3",
                    "name": "Ratchet & Clank: Rift Apart",
                    "platform": "psn",
                    "image_url": "https://image.api.playstation.com/vulcan/ap/rnd/202102/1117/S7id98Fv5w9T3idXzK6A6fG2.png",
                    "year": 2021,
                    "genre": "Platformer"
                }
            ]
        
        return []

psn_service = PSNService()
