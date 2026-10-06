import os
import sys
from pathlib import Path
import logging
from contextlib import asynccontextmanager

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.seed import seed_database
from app.routers import auth, users, contacts, conversations, messages, profile, settings, ws

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize database tables and seed sample data."""
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    logger.info("Seeding demo data if empty...")
    seed_database()
    logger.info("Signal Secure Messaging backend is ready.")
    yield
    logger.info("Shutting down Signal Secure Messaging backend.")


app = FastAPI(
    title="Signal Secure Messaging Platform API",
    description="Backend API and WebSocket service for Signal-style secure messaging web platform.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS setup: allow all Vercel origins (*.vercel.app), localhost, and custom origins
cors_origins_env = os.getenv("CORS_ORIGINS", "*")
if cors_origins_env == "*":
    allowed_origins = ["*"]
else:
    allowed_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
    for local_url in ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"]:
        if local_url not in allowed_origins:
            allowed_origins.append(local_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?://.*(?:\.vercel\.app|localhost|127\.0\.0\.1)(?::\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(contacts.router)
app.include_router(conversations.router)
app.include_router(messages.router)
app.include_router(profile.router)
app.include_router(settings.router)
app.include_router(ws.router)


@app.get("/")
def root():
    return {
        "status": "online",
        "app": "Signal Secure Messaging Platform API",
        "version": "1.0.0",
        "documentation": "/docs",
        "simulation_notice": "Encryption is simulated for demonstration and interview purposes."
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
