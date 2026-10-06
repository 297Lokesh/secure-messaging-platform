import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Detect Vercel / serverless environment
IS_VERCEL = os.getenv("VERCEL") == "1" or os.getenv("VERCEL") == "true" or os.getenv("VERCEL_ENV") is not None

# Writable temporary SQLite location for Vercel, local SQLite for local development
if IS_VERCEL:
    DEFAULT_DATABASE_URL = "sqlite:////tmp/secure_chat.db"
else:
    DEFAULT_DATABASE_URL = "sqlite:///./secure_chat.db"

DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)

# Ensure the database directory/path is valid before SQLAlchemy creates the engine
if DATABASE_URL.startswith("sqlite"):
    db_path_str = DATABASE_URL
    if db_path_str.startswith("sqlite:////"):
        # Absolute Unix path: sqlite:////tmp/secure_chat.db -> /tmp/secure_chat.db
        db_path_str = "/" + db_path_str[len("sqlite:////"):]
    elif db_path_str.startswith("sqlite:///"):
        # Relative or Windows path: sqlite:///./secure_chat.db -> ./secure_chat.db
        db_path_str = db_path_str[len("sqlite:///"): ]
    elif db_path_str.startswith("sqlite://"):
        db_path_str = db_path_str[len("sqlite://"):]

    try:
        db_path = Path(db_path_str).resolve()
        db_path.parent.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass

# For SQLite, check_same_thread=False is needed for multi-threaded FastAPI workers
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False,
    future=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)

Base = declarative_base()


def get_db():
    """FastAPI Dependency for database session management."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
