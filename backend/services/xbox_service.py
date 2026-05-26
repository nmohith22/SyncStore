import os
import json
from dotenv import load_dotenv
from services.auth_service import auth_service

load_dotenv()

class XboxService:
    def __init__(self):
        pass

    async def get_user_games(self):
        # Check for saved session cookies
        session = auth_service.get_session("user_1", "xbox")
        if session:
            return [
                {
                    "id": "xbox-1",
                    "name": "Halo Infinite",
                    "platform": "xbox",
                    "image_url": "https://store-images.s-microsoft.com/image/apps.50670.13727851868390641.c9cc5f66-3d3b-4def-939e-3730f59e97d3.14032d80-c5fc-4209-9069-700683070774",
                    "year": 2021,
                    "genre": "FPS"
                },
                {
                    "id": "xbox-2",
                    "name": "Forza Horizon 5",
                    "platform": "xbox",
                    "image_url": "https://store-images.s-microsoft.com/image/apps.55052.13840742165033871.99616335-e11a-493e-862d-9478f7e7323b.88459461-9c60-4966-a362-d9646c825a07",
                    "year": 2021,
                    "genre": "Racing"
                },
                {
                    "id": "xbox-3",
                    "name": "Starfield",
                    "platform": "xbox",
                    "image_url": "https://store-images.s-microsoft.com/image/apps.10842.13835697207438491.5d9e564b-577e-4050-8b98-63a15715878a.4294b2a8-0d12-40f4-90a4-398701e9d91f",
                    "year": 2023,
                    "genre": "RPG"
                }
            ]
        
        return []

xbox_service = XboxService()
