import asyncio
import logging
from typing import List
from services.steam_service import steam_service
from services.epic_service import epic_service
from services.psn_service import psn_service
from services.xbox_service import xbox_service
from database import engine, Game
from sqlmodel import Session, select

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SyncManager:
    def __init__(self):
        self.active_syncs = {}

    async def slow_sync(self, user_id: str, platforms: List[str]):
        if user_id in self.active_syncs:
            logger.info(f"Sync already in progress for user {user_id}")
            return
        
        self.active_syncs[user_id] = True
        logger.info(f"Starting slow sync for user {user_id}")
        
        try:
            for platform in platforms:
                logger.info(f"Syncing {platform} for user {user_id}...")
                games_data = []
                
                if platform == "steam":
                    games_data = await steam_service.get_user_games()
                elif platform == "epic":
                    games_data = await epic_service.get_user_games()
                elif platform == "psn" or platform == "playstation":
                    games_data = await psn_service.get_user_games()
                elif platform == "xbox":
                    games_data = await xbox_service.get_user_games()
                
                if isinstance(games_data, list):
                    with Session(engine) as session:
                        for g in games_data:
                            if "error" in g: continue
                            
                            existing = session.exec(select(Game).where(
                                Game.platform_game_id == str(g['id']),
                                Game.platform == g['platform'].lower()
                            )).first()
                            
                            if not existing:
                                new_game = Game(
                                    platform_game_id=str(g['id']),
                                    name=g['name'],
                                    platform=g['platform'].lower(),
                                    image_url=g.get('image_url'),
                                    year=g.get('year', 2023),
                                    genre=g.get('genre', 'Action'),
                                    user_id=user_id
                                )
                                session.add(new_game)
                        session.commit()
                
                # Sleep to be "slow"
                await asyncio.sleep(1) 
                
            logger.info(f"Finished sync for user {user_id}")
        except Exception as e:
            logger.error(f"Sync failed: {e}")
        finally:
            del self.active_syncs[user_id]

sync_manager = SyncManager()
