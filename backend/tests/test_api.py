import asyncio
import time
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import Base, engine
from app.seed import seed_database


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Ensure database schema is created and seeded before running tests."""
    Base.metadata.create_all(bind=engine)
    seed_database()


@pytest.mark.asyncio
async def test_health():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/health")
        assert res.status_code == 200
        assert res.json() == {"status": "healthy"}


@pytest.mark.asyncio
async def test_login_demo():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/api/auth/login", json={
            "username_or_phone": "demo",
            "password": "DemoPass123!"
        })
        assert res.status_code == 200, res.text
        data = res.json()
        assert "access_token" in data
        assert data["user"]["username"] == "demo"


@pytest.mark.asyncio
async def test_register_and_otp():
    unique_suffix = int(time.time() * 1000) % 100000000
    unique_user = f"tester_{unique_suffix}"
    unique_phone = f"+199{unique_suffix:08d}"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Register test user
        reg_res = await ac.post("/api/auth/register", json={
            "username": unique_user,
            "phone": unique_phone,
            "password": "TestPassword123!",
            "display_name": "Test Engineer",
            "avatar_url": None
        })
        assert reg_res.status_code == 201, reg_res.text
        assert reg_res.json()["requires_otp"] is True

        # Verify OTP
        otp_res = await ac.post("/api/auth/verify-otp", json={
            "phone_or_username": unique_user,
            "otp": "123456"
        })
        assert otp_res.status_code == 200, otp_res.text
        token_data = otp_res.json()
        assert "access_token" in token_data
        assert token_data["user"]["username"] == unique_user


@pytest.mark.asyncio
async def test_conversations_and_messages():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Login demo
        login_res = await ac.post("/api/auth/login", json={
            "username_or_phone": "demo",
            "password": "DemoPass123!"
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Get conversations
        convs_res = await ac.get("/api/conversations", headers=headers)
        assert convs_res.status_code == 200
        convs = convs_res.json()
        assert len(convs) >= 4, f"Expected at least 4 conversations, got {len(convs)}"

        first_conv_id = convs[0]["id"]

        # Send message
        msg_res = await ac.post(
            f"/api/conversations/{first_conv_id}/messages",
            headers=headers,
            json={"content": "Automated verification test message!", "message_type": "text"}
        )
        assert msg_res.status_code == 201
        msg = msg_res.json()
        assert msg["content"] == "Automated verification test message!"

        # Get messages
        list_msg_res = await ac.get(f"/api/conversations/{first_conv_id}/messages", headers=headers)
        assert list_msg_res.status_code == 200
        msgs = list_msg_res.json()
        assert any(m["id"] == msg["id"] for m in msgs)

        # Mark message as read
        read_res = await ac.post(f"/api/messages/{msg['id']}/read", headers=headers)
        assert read_res.status_code == 200


@pytest.mark.asyncio
async def test_contacts_and_search():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Login demo
        login_res = await ac.post("/api/auth/login", json={
            "username_or_phone": "demo",
            "password": "DemoPass123!"
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # List contacts
        contacts_res = await ac.get("/api/contacts", headers=headers)
        assert contacts_res.status_code == 200
        contacts = contacts_res.json()
        assert len(contacts) > 0

        # Search users
        search_res = await ac.get("/api/users/search?q=sarah", headers=headers)
        assert search_res.status_code == 200
        results = search_res.json()
        assert any(u["username"] == "sarah" for u in results)


@pytest.mark.asyncio
async def test_group_creation_and_membership():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Login demo
        login_res = await ac.post("/api/auth/login", json={
            "username_or_phone": "demo",
            "password": "DemoPass123!"
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create new group
        create_res = await ac.post("/api/conversations", headers=headers, json={
            "type": "group",
            "name": f"Test Squad {int(time.time())}",
            "member_user_ids": [2, 3]
        })
        assert create_res.status_code == 201, create_res.text
        group = create_res.json()
        group_id = group["id"]
        assert group["type"] == "group"

        # Add David (id: 6) as member
        add_member_res = await ac.post(f"/api/conversations/{group_id}/members", headers=headers, json={
            "user_id": 6,
            "role": "member"
        })
        assert add_member_res.status_code == 201

        # Remove David
        del_member_res = await ac.delete(f"/api/conversations/{group_id}/members/6", headers=headers)
        assert del_member_res.status_code == 200


@pytest.mark.asyncio
async def test_profile_and_settings():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Login demo
        login_res = await ac.post("/api/auth/login", json={
            "username_or_phone": "demo",
            "password": "DemoPass123!"
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Update profile
        prof_res = await ac.patch("/api/profile", headers=headers, json={
            "display_name": "Demo Super User"
        })
        assert prof_res.status_code == 200
        assert prof_res.json()["display_name"] == "Demo Super User"

        # Update settings
        settings_res = await ac.patch("/api/settings", headers=headers, json={
            "theme": "dark",
            "read_receipts": True
        })
        assert settings_res.status_code == 200
        assert settings_res.json()["theme"] == "dark"


@pytest.mark.asyncio
async def test_two_factor_auth_flow():
    unique_suffix = int(time.time() * 1000) % 100000000
    unique_user = f"twofa_{unique_suffix}"
    pw = "SecurePass123!"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Register with username only
        reg_res = await ac.post("/api/auth/register", json={
            "username": unique_user,
            "password": pw,
            "display_name": "Two Factor User",
        })
        assert reg_res.status_code == 201
        reg_data = reg_res.json()
        assert reg_data["requires_otp"] is True
        assert reg_data["mock_otp"] == "123456"

        # 2. Verify registration OTP with wrong code
        bad_otp_res = await ac.post("/api/auth/verify-registration-otp", json={
            "phone_or_username": unique_user,
            "otp": "999999"
        })
        assert bad_otp_res.status_code == 400

        # 3. Verify registration OTP with correct code 123456
        good_otp_res = await ac.post("/api/auth/verify-registration-otp", json={
            "phone_or_username": unique_user,
            "otp": "123456"
        })
        assert good_otp_res.status_code == 200
        assert good_otp_res.json()["verified"] is True
        # Ensure no token is returned (user is NOT logged in yet)
        assert "access_token" not in good_otp_res.json()

        # 4. Login: Step 1 Validate Credentials with wrong password
        bad_pw_res = await ac.post("/api/auth/validate-credentials", json={
            "username_or_phone": unique_user,
            "password": "WrongPassword!"
        })
        assert bad_pw_res.status_code == 401

        # 5. Login: Step 1 Validate Credentials with correct password
        val_res = await ac.post("/api/auth/validate-credentials", json={
            "username_or_phone": unique_user,
            "password": pw
        })
        assert val_res.status_code == 200
        val_data = val_res.json()
        assert val_data["requires_otp"] is True
        assert "access_token" not in val_data  # User not logged in yet!

        # 6. Login: Step 2 Verify OTP with wrong code
        bad_login_otp = await ac.post("/api/auth/verify-otp", json={
            "phone_or_username": unique_user,
            "otp": "000000"
        })
        assert bad_login_otp.status_code == 400

        # 7. Login: Step 2 Verify OTP with 123456
        login_res = await ac.post("/api/auth/verify-otp", json={
            "phone_or_username": unique_user,
            "otp": "123456"
        })
        assert login_res.status_code == 200
        login_data = login_res.json()
        assert "access_token" in login_data
        assert login_data["user"]["username"] == unique_user

