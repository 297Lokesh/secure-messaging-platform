# Signal Secure Messaging Platform - Backend API

FastAPI, SQLAlchemy, and WebSocket backend providing real-time secure messaging, presence tracking, and normalized relational persistence.

## Architecture

```
FastAPI Application
 ├── Authentication: JWT Bearer Tokens + Bcrypt
 ├── Real-Time: WebSockets (/ws/{user_id})
 ├── Business Logic: Routers & Services
 ├── ORM: SQLAlchemy 2.0 (Declarative Base)
 └── Database: SQLite (secure_chat.db)
```

## Setup & Running

1. Create a Python virtual environment:
   ```bash
   python -m venv venv
   ```
2. Activate the virtual environment:
   - Windows: `.\venv\Scripts\activate`
   - Linux/macOS: `source venv/bin/activate`
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy environment configuration:
   ```bash
   copy .env.example .env
   ```
5. Start development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
6. Run automated test suite:
   ```bash
   pytest tests/ -v
   ```

## Seed Credentials

All seeded accounts use password: `DemoPass123!`
- `demo` (Demo User)
- `sarah` (Sarah Jenkins)
- `alex` (Alex Chen)
- `priya` (Priya Sharma)
- `john` (John Doe)
- `david` (David Miller)

Fixed Mock OTP: `123456`
