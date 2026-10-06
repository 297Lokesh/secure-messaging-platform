from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.schemas.user import UserOut
from app.schemas.message import MessageOut


class ConversationMemberOut(BaseModel):
    id: int
    user_id: int
    role: str
    joined_at: datetime
    user: UserOut

    model_config = ConfigDict(from_attributes=True)


class ConversationCreate(BaseModel):
    type: str = "direct"  # "direct" or "group"
    recipient_user_id: Optional[int] = None  # for direct
    member_user_ids: Optional[List[int]] = None  # for group
    name: Optional[str] = None  # required for group
    avatar_url: Optional[str] = None


class AddMemberRequest(BaseModel):
    user_id: int
    role: str = "member"


class ConversationOut(BaseModel):
    id: int
    type: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    members: List[ConversationMemberOut]
    last_message: Optional[MessageOut] = None
    unread_count: int = 0
    # For direct conversations, easily surface the other party's user info
    other_user: Optional[UserOut] = None

    model_config = ConfigDict(from_attributes=True)


class ConversationDetailOut(ConversationOut):
    messages: List[MessageOut] = []
