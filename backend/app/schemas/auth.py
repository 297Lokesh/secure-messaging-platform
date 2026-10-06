from typing import Optional
from pydantic import BaseModel, Field, model_validator


class RegisterRequest(BaseModel):
    username: Optional[str] = Field(None, max_length=50)
    phone: Optional[str] = Field(None, max_length=20)
    password: str = Field(..., min_length=6)
    display_name: str = Field(..., min_length=1, max_length=100)
    avatar_url: Optional[str] = None


class VerifyOtpRequest(BaseModel):
    phone_or_username: Optional[str] = None
    phone: Optional[str] = None
    username: Optional[str] = None
    username_or_phone: Optional[str] = None
    otp: str

    @model_validator(mode="before")
    @classmethod
    def resolve_identifier(cls, values):
        if isinstance(values, dict):
            ident = (
                values.get("phone_or_username")
                or values.get("username_or_phone")
                or values.get("phone")
                or values.get("username")
            )
            if ident:
                values["phone_or_username"] = str(ident)
        return values


class VerifyRegistrationResponse(BaseModel):
    verified: bool = True
    message: str
    username: str
    phone: str


class LoginRequest(BaseModel):
    username_or_phone: str
    password: Optional[str] = None
    otp: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class TokenData(BaseModel):
    user_id: Optional[int] = None
    username: Optional[str] = None


from app.schemas.user import UserOut  # noqa: E402
TokenResponse.model_rebuild()

