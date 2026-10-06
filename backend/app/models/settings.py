from sqlalchemy import Column, Integer, Boolean, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    read_receipts = Column(Boolean, default=True, nullable=False)
    last_seen_privacy = Column(Boolean, default=True, nullable=False)
    typing_indicator_privacy = Column(Boolean, default=True, nullable=False)
    theme = Column(String(20), default="light", nullable=False)  # "light" or "dark"
    sound_enabled = Column(Boolean, default=True, nullable=False)
    notifications_enabled = Column(Boolean, default=True, nullable=False)

    # Relationships
    user = relationship("User", back_populates="settings")
