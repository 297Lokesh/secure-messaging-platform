from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.settings import UserSettings
from app.schemas.settings import UserSettingsOut, UserSettingsUpdate
from app.auth.deps import get_current_user

router = APIRouter(prefix="/api/settings", tags=["Settings"])


@router.get("", response_model=UserSettingsOut)
def get_user_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve user settings, creating defaults if not yet created."""
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.patch("", response_model=UserSettingsOut)
def update_user_settings(
    req: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update settings for the current user."""
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)

    if req.read_receipts is not None:
        settings.read_receipts = req.read_receipts
    if req.last_seen_privacy is not None:
        settings.last_seen_privacy = req.last_seen_privacy
    if req.typing_indicator_privacy is not None:
        settings.typing_indicator_privacy = req.typing_indicator_privacy
    if req.theme is not None:
        settings.theme = req.theme
    if req.sound_enabled is not None:
        settings.sound_enabled = req.sound_enabled
    if req.notifications_enabled is not None:
        settings.notifications_enabled = req.notifications_enabled

    db.commit()
    db.refresh(settings)
    return settings
