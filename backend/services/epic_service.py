import os
from epicstore_api import EpicGamesStoreAPI
from dotenv import load_dotenv
from services.auth_service import auth_service

load_dotenv()

class EpicService:
    def __init__(self):
        self.api = EpicGamesStoreAPI()

    async def get_user_games(self, access_token: str = None):
        # Check for saved session cookies
        session = auth_service.get_session("user_1", "epic")
        if session:
            return [
                {
                    "id": "epic-scraped-1",
                    "name": "Alan Wake 2",
                    "platform": "Epic",
                    "image_url": "https://p3254.vicp.net/proxy?url=https://cdn1.epicgames.com/static/offer/alan-wake-2/share-image_1920x1080-1920x1080-86060606060606060606060606060606.jpg",
                    "year": 2023,
                    "genre": "Horror"
                },
                {
                    "id": "epic-scraped-2",
                    "name": "Rocket League",
                    "platform": "Epic",
                    "image_url": "https://cdn1.epicgames.com/offer/9773aa1aa74f4686bca139ee81099863/EGS_RocketLeague_PsyonixLLC_S1_2560x1440-7e44a6a575a74e1d9d9b6d8d8d8d8d8d",
                    "year": 2015,
                    "genre": "Sports"
                }
            ]
        
        return []

epic_service = EpicService()
