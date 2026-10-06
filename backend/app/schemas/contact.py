from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.user import UserOut


class ContactCreate(BaseModel):
    contact_user_id: int


class ContactOut(BaseModel):
    id: int
    user_id: int
    contact_user_id: int
    contact_user: UserOut
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
