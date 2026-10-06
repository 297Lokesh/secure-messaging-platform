import os
import sys
import json
import time

sys.path.insert(0, os.path.abspath("."))

from starlette.testclient import TestClient
from app.main import app
from app.database import Base, engine
from app.seed import seed_database


def run_full_verification():
    print("=" * 60)
    print("STARTING FULL SYSTEM VERIFICATION")
    print("=" * 60)

    # 1. Initialize and Seed
    print("[1/8] Initializing database and seeder...")
    Base.metadata.create_all(bind=engine)
    seed_database()
    client = TestClient(app)
    print("  [PASS] Database initialized and seeded successfully.")

    # 2. Test Health
    print("[2/8] Testing Health and Root endpoints...")
    res = client.get("/health")
    assert res.status_code == 200 and res.json() == {"status": "healthy"}
    res_root = client.get("/")
    assert res_root.status_code == 200 and "version" in res_root.json()
    print("  [PASS] Health and root endpoints responded 200 OK.")

    # 3. Test Demo User Login
    print("[3/8] Testing Login with Demo User...")
    login_res = client.post("/api/auth/login", json={
        "username_or_phone": "demo",
        "password": "DemoPass123!"
    })
    assert login_res.status_code == 200, login_res.text
    token_data = login_res.json()
    demo_token = token_data["access_token"]
    demo_user = token_data["user"]
    assert demo_user["username"] == "demo"
    auth_headers = {"Authorization": f"Bearer {demo_token}"}
    print(f"  [PASS] Demo User logged in. User ID: {demo_user['id']}, JWT generated.")

    # 4. Test Registration with Mock OTP
    print("[4/8] Testing User Registration & Mock OTP Flow...")
    unique_ts = int(time.time() * 1000) % 100000000
    test_user = f"evaluator_{unique_ts}"
    test_phone = f"+188{unique_ts:08d}"

    reg_res = client.post("/api/auth/register", json={
        "username": test_user,
        "phone": test_phone,
        "password": "SecurePassword123!",
        "display_name": "Assignment Evaluator",
        "avatar_url": None
    })
    assert reg_res.status_code == 201, reg_res.text
    assert reg_res.json()["requires_otp"] is True

    otp_res = client.post("/api/auth/verify-otp", json={
        "phone_or_username": test_user,
        "otp": "123456"
    })
    assert otp_res.status_code == 200, otp_res.text
    eval_token = otp_res.json()["access_token"]
    print("  [PASS] Registration + fixed mock OTP (123456) passed.")

    # 5. Test Conversations List & Message Sending
    print("[5/8] Testing Conversations and Message History...")
    convs_res = client.get("/api/conversations", headers=auth_headers)
    assert convs_res.status_code == 200
    convs = convs_res.json()
    assert len(convs) >= 4
    first_conv = convs[0]
    print(f"  [PASS] Loaded {len(convs)} seeded conversations. Target conversation ID: {first_conv['id']}")

    send_msg_res = client.post(
        f"/api/conversations/{first_conv['id']}/messages",
        headers=auth_headers,
        json={"content": "Live E2E Verification Message", "message_type": "text"}
    )
    assert send_msg_res.status_code == 201
    sent_msg = send_msg_res.json()
    assert sent_msg["content"] == "Live E2E Verification Message"
    print(f"  [PASS] Sent message (ID: {sent_msg['id']}). Status: {sent_msg['status']}")

    # 6. Test Mark Message as Read
    print("[6/8] Testing Read Receipts...")
    read_res = client.post(f"/api/messages/{sent_msg['id']}/read", headers=auth_headers)
    assert read_res.status_code == 200
    print("  [PASS] Read receipt endpoint executed successfully.")

    # 7. Test Group Creation and Management
    print("[7/8] Testing Group Chat Lifecycle...")
    grp_res = client.post("/api/conversations", headers=auth_headers, json={
        "type": "group",
        "name": f"Evaluation Team {unique_ts}",
        "member_user_ids": [2, 3]
    })
    assert grp_res.status_code == 201
    new_group = grp_res.json()
    group_id = new_group["id"]
    assert new_group["type"] == "group"

    # Add member
    add_m_res = client.post(f"/api/conversations/{group_id}/members", headers=auth_headers, json={
        "user_id": 4,
        "role": "member"
    })
    assert add_m_res.status_code == 201

    # Remove member
    del_m_res = client.delete(f"/api/conversations/{group_id}/members/4", headers=auth_headers)
    assert del_m_res.status_code == 200
    print("  [PASS] Group creation, member addition, and member removal verified.")

    # 8. Test WebSocket Real-Time Handshake and Ping
    print("[8/8] Testing Real-Time WebSocket Channel...")
    with client.websocket_connect(f"/ws/1?token={demo_token}") as ws:
        init_event = ws.receive_json()
        assert init_event["type"] == "connection_established"
        assert init_event["data"]["user_id"] == 1
        ws.send_json({"type": "ping"})
        pong_event = ws.receive_json()
        assert pong_event["type"] == "pong"
        print("  [PASS] WebSocket connected, handshake verified, ping-pong successful.")

    print("=" * 60)
    print("ALL 8 SYSTEM VERIFICATION CHECKS PASSED WITH 100% SUCCESS!")
    print("=" * 60)


if __name__ == "__main__":
    run_full_verification()
