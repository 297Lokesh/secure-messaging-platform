import pytest
from starlette.testclient import TestClient
from app.main import app
from app.database import Base, engine
from app.seed import seed_database
from app.auth.security import create_access_token


def test_websocket_ping_and_ack():
    Base.metadata.create_all(bind=engine)
    seed_database()

    token = create_access_token(subject=1)  # demo user ID: 1
    client = TestClient(app)

    with client.websocket_connect(f"/ws/1?token={token}") as websocket:
        # First message sent by server is connection_established
        init_data = websocket.receive_json()
        assert init_data["type"] == "connection_established"
        assert init_data["data"]["user_id"] == 1

        # Test ping
        websocket.send_json({"type": "ping"})
        pong_data = websocket.receive_json()
        assert pong_data["type"] == "pong"
