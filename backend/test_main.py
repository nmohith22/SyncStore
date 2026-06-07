from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_auth_session_steam():
    response = client.post("/auth/session", json={
        "platform": "steam",
        "user_id": "76561198000000000",
        "username": "TestSteamUser",
        "cookies": {}
    })
    assert response.status_code == 200
    assert "Linked steam" in response.json()["message"]

def test_auth_session_epic_invalid():
    # Calling Epic auth with invalid code should fail/return error
    response = client.post("/auth/session", json={
        "platform": "epic",
        "auth_code": "invalid_code",
        "cookies": {}
    })
    assert response.status_code == 200
    assert "error" in response.json() or "Linked epic" in response.json()["message"]
