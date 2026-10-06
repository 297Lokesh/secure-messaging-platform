# Signal-Style Secure Messaging Platform

A full-stack, production-quality, responsive Signal-inspired secure messaging web platform designed for an SDE Fullstack evaluation. Built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **FastAPI**, **SQLAlchemy 2.0**, **WebSockets**, and **SQLite**.

> [!IMPORTANT]
> **Simulated Encryption Disclaimer**: This application simulates end-to-end encryption for demonstration and interview evaluation purposes. It displays Signal-style verified encryption badges, lock indicators, and security banners. It does **not** implement the Signal Double Ratchet protocol or production-grade cryptographic end-to-end encryption.

---

## 1. Features

- **Signal Desktop UI & UX**:
  - Signature Signal blue accent (`#2c6bed`), clean light mode, and dark slate theme.
  - Signal-style conversation sidebar with search, unread bubble badges, online presence indicators, and last message timestamp.
  - Dynamic chat pane with date separators ("Today", "Yesterday"), reply preview quote bars, and simulated security banners.
  - Mobile-responsive layout (collapsible drawer on mobile with seamless back navigation).
- **Real-Time 1-on-1 & Group Messaging**:
  - Persistent bi-directional WebSockets (`/ws/{user_id}`) with automatic reconnection and ping/pong heartbeats.
  - Multi-tier delivery status checkmarks:
    - `Clock`: sending (optimistic UI update).
    - `✓`: sent to server and persisted to SQLite.
    - `✓✓` (gray): delivered to online recipient(s).
    - `✓✓` (blue): read by recipient.
  - Real-time debounced typing indicators ("Sarah is typing...").
  - Group chats with role-based permissions (`admin` / `member`), group creation modal, add/remove members, and voluntary group leaving.
- **Robust Authentication & Security**:
  - Registration with username, phone number, password, display name, and avatar URL.
  - Fixed Mock OTP verification code: `123456`.
  - Bcrypt password hashing (plain passwords are never stored).
  - JWT Bearer token generation and route protection.
  - One-click demo credentials bar on the login page for effortless testing.
- **Contact Management & Settings**:
  - Search users by username or phone number.
  - Add and delete contacts (prevents duplicates).
  - Settings modal with Appearance (Light/Dark mode), Privacy (read receipts toggle, last seen visibility, typing indicator toggle), Notifications, and "Coming Soon" placeholders for Voice/Video Calls, Stories, and Linked Devices.

---

## 2. Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide React, Axios, date-fns |
| **Backend** | Python 3.10+, FastAPI, Starlette, Uvicorn, SQLAlchemy 2.0, Pydantic v2, WebSockets |
| **Authentication** | JWT (python-jose), Passlib, Bcrypt (work factor 12) |
| **Database** | SQLite with SQLAlchemy ORM (WAL mode, indexed foreign keys) |
| **Testing** | Pytest, pytest-asyncio, HTTPX AsyncClient, Starlette TestClient |

---

## 3. Architecture

```
+---------------------------------------------------------------------------------+
|                                 Next.js Frontend                                |
|  - App Router: /login, /register, /chat                                         |
|  - AuthContext (Session persistence & route protection)                         |
|  - ChatContext (Optimistic UI updates, active conversation state)               |
|  - useWebSocket Hook (Exponential backoff auto-reconnect, debounced typing)     |
+---------------------------------------+-----------------------------------------+
                                        |
                 REST API (HTTP)        |        WebSockets (Real-time Events)
                 Authorization: Bearer  |        /ws/{user_id}?token=...
                                        v
+---------------------------------------+-----------------------------------------+
|                               FastAPI Backend                                  |
|  - Routers: Auth, Users, Contacts, Conversations, Messages, Profile, Settings   |
|  - WebSocket ConnectionManager (user_id -> Set[WebSocket], broadcast rooms)   |
|  - JWT Bearer Authentication & Bcrypt Password Hashing                         |
+---------------------------------------+-----------------------------------------+
                                        |
                             SQLAlchemy ORM (2.0)
                                        v
+---------------------------------------+-----------------------------------------+
|                            SQLite Database (secure_chat.db)                     |
|  - users, contacts, conversations, conversation_members, messages,             |
|    message_reads, typing_status, notifications, user_settings                   |
+---------------------------------------------------------------------------------+
```

---

## 4. Database Schema

The SQLite database (`secure_chat.db`) contains 8 normalized relational tables:

1. **`users`**:
   - `id` (INTEGER, Primary Key)
   - `username` (VARCHAR, Unique, Indexed)
   - `phone` (VARCHAR, Unique, Indexed)
   - `password_hash` (VARCHAR, Bcrypt hash)
   - `display_name` (VARCHAR)
   - `avatar_url` (VARCHAR, Nullable)
   - `is_online` (BOOLEAN, Default False)
   - `last_seen` (DATETIME)
   - `created_at` (DATETIME)
2. **`contacts`**:
   - `id` (INTEGER, Primary Key)
   - `user_id` (INTEGER, FK -> `users.id` on delete CASCADE)
   - `contact_user_id` (INTEGER, FK -> `users.id` on delete CASCADE)
   - `created_at` (DATETIME)
   - `UniqueConstraint("user_id", "contact_user_id")` prevents duplicate contacts.
3. **`conversations`**:
   - `id` (INTEGER, Primary Key)
   - `type` (VARCHAR: `'direct'` or `'group'`)
   - `name` (VARCHAR, Nullable for direct chats)
   - `avatar_url` (VARCHAR, Nullable)
   - `created_by` (INTEGER, FK -> `users.id`)
   - `created_at` (DATETIME)
   - `updated_at` (DATETIME, Indexed for sorting)
4. **`conversation_members`**:
   - `id` (INTEGER, Primary Key)
   - `conversation_id` (INTEGER, FK -> `conversations.id` on delete CASCADE)
   - `user_id` (INTEGER, FK -> `users.id` on delete CASCADE)
   - `role` (VARCHAR: `'admin'` or `'member'`)
   - `joined_at` (DATETIME)
   - `UniqueConstraint("conversation_id", "user_id")`
5. **`messages`**:
   - `id` (INTEGER, Primary Key)
   - `conversation_id` (INTEGER, FK -> `conversations.id` on delete CASCADE)
   - `sender_id` (INTEGER, FK -> `users.id` on delete CASCADE)
   - `content` (TEXT)
   - `message_type` (VARCHAR: `'text'`, `'image'`, `'system'`)
   - `status` (VARCHAR: `'sent'`, `'delivered'`, `'read'`)
   - `reply_to_id` (INTEGER, Self-referencing FK -> `messages.id`)
   - `created_at` (DATETIME, Indexed)
   - `updated_at` (DATETIME)
6. **`message_reads`**:
   - `id` (INTEGER, Primary Key)
   - `message_id` (INTEGER, FK -> `messages.id` on delete CASCADE)
   - `user_id` (INTEGER, FK -> `users.id` on delete CASCADE)
   - `read_at` (DATETIME)
   - `UniqueConstraint("message_id", "user_id")`
7. **`user_settings`**:
   - `id` (INTEGER, Primary Key)
   - `user_id` (INTEGER, FK -> `users.id`, Unique)
   - `read_receipts` (BOOLEAN, Default True)
   - `last_seen_privacy` (BOOLEAN, Default True)
   - `typing_indicator_privacy` (BOOLEAN, Default True)
   - `theme` (VARCHAR: `'light'` or `'dark'`)
   - `sound_enabled` (BOOLEAN)
   - `notifications_enabled` (BOOLEAN)
8. **`notifications`**:
   - `id` (INTEGER, Primary Key)
   - `user_id` (INTEGER, FK -> `users.id`)
   - `type` (VARCHAR)
   - `message` (TEXT)
   - `is_read` (BOOLEAN)
   - `created_at` (DATETIME)

---

## 5. API Documentation

### Authentication (`/api/auth`)
- `POST /api/auth/register`: Register account. Returns `{ "requires_otp": true, "mock_otp": "123456" }`.
- `POST /api/auth/verify-otp`: Validates fixed OTP (`123456`) and issues JWT access token.
- `POST /api/auth/login`: Authenticate with username or phone and password.
- `POST /api/auth/logout`: Revoke session and mark user offline.
- `GET /api/auth/me`: Get current user profile and settings.

### Users & Contacts (`/api/users`, `/api/contacts`)
- `GET /api/users`: List all other users with live online presence.
- `GET /api/users/search?q={query}`: Search users by username, phone, or display name.
- `GET /api/contacts`: Retrieve user's contact list.
- `POST /api/contacts`: Add contact by `contact_user_id`.
- `DELETE /api/contacts/{id}`: Remove contact.

### Conversations & Messages (`/api/conversations`, `/api/messages`)
- `GET /api/conversations`: List conversations sorted by `updated_at` descending with unread count and latest message snippet.
- `POST /api/conversations`: Create direct or group conversation.
- `GET /api/conversations/{id}`: Get conversation details.
- `POST /api/conversations/{id}/members`: Add member to group (admin only).
- `DELETE /api/conversations/{id}/members/{user_id}`: Remove member (admin only) or leave group.
- `GET /api/conversations/{id}/messages?skip=0&limit=50`: Paginated chronological messages.
- `POST /api/conversations/{id}/messages`: REST send message fallback.
- `PATCH /api/messages/{id}`: Edit message.
- `DELETE /api/messages/{id}`: Delete message.
- `POST /api/messages/{id}/read`: Mark message as read and broadcast receipt.

### Profile & Settings (`/api/profile`, `/api/settings`)
- `GET /api/profile` & `PATCH /api/profile`: View and update display name, avatar, and phone.
- `GET /api/settings` & `PATCH /api/settings`: View and update privacy toggles and theme.

---

## 6. WebSocket Architecture

WebSocket endpoint: `/ws/{user_id}?token={jwt_token}`

### Connection Manager
- Maintains a mapping of `user_id -> Set[WebSocket]` to support multiple concurrent browser tabs per user.
- Emits user presence (`online` / `offline` with `last_seen`) to relevant contacts.

### Client-to-Server Events
- `send_message`: `{ "conversation_id": 1, "content": "Hello", "reply_to_id": null, "temp_id": "temp-123" }`
- `typing`: `{ "conversation_id": 1, "is_typing": true }`
- `read_receipt`: `{ "conversation_id": 1, "message_ids": [12, 13] }`
- `ping`: `{ "type": "ping" }` (responds with `pong`)

### Server-to-Client Broadcast Events
- `connection_established`: Returns `{ user_id, online_users: [...] }`
- `new_message`: Pushes real-time message payload to all online conversation members.
- `message_sent_ack`: Confirms message persistence and returns server ID and status to the sender.
- `messages_read`: Notifies sender to update ticks to read (`✓✓` blue).
- `user_typing`: Broadcasts debounced typing state to conversation participants.
- `user_status`: Broadcasts online/offline transitions.

---

## 7. Demo Credentials

The database is pre-seeded on initial startup. All seeded users share the common demo password:

**Password**: `DemoPass123!`

| Username | Display Name | Phone | Role / Seed Notes |
|---|---|---|---|
| `demo` | Demo User | `+1234567001` | Primary evaluation user (contacts preloaded) |
| `sarah` | Sarah Jenkins | `+1234567002` | Direct chat partner with rich message history |
| `alex` | Alex Chen | `+1234567003` | Direct chat partner (contains unread message) |
| `priya` | Priya Sharma | `+1234567004` | Direct chat partner |
| `john` | John Doe | `+1234567005` | Seed contact |
| `david` | David Miller | `+1234567006` | Member of "Signal Core Engineering" group |

**Fixed Mock OTP**: `123456`

---

## 8. Local Setup & Execution

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+

### Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the backend server (starts on http://localhost:8000)
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend

# Install npm dependencies
npm install

# Start Next.js development server (starts on http://localhost:3000)
npm run dev
```

Visit **http://localhost:3000** in your browser.

### Running Backend Tests
```bash
cd backend
.\venv\Scripts\activate
python -m pytest tests/ -v
```

---

## 9. Environment Variables

### Backend (`backend/.env`)
```env
PROJECT_NAME="Signal Secure Messaging Platform"
SECRET_KEY="demo-secret-key-change-in-production-for-jwt-signing"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=10080
DATABASE_URL="sqlite:///./secure_chat.db"
CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
MOCK_OTP_CODE="123456"
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL="http://localhost:8000"
NEXT_PUBLIC_WS_URL="ws://localhost:8000"
```

---

## 10. Deployment

### Frontend (Vercel)
1. Push repository to GitHub.
2. Import repository into Vercel and set the Root Directory to `frontend`.
3. Configure Environment Variables:
   - `NEXT_PUBLIC_API_URL`: Your deployed backend URL (e.g. `https://signal-api.up.railway.app`).
   - `NEXT_PUBLIC_WS_URL`: Your deployed WebSocket URL (e.g. `wss://signal-api.up.railway.app`).
4. Deploy!

### Backend (Railway / Render)
1. Set Root Directory to `backend`.
2. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Configure Environment Variables matching `backend/.env.example`.
4. Update `CORS_ORIGINS` to include your Vercel deployment domain.

---

## 11. Limitations & Placeholders

1. **Simulated Cryptography**: As specified by project constraints, cryptographic end-to-end encryption is simulated for demonstration and interview purposes.
2. **Media Attachments**: File picker and attachment buttons display demonstration dialogs.
3. **Voice/Video Calls & Stories**: Interface features include polished "Coming Soon" badges and notifications.
4. **Linked Devices**: Displayed as a "Coming Soon" feature in the Settings dialog.
