from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class UserBase(BaseModel):
    username: str
    phone: str
    display_name: str
    avatar_url: Optional[str] = None


class UserOut(UserBase):
    id: int
    is_online: bool = False
    last_seen: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None


class UserSearchOut(BaseModel):
    id: int
    username: str
    phone: str
    display_name: str
    avatar_url: Optional[str] = None
    is_online: bool = False
    last_seen: datetime
    is_contact: bool = False

    model_config = ConfigDict(from_attributes=True)
