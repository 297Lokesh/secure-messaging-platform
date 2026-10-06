from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models.user import User
from app.models.contact import Contact
from app.schemas.user import UserOut, UserSearchOut
from app.auth.deps import get_current_user
from app.websocket.manager import manager

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("", response_model=List[UserOut])
def get_users(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all users except current user."""
    users = (
        db.query(User)
        .filter(User.id != current_user.id)
        .offset(skip)
        .limit(limit)
        .all()
    )
    # Refresh online status from live WebSocket manager
    for u in users:
        u.is_online = manager.is_user_online(u.id)
    return users


@router.get("/search", response_model=List[UserSearchOut])
def search_users(
    q: str = Query(..., min_length=1, description="Username or phone search term"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search users by username or phone number. Annotates with contact status."""
    term = f"%{q.lower().strip()}%"
    users = (
        db.query(User)
        .filter(
            User.id != current_user.id,
            or_(User.username.ilike(term), User.phone.ilike(term), User.display_name.ilike(term))
        )
        .limit(20)
        .all()
    )

    # Get set of current user's contact user IDs
    contact_ids = {
        c.contact_user_id
        for c in db.query(Contact.contact_user_id).filter(Contact.user_id == current_user.id).all()
    }

    results = []
    for u in users:
        is_online = manager.is_user_online(u.id)
        results.append(
            UserSearchOut(
                id=u.id,
                username=u.username,
                phone=u.phone,
                display_name=u.display_name,
                avatar_url=u.avatar_url,
                is_online=is_online,
                last_seen=u.last_seen,
                is_contact=(u.id in contact_ids),
            )
        )
    return results


@router.get("/{user_id}", response_model=UserOut)
def get_user_by_id(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get profile information for a specific user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_online = manager.is_user_online(user.id)
    return user
