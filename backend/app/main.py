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

# CORS setup
cors_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
allowed_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
if "*" not in allowed_origins:
    # Ensure localhost with various ports is allowed for easy local testing
    allowed_origins.extend(["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if "*" not in allowed_origins else ["*"],
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
