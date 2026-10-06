from typing import Optional
from pydantic import BaseModel, ConfigDict


class UserSettingsOut(BaseModel):
    id: int
    user_id: int
    read_receipts: bool
    last_seen_privacy: bool
    typing_indicator_privacy: bool
    theme: str
    sound_enabled: bool
    notifications_enabled: bool

    model_config = ConfigDict(from_attributes=True)


class UserSettingsUpdate(BaseModel):
    read_receipts: Optional[bool] = None
    last_seen_privacy: Optional[bool] = None
    typing_indicator_privacy: Optional[bool] = None
    theme: Optional[str] = None
    sound_enabled: Optional[bool] = None
    notifications_enabled: Optional[bool] = None
