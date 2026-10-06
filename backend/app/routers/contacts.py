from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.contact import Contact
from app.schemas.contact import ContactCreate, ContactOut
from app.auth.deps import get_current_user
from app.websocket.manager import manager

router = APIRouter(prefix="/api/contacts", tags=["Contacts"])


@router.get("", response_model=List[ContactOut])
def get_contacts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all contacts for the current user."""
    contacts = (
        db.query(Contact)
        .filter(Contact.user_id == current_user.id)
        .order_by(Contact.created_at.desc())
        .all()
    )
    for c in contacts:
        if c.contact_user:
            c.contact_user.is_online = manager.is_user_online(c.contact_user.id)
    return contacts


@router.post("", response_model=ContactOut, status_code=status.HTTP_201_CREATED)
def add_contact(
    req: ContactCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a user to current user's contact list."""
    if req.contact_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot add yourself as a contact.")

    contact_target = db.query(User).filter(User.id == req.contact_user_id).first()
    if not contact_target:
        raise HTTPException(status_code=404, detail="User to add does not exist.")

    # Check duplicate
    existing = db.query(Contact).filter(
        Contact.user_id == current_user.id,
        Contact.contact_user_id == req.contact_user_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already in your contacts.")

    new_contact = Contact(
        user_id=current_user.id,
        contact_user_id=req.contact_user_id
    )
    db.add(new_contact)
    db.commit()
    db.refresh(new_contact)

    new_contact.contact_user.is_online = manager.is_user_online(new_contact.contact_user.id)
    return new_contact


@router.delete("/{contact_id}", status_code=status.HTTP_200_OK)
def delete_contact(
    contact_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a contact from current user's contacts."""
    contact = db.query(Contact).filter(
        Contact.id == contact_id,
        Contact.user_id == current_user.id
    ).first()

    if not contact:
        # Check if caller supplied contact_user_id instead of contact record id
        contact = db.query(Contact).filter(
            Contact.contact_user_id == contact_id,
            Contact.user_id == current_user.id
        ).first()

    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found.")

    db.delete(contact)
    db.commit()
    return {"message": "Contact removed successfully"}
