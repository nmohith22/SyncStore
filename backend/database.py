from typing import Optional, List
from sqlmodel import Field, SQLModel, create_engine, Session, select

class Game(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    platform_game_id: str
    name: str
    platform: str # "steam", "epic", "playstation", "xbox"
    image_url: Optional[str] = None
    year: int = 2023
    genre: str = "Action"
    description: Optional[str] = None
    playtime_hours: Optional[int] = 0
    user_id: str = "user_1"

import sys
import os

is_testing = "pytest" in sys.modules or os.getenv("TESTING") == "true"
sqlite_file_name = "syncstore_test.db" if is_testing else "syncstore.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

engine = create_engine(sqlite_url, echo=False)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
