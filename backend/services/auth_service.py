import os
import json
from typing import Dict, Optional, List
from pydantic import BaseModel

class SessionData(BaseModel):
    platform: str
    cookies: Optional[Dict[str, str]] = None
    user_id: Optional[str] = None
    username: Optional[str] = None
    steam_id: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    steam_api_key: Optional[str] = None
    auth_code: Optional[str] = None

import sys

class AuthService:
    def __init__(self):
        is_testing = "pytest" in sys.modules or os.getenv("TESTING") == "true"
        self.sessions_dir = "test_sessions" if is_testing else "sessions"
        if not os.path.exists(self.sessions_dir):
            os.makedirs(self.sessions_dir)

    def save_session(self, user_id: str, platform: str, cookies: Optional[Dict[str, str]], username: str, 
                     platform_user_id: Optional[str] = None, access_token: Optional[str] = None, 
                     refresh_token: Optional[str] = None, steam_api_key: Optional[str] = None):
        session_file = os.path.join(self.sessions_dir, f"{user_id}_{platform}.json")
        data = {
            "cookies": cookies or {},
            "username": username,
            "platform": platform,
            "user_id": platform_user_id,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "steam_api_key": steam_api_key
        }
        with open(session_file, "w") as f:
            json.dump(data, f)

    def get_session(self, user_id: str, platform: str) -> Optional[Dict]:
        session_file = os.path.join(self.sessions_dir, f"{user_id}_{platform}.json")
        if os.path.exists(session_file):
            with open(session_file, "r") as f:
                return json.load(f)
        return None
    
    def get_all_sessions(self, user_id: str) -> List[Dict]:
        sessions = []
        if not os.path.exists(self.sessions_dir):
            return sessions
        for file in os.listdir(self.sessions_dir):
            if file.startswith(user_id) and file.endswith(".json"):
                with open(os.path.join(self.sessions_dir, file), "r") as f:
                    sessions.append(json.load(f))
        return sessions

auth_service = AuthService()
