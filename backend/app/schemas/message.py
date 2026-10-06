from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.schemas.user import UserOut


class MessageCreate(BaseModel):
    content: str
    message_type: str = "text"
    reply_to_id: Optional[int] = None


class MessageReplyOut(BaseModel):
    id: int
    content: str
    sender_id: int
    sender_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MessageReadOut(BaseModel):
    id: int
    message_id: int
    user_id: int
    read_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    content: str
    message_type: str
    status: str  # sent, delivered, read
    reply_to_id: Optional[int] = None
    reply_to: Optional[MessageReplyOut] = None
    created_at: datetime
    updated_at: datetime
    sender: UserOut
    reads: List[MessageReadOut] = []

    model_config = ConfigDict(from_attributes=True)


class MessageUpdate(BaseModel):
    content: str
