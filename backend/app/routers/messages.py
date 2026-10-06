from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.user import User
from app.models.conversation import Conversation, ConversationMember
from app.models.message import Message, MessageRead
from app.schemas.message import MessageCreate, MessageOut, MessageUpdate, MessageReplyOut, MessageReadOut
from app.schemas.user import UserOut
from app.auth.deps import get_current_user
from app.websocket.manager import manager

router = APIRouter(prefix="/api", tags=["Messages"])


def _format_message_out(msg: Message) -> MessageOut:
    """Format Message ORM into MessageOut schema."""
    reply_to_out = None
    if msg.reply_to:
        reply_to_out = MessageReplyOut(
            id=msg.reply_to.id,
            content=msg.reply_to.content,
            sender_id=msg.reply_to.sender_id,
            sender_name=msg.reply_to.sender.display_name if msg.reply_to.sender else None,
        )

    reads_out = [
        MessageReadOut(
            id=r.id,
            message_id=r.message_id,
            user_id=r.user_id,
            read_at=r.read_at
        )
        for r in msg.reads
    ]

    sender_out = UserOut.model_validate(msg.sender)
    sender_out.is_online = manager.is_user_online(msg.sender.id)

    return MessageOut(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender_id=msg.sender_id,
        content=msg.content,
        message_type=msg.message_type,
        status=msg.status,
        reply_to_id=msg.reply_to_id,
        reply_to=reply_to_out,
        created_at=msg.created_at,
        updated_at=msg.updated_at,
        sender=sender_out,
        reads=reads_out
    )


@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageOut])
async def get_conversation_messages(
    conversation_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    mark_as_read: bool = Query(True, description="Automatically mark loaded messages as read"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve message history for a conversation, ordered chronologically."""
    # Check membership
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    is_member = any(m.user_id == current_user.id for m in conv.members)
    if not is_member:
        raise HTTPException(status_code=403, detail="Not authorized to view messages in this conversation.")

    # Fetch latest messages sorted descending for pagination, then reversed to ascending
    messages_query = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(desc(Message.created_at))
        .offset(skip)
        .limit(limit)
        .all()
    )
    # Reverse to chronological order (oldest to newest)
    messages = list(reversed(messages_query))

    # Optionally mark unread messages as read
    if mark_as_read:
        now = datetime.utcnow()
        unread_messages = [
            m for m in messages
            if m.sender_id != current_user.id
            and not any(r.user_id == current_user.id for r in m.reads)
        ]
        if unread_messages:
            for m in unread_messages:
                m.status = "read"
                read_record = MessageRead(
                    message_id=m.id,
                    user_id=current_user.id,
                    read_at=now
                )
                db.add(read_record)
            db.commit()

            # Broadcast read receipts via WebSocket
            member_ids = [m.user_id for m in conv.members]
            read_msg_ids = [m.id for m in unread_messages]
            await manager.broadcast_to_conversation(
                conversation_id=conversation_id,
                message={
                    "type": "messages_read",
                    "data": {
                        "conversation_id": conversation_id,
                        "user_id": current_user.id,
                        "message_ids": read_msg_ids,
                        "read_at": now.isoformat()
                    }
                },
                member_ids=member_ids,
                exclude_user_id=current_user.id
            )

    return [_format_message_out(m) for m in messages]


@router.post("/conversations/{conversation_id}/messages", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: int,
    req: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a message to a conversation via REST API (fallback / alternative to WS)."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    is_member = any(m.user_id == current_user.id for m in conv.members)
    if not is_member:
        raise HTTPException(status_code=403, detail="You are not a member of this conversation.")

    if not req.content or not req.content.strip():
        raise HTTPException(status_code=400, detail="Message content cannot be empty.")

    # Determine initial status
    member_ids = [m.user_id for m in conv.members]
    other_members = [uid for uid in member_ids if uid != current_user.id]
    has_online_member = any(manager.is_user_online(uid) for uid in other_members)
    initial_status = "delivered" if has_online_member else "sent"

    now = datetime.utcnow()
    new_msg = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=req.content.strip(),
        message_type=req.message_type or "text",
        status=initial_status,
        reply_to_id=req.reply_to_id,
        created_at=now,
        updated_at=now,
    )
    db.add(new_msg)
    conv.updated_at = now
    db.commit()
    db.refresh(new_msg)

    formatted = _format_message_out(new_msg)

    # Broadcast new message to other conversation members via WebSocket
    await manager.broadcast_to_conversation(
        conversation_id=conversation_id,
        message={
            "type": "new_message",
            "data": formatted.model_dump(mode="json")
        },
        member_ids=member_ids,
        exclude_user_id=current_user.id
    )

    return formatted


@router.patch("/messages/{message_id}", response_model=MessageOut)
async def edit_message(
    message_id: int,
    req: MessageUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Edit content of an existing message (author only)."""
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")

    if msg.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only message author can edit this message.")

    if not req.content or not req.content.strip():
        raise HTTPException(status_code=400, detail="Message content cannot be empty.")

    msg.content = req.content.strip()
    msg.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(msg)

    formatted = _format_message_out(msg)

    member_ids = [m.user_id for m in msg.conversation.members]
    await manager.broadcast_to_conversation(
        conversation_id=msg.conversation_id,
        message={
            "type": "message_edited",
            "data": formatted.model_dump(mode="json")
        },
        member_ids=member_ids,
    )

    return formatted


@router.delete("/messages/{message_id}", status_code=status.HTTP_200_OK)
async def delete_message(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a message (author or group admin)."""
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")

    conv = msg.conversation
    user_member = next((m for m in conv.members if m.user_id == current_user.id), None)
    is_admin = user_member and user_member.role == "admin"

    if msg.sender_id != current_user.id and not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this message.")

    conversation_id = msg.conversation_id
    member_ids = [m.user_id for m in conv.members]

    db.delete(msg)
    db.commit()

    await manager.broadcast_to_conversation(
        conversation_id=conversation_id,
        message={
            "type": "message_deleted",
            "data": {"message_id": message_id, "conversation_id": conversation_id}
        },
        member_ids=member_ids
    )

    return {"message": "Message deleted successfully", "message_id": message_id}


@router.post("/messages/{message_id}/read", status_code=status.HTTP_200_OK)
async def mark_message_as_read(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Explicitly mark a message as read by current user."""
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")

    conv = msg.conversation
    is_member = any(m.user_id == current_user.id for m in conv.members)
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this conversation.")

    if msg.sender_id == current_user.id:
        return {"message": "Author cannot mark own message as read"}

    existing_read = db.query(MessageRead).filter(
        MessageRead.message_id == message_id,
        MessageRead.user_id == current_user.id
    ).first()

    now = datetime.utcnow()
    if not existing_read:
        read_record = MessageRead(
            message_id=message_id,
            user_id=current_user.id,
            read_at=now
        )
        db.add(read_record)
        msg.status = "read"
        db.commit()

        member_ids = [m.user_id for m in conv.members]
        await manager.broadcast_to_conversation(
            conversation_id=conv.id,
            message={
                "type": "messages_read",
                "data": {
                    "conversation_id": conv.id,
                    "user_id": current_user.id,
                    "message_ids": [message_id],
                    "read_at": now.isoformat()
                }
            },
            member_ids=member_ids,
            exclude_user_id=current_user.id
        )

    return {"message": "Message marked as read", "message_id": message_id}
