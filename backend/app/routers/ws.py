import json
import logging
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.user import User
from app.models.contact import Contact
from app.models.conversation import Conversation, ConversationMember
from app.models.message import Message, MessageRead
from app.schemas.message import MessageOut, MessageReplyOut, MessageReadOut
from app.schemas.user import UserOut
from app.auth.security import decode_access_token
from app.websocket.manager import manager

logger = logging.getLogger("websocket")
router = APIRouter(tags=["WebSockets"])


def _format_ws_message(msg: Message) -> dict:
    """Format Message ORM into dictionary for WS transmission."""
    reply_to_out = None
    if msg.reply_to:
        reply_to_out = {
            "id": msg.reply_to.id,
            "content": msg.reply_to.content,
            "sender_id": msg.reply_to.sender_id,
            "sender_name": msg.reply_to.sender.display_name if msg.reply_to.sender else None,
        }

    reads_out = [
        {"id": r.id, "message_id": r.message_id, "user_id": r.user_id, "read_at": r.read_at.isoformat()}
        for r in msg.reads
    ]

    return {
        "id": msg.id,
        "conversation_id": msg.conversation_id,
        "sender_id": msg.sender_id,
        "content": msg.content,
        "message_type": msg.message_type,
        "status": msg.status,
        "reply_to_id": msg.reply_to_id,
        "reply_to": reply_to_out,
        "created_at": msg.created_at.isoformat(),
        "updated_at": msg.updated_at.isoformat(),
        "sender": {
            "id": msg.sender.id,
            "username": msg.sender.username,
            "phone": msg.sender.phone,
            "display_name": msg.sender.display_name,
            "avatar_url": msg.sender.avatar_url,
            "is_online": True,
            "last_seen": msg.sender.last_seen.isoformat(),
            "created_at": msg.sender.created_at.isoformat(),
        },
        "reads": reads_out,
    }


def _get_user_contact_ids(db: Session, user_id: int) -> List[int]:
    """Get all user IDs who have this user as a contact or who are in shared conversations."""
    contacts = db.query(Contact.user_id).filter(Contact.contact_user_id == user_id).all()
    c_ids = [c[0] for c in contacts]
    return c_ids


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: int,
    token: Optional[str] = Query(None)
):
    """
    Main WebSocket endpoint:
    - Validates token against user_id
    - Accepts connection
    - Handles incoming real-time events (send_message, typing, read_receipt, ping)
    - Broadcasts presence changes
    """
    # 1. Authenticate token
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    sub = decode_access_token(token)
    if not sub or int(sub) != user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # 2. Accept and register connection
        await manager.connect(user_id, websocket)

        # Update user presence in DB
        user.is_online = True
        db.commit()

        # Broadcast online status
        contact_ids = _get_user_contact_ids(db, user_id)
        await manager.broadcast_status(
            user_id=user_id,
            is_online=True,
            last_seen_iso=user.last_seen.isoformat(),
            target_user_ids=contact_ids
        )

        # Send initial connected acknowledgement with online user list
        await websocket.send_text(json.dumps({
            "type": "connection_established",
            "data": {
                "user_id": user_id,
                "online_users": list(manager.get_online_user_ids())
            }
        }))

        # 3. Main event loop
        while True:
            raw_text = await websocket.receive_text()
            try:
                event = json.loads(raw_text)
            except Exception:
                continue

            event_type = event.get("type")

            # Heartbeat ping
            if event_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
                continue

            # SEND MESSAGE EVENT
            elif event_type == "send_message":
                conv_id = event.get("conversation_id")
                content = event.get("content", "").strip()
                msg_type = event.get("message_type", "text")
                reply_to_id = event.get("reply_to_id")
                temp_id = event.get("temp_id")

                if not conv_id or not content:
                    continue

                # Validate membership
                conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
                if not conv:
                    continue
                member_ids = [m.user_id for m in conv.members]
                if user_id not in member_ids:
                    continue

                # Determine if any recipient is currently online
                other_members = [uid for uid in member_ids if uid != user_id]
                has_online_member = any(manager.is_user_online(uid) for uid in other_members)
                msg_status = "delivered" if has_online_member else "sent"

                now = datetime.utcnow()
                new_msg = Message(
                    conversation_id=conv_id,
                    sender_id=user_id,
                    content=content,
                    message_type=msg_type,
                    status=msg_status,
                    reply_to_id=reply_to_id,
                    created_at=now,
                    updated_at=now
                )
                db.add(new_msg)
                conv.updated_at = now
                db.commit()
                db.refresh(new_msg)

                msg_data = _format_ws_message(new_msg)
                if temp_id:
                    msg_data["temp_id"] = temp_id

                # Acknowledge to sender with confirmation
                await websocket.send_text(json.dumps({
                    "type": "message_sent_ack",
                    "data": msg_data
                }))

                # Broadcast new_message to all other members
                await manager.broadcast_to_conversation(
                    conversation_id=conv_id,
                    message={
                        "type": "new_message",
                        "data": msg_data
                    },
                    member_ids=member_ids,
                    exclude_user_id=user_id
                )

            # TYPING EVENT
            elif event_type == "typing":
                conv_id = event.get("conversation_id")
                is_typing = bool(event.get("is_typing", False))
                if not conv_id:
                    continue

                conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
                if not conv:
                    continue

                member_ids = [m.user_id for m in conv.members]
                if user_id not in member_ids:
                    continue

                # Broadcast typing notification to conversation members
                await manager.broadcast_to_conversation(
                    conversation_id=conv_id,
                    message={
                        "type": "user_typing",
                        "data": {
                            "conversation_id": conv_id,
                            "user_id": user_id,
                            "display_name": user.display_name,
                            "is_typing": is_typing
                        }
                    },
                    member_ids=member_ids,
                    exclude_user_id=user_id
                )

            # READ RECEIPTS EVENT
            elif event_type == "read_receipt":
                conv_id = event.get("conversation_id")
                message_ids = event.get("message_ids", [])
                if not conv_id or not message_ids:
                    continue

                conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
                if not conv:
                    continue
                member_ids = [m.user_id for m in conv.members]
                if user_id not in member_ids:
                    continue

                now = datetime.utcnow()
                updated_ids = []
                for mid in message_ids:
                    msg = db.query(Message).filter(Message.id == mid, Message.conversation_id == conv_id).first()
                    if msg and msg.sender_id != user_id:
                        existing = db.query(MessageRead).filter(
                            MessageRead.message_id == mid,
                            MessageRead.user_id == user_id
                        ).first()
                        if not existing:
                            db.add(MessageRead(message_id=mid, user_id=user_id, read_at=now))
                            msg.status = "read"
                            updated_ids.append(mid)

                if updated_ids:
                    db.commit()
                    # Broadcast messages_read update
                    await manager.broadcast_to_conversation(
                        conversation_id=conv_id,
                        message={
                            "type": "messages_read",
                            "data": {
                                "conversation_id": conv_id,
                                "user_id": user_id,
                                "message_ids": updated_ids,
                                "read_at": now.isoformat()
                            }
                        },
                        member_ids=member_ids,
                        exclude_user_id=user_id
                    )

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user {user_id}")
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
    finally:
        # 4. Handle Disconnect
        went_offline = manager.disconnect(user_id, websocket)
        if went_offline:
            try:
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    user.is_online = False
                    user.last_seen = datetime.utcnow()
                    db.commit()
                    contact_ids = _get_user_contact_ids(db, user_id)
                    await manager.broadcast_status(
                        user_id=user_id,
                        is_online=False,
                        last_seen_iso=user.last_seen.isoformat(),
                        target_user_ids=contact_ids
                    )
            except Exception as e:
                logger.error(f"Error handling user offline state: {e}")
        db.close()
