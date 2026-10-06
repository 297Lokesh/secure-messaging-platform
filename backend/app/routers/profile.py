from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserOut, UserProfileUpdate
from app.auth.deps import get_current_user
from app.websocket.manager import manager

router = APIRouter(prefix="/api/profile", tags=["Profile"])


@router.get("", response_model=UserOut)
def get_profile(current_user: User = Depends(get_current_user)):
    """Get current user's profile information."""
    current_user.is_online = manager.is_user_online(current_user.id)
    return current_user


@router.patch("", response_model=UserOut)
def update_profile(
    req: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update profile information for the authenticated user."""
    if req.display_name is not None and req.display_name.strip():
        current_user.display_name = req.display_name.strip()
    if req.avatar_url is not None:
        current_user.avatar_url = req.avatar_url.strip() or None
    if req.phone is not None and req.phone.strip():
        # Check uniqueness of phone
        existing_phone = db.query(User).filter(
            User.phone == req.phone.strip(),
            User.id != current_user.id
        ).first()
        if existing_phone:
            raise HTTPException(status_code=400, detail="Phone number is already used by another account.")
        current_user.phone = req.phone.strip()

    db.commit()
    db.refresh(current_user)
    current_user.is_online = manager.is_user_online(current_user.id)
    return current_user
