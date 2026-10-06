from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_, select

from app.database import get_db
from app.models.user import User
from app.models.conversation import Conversation, ConversationMember
from app.models.message import Message, MessageRead
from app.schemas.conversation import (
    ConversationCreate,
    ConversationOut,
    ConversationDetailOut,
    AddMemberRequest,
)
from app.schemas.message import MessageOut, MessageReplyOut, MessageReadOut
from app.schemas.user import UserOut
from app.auth.deps import get_current_user
from app.websocket.manager import manager

router = APIRouter(prefix="/api/conversations", tags=["Conversations"])


def _format_conversation_out(conv: Conversation, current_user_id: int, db: Session) -> ConversationOut:
    """Helper to populate last_message, unread_count, other_user, and live online status."""
    # Find last message
    last_msg = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id)
        .order_by(desc(Message.created_at))
        .first()
    )

    last_msg_out = None
    if last_msg:
        sender_out = UserOut.model_validate(last_msg.sender)
        sender_out.is_online = manager.is_user_online(last_msg.sender.id)

        reply_to_out = None
        if last_msg.reply_to:
            reply_to_out = MessageReplyOut(
                id=last_msg.reply_to.id,
                content=last_msg.reply_to.content,
                sender_id=last_msg.reply_to.sender_id,
                sender_name=last_msg.reply_to.sender.display_name if last_msg.reply_to.sender else None,
            )

        reads_out = [
            MessageReadOut(
                id=r.id,
                message_id=r.message_id,
                user_id=r.user_id,
                read_at=r.read_at
            )
            for r in last_msg.reads
        ]

        last_msg_out = MessageOut(
            id=last_msg.id,
            conversation_id=last_msg.conversation_id,
            sender_id=last_msg.sender_id,
            content=last_msg.content,
            message_type=last_msg.message_type,
            status=last_msg.status,
            reply_to_id=last_msg.reply_to_id,
            reply_to=reply_to_out,
            created_at=last_msg.created_at,
            updated_at=last_msg.updated_at,
            sender=sender_out,
            reads=reads_out
        )

    # Compute unread count for current_user
    read_message_ids = (
        select(MessageRead.message_id)
        .filter(MessageRead.user_id == current_user_id)
    )
    unread_count = (
        db.query(func.count(Message.id))
        .filter(
            Message.conversation_id == conv.id,
            Message.sender_id != current_user_id,
            ~Message.id.in_(read_message_ids)
        )
        .scalar()
    ) or 0

    # Determine other_user for direct chats
    other_user_out = None
    if conv.type == "direct":
        for m in conv.members:
            if m.user_id != current_user_id and m.user:
                other_user_out = UserOut.model_validate(m.user)
                other_user_out.is_online = manager.is_user_online(m.user.id)
                break

    # Format members
    for m in conv.members:
        if m.user:
            m.user.is_online = manager.is_user_online(m.user.id)

    conv_out = ConversationOut.model_validate(conv)
    conv_out.last_message = last_msg_out
    conv_out.unread_count = unread_count
    conv_out.other_user = other_user_out
    return conv_out


@router.get("", response_model=List[ConversationOut])
def get_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all conversations for the current user, sorted by updated_at desc."""
    user_memberships = (
        select(ConversationMember.conversation_id)
        .filter(ConversationMember.user_id == current_user.id)
    )

    conversations = (
        db.query(Conversation)
        .filter(Conversation.id.in_(user_memberships))
        .order_by(desc(Conversation.updated_at))
        .all()
    )

    return [_format_conversation_out(conv, current_user.id, db) for conv in conversations]


@router.post("", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
def create_conversation(
    req: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new direct or group conversation."""
    if req.type == "direct":
        if not req.recipient_user_id:
            raise HTTPException(status_code=400, detail="recipient_user_id is required for direct conversations.")
        if req.recipient_user_id == current_user.id:
            raise HTTPException(status_code=400, detail="Cannot start a direct conversation with yourself.")

        recipient = db.query(User).filter(User.id == req.recipient_user_id).first()
        if not recipient:
            raise HTTPException(status_code=404, detail="Recipient user not found.")

        # Check if direct conversation already exists between these 2 users
        # Find shared direct conversations
        existing_conv = (
            db.query(Conversation)
            .join(ConversationMember)
            .filter(
                Conversation.type == "direct",
                ConversationMember.user_id.in_([current_user.id, req.recipient_user_id])
            )
            .group_by(Conversation.id)
            .having(func.count(ConversationMember.user_id) == 2)
            .first()
        )

        if existing_conv:
            return _format_conversation_out(existing_conv, current_user.id, db)

        # Create new direct conversation
        conv = Conversation(
            type="direct",
            name=None,
            avatar_url=None,
            created_by=current_user.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(conv)
        db.flush()

        member1 = ConversationMember(conversation_id=conv.id, user_id=current_user.id, role="member")
        member2 = ConversationMember(conversation_id=conv.id, user_id=req.recipient_user_id, role="member")
        db.add_all([member1, member2])
        db.commit()
        db.refresh(conv)

        return _format_conversation_out(conv, current_user.id, db)

    elif req.type == "group":
        if not req.name or not req.name.strip():
            raise HTTPException(status_code=400, detail="Group name is required.")

        member_ids = set(req.member_user_ids or [])
        member_ids.add(current_user.id)

        conv = Conversation(
            type="group",
            name=req.name.strip(),
            avatar_url=req.avatar_url,
            created_by=current_user.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(conv)
        db.flush()

        # Add creator as admin
        admin_member = ConversationMember(
            conversation_id=conv.id,
            user_id=current_user.id,
            role="admin"
        )
        db.add(admin_member)

        # Add other members
        for uid in member_ids:
            if uid != current_user.id:
                u = db.query(User).filter(User.id == uid).first()
                if u:
                    db.add(ConversationMember(conversation_id=conv.id, user_id=uid, role="member"))

        db.commit()
        db.refresh(conv)

        return _format_conversation_out(conv, current_user.id, db)

    else:
        raise HTTPException(status_code=400, detail="Invalid conversation type. Must be 'direct' or 'group'.")


@router.get("/{conversation_id}", response_model=ConversationOut)
def get_conversation_details(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get conversation details. Current user must be a member."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    is_member = any(m.user_id == current_user.id for m in conv.members)
    if not is_member:
        raise HTTPException(status_code=403, detail="You are not a member of this conversation.")

    return _format_conversation_out(conv, current_user.id, db)


@router.post("/{conversation_id}/members", status_code=status.HTTP_201_CREATED)
def add_conversation_member(
    conversation_id: int,
    req: AddMemberRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a member to a group conversation. Must be group admin."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    if conv.type != "group":
        raise HTTPException(status_code=400, detail="Members can only be added to group conversations.")

    # Check caller is admin
    user_member = next((m for m in conv.members if m.user_id == current_user.id), None)
    if not user_member or user_member.role != "admin":
        raise HTTPException(status_code=403, detail="Only group admins can add new members.")

    # Check if target user exists
    target_user = db.query(User).filter(User.id == req.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User to add does not exist.")

    # Check already member
    if any(m.user_id == req.user_id for m in conv.members):
        raise HTTPException(status_code=400, detail="User is already a member of this conversation.")

    new_member = ConversationMember(
        conversation_id=conv.id,
        user_id=req.user_id,
        role=req.role or "member"
    )
    db.add(new_member)
    conv.updated_at = datetime.utcnow()
    db.commit()

    return {"message": "Member added successfully"}


@router.delete("/{conversation_id}/members/{user_id}", status_code=status.HTTP_200_OK)
def remove_conversation_member(
    conversation_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove member from group (admin only) or leave group (self-removal)."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    if conv.type != "group":
        raise HTTPException(status_code=400, detail="Cannot remove members from direct conversations.")

    member_to_remove = next((m for m in conv.members if m.user_id == user_id), None)
    if not member_to_remove:
        raise HTTPException(status_code=404, detail="User is not a member of this conversation.")

    caller_member = next((m for m in conv.members if m.user_id == current_user.id), None)
    if not caller_member:
        raise HTTPException(status_code=403, detail="You are not a member of this conversation.")

    # If removing someone else, caller must be admin
    if user_id != current_user.id and caller_member.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can remove other members.")

    db.delete(member_to_remove)
    conv.updated_at = datetime.utcnow()
    db.commit()

    return {"message": "Member removed successfully"}
