from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models.user import User
from app.models.settings import UserSettings
from app.schemas.auth import (
    RegisterRequest,
    VerifyOtpRequest,
    VerifyRegistrationResponse,
    LoginRequest,
    TokenResponse,
)
from app.schemas.user import UserOut
from app.auth.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    MOCK_OTP_CODE,
)
from app.auth.deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account with username OR phone number. Returns mock OTP instructions."""
    username = req.username.lower().strip() if req.username else None
    phone = req.phone.strip() if req.phone else None

    if not username and not phone:
        raise HTTPException(
            status_code=400,
            detail="Please provide either a username or a phone number.",
        )

    # If only one is provided, derive a valid unique counterpart for DB constraints
    if not phone and username:
        clean_user = "".join(filter(str.isalnum, username)) or "user"
        phone = f"+1{abs(hash(clean_user)) % 1000000000:010d}"
    if not username and phone:
        clean_phone = "".join(filter(str.isdigit, phone)) or "9999"
        username = f"user_{clean_phone[-6:]}"

    # Check if username or phone exists
    existing = db.query(User).filter(
        or_(User.username == username, User.phone == phone)
    ).first()
    if existing:
        if existing.username == username:
            raise HTTPException(status_code=400, detail="Username is already taken.")
        else:
            raise HTTPException(status_code=400, detail="Phone number is already registered.")

    hashed_pw = get_password_hash(req.password)
    new_user = User(
        username=username,
        phone=phone,
        password_hash=hashed_pw,
        display_name=req.display_name.strip(),
        avatar_url=req.avatar_url,
        is_online=False,
        last_seen=datetime.utcnow(),
    )
    db.add(new_user)
    db.flush()

    # Create default user settings
    default_settings = UserSettings(user_id=new_user.id)
    db.add(default_settings)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User registered successfully. Please verify with OTP.",
        "username": new_user.username,
        "phone": new_user.phone,
        "mock_otp": MOCK_OTP_CODE,
        "requires_otp": True,
    }


@router.post("/verify-registration-otp", response_model=VerifyRegistrationResponse)
def verify_registration_otp(req: VerifyOtpRequest, db: Session = Depends(get_db)):
    """Verify registration mock OTP code (123456) without creating a session."""
    if req.otp != MOCK_OTP_CODE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid OTP code. For testing, please use mock code: {MOCK_OTP_CODE}",
        )

    identifier = req.phone_or_username.lower().strip()
    user = db.query(User).filter(
        or_(User.username == identifier, User.phone == req.phone_or_username.strip())
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    return VerifyRegistrationResponse(
        verified=True,
        message="Account verified successfully! Please sign in with your password.",
        username=user.username,
        phone=user.phone,
    )


@router.post("/validate-credentials")
def validate_credentials(req: LoginRequest, db: Session = Depends(get_db)):
    """Validate user credentials before proceeding to OTP verification."""
    identifier = req.username_or_phone.lower().strip()
    user = db.query(User).filter(
        or_(User.username == identifier, User.phone == req.username_or_phone.strip())
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/phone or password.",
        )

    if not req.password or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/phone or password.",
        )

    return {
        "requires_otp": True,
        "mock_otp": MOCK_OTP_CODE,
        "phone": user.phone,
        "username": user.username,
        "display_name": user.display_name,
        "message": f"Credentials verified. Enter OTP code: {MOCK_OTP_CODE}",
    }


@router.post("/request-login-otp")
def request_login_otp(req: LoginRequest, db: Session = Depends(get_db)):
    """Alias for validate-credentials."""
    return validate_credentials(req, db)


@router.post("/resend-otp")
def resend_otp(req: VerifyOtpRequest, db: Session = Depends(get_db)):
    """Resend mock OTP code."""
    identifier = req.phone_or_username.lower().strip()
    user = db.query(User).filter(
        or_(User.username == identifier, User.phone == req.phone_or_username.strip())
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    return {
        "message": f"New OTP sent to {user.phone}. For testing, use code: {MOCK_OTP_CODE}",
        "mock_otp": MOCK_OTP_CODE,
        "phone": user.phone,
    }


@router.post("/verify-otp", response_model=TokenResponse)
def verify_otp(req: VerifyOtpRequest, db: Session = Depends(get_db)):
    """Verify mock OTP code (123456) and return JWT token."""
    if req.otp != MOCK_OTP_CODE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid OTP code. For testing, please use mock code: {MOCK_OTP_CODE}",
        )

    identifier = req.phone_or_username.lower().strip()
    user = db.query(User).filter(
        or_(User.username == identifier, User.phone == req.phone_or_username.strip())
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    access_token = create_access_token(subject=user.id)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )



@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Login with username or phone number, password, and optional OTP."""
    identifier = req.username_or_phone.lower().strip()
    user = db.query(User).filter(
        or_(User.username == identifier, User.phone == req.username_or_phone.strip())
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/phone or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if req.password and not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/phone or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if req.otp and req.otp != MOCK_OTP_CODE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid OTP code. For testing, please use mock code: {MOCK_OTP_CODE}",
        )

    access_token = create_access_token(subject=user.id)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Logout current user."""
    current_user.is_online = False
    current_user.last_seen = datetime.utcnow()
    db.commit()
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """Return currently authenticated user profile."""
    return current_user
