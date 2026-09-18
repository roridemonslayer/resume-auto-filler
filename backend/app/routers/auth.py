import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.email import send_welcome_email
from app.google_oauth import GoogleAuthNotConfigured, GoogleTokenInvalid, verify_google_credential
from app.models import User
from app.schemas import GoogleAuthIn, GoogleAuthOut, Token, UserCreate, UserLogin, UserOut
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(email=payload.email, hashed_password=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    send_welcome_email(user.email)

    return user


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    token = create_access_token(subject=user.email)
    return Token(access_token=token)


@router.post("/google", response_model=GoogleAuthOut)
def google_auth(payload: GoogleAuthIn, db: Session = Depends(get_db)):
    try:
        email = verify_google_credential(payload.credential)
    except GoogleAuthNotConfigured as e:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google sign-in is not configured on this server",
        ) from e
    except GoogleTokenInvalid as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google credential",
        ) from e

    user = db.query(User).filter(User.email == email).first()
    is_new_user = user is None

    if user is None:
        # OAuth-only account: this password is never used or known to
        # the user, since they always sign in via Google.
        user = User(email=email, hashed_password=hash_password(secrets.token_urlsafe(32)))
        db.add(user)
        db.commit()
        db.refresh(user)
        send_welcome_email(email)

    token = create_access_token(subject=user.email)
    return GoogleAuthOut(access_token=token, is_new_user=is_new_user)
