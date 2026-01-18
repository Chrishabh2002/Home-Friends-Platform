from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserLogin, Token
from app.core.security import get_password_hash, verify_password, create_access_token

router = APIRouter()

@router.post("/signup", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = User(
        email=user.email,
        full_name=user.full_name or "New User",
        hashed_password=hashed_password,
        avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=" + user.email # Auto-generate cartoon avatar
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
def login_for_access_token(user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    access_token = create_access_token(subject=user.id)
    return {"access_token": access_token, "token_type": "bearer"}

from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from app.core.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

from pydantic import BaseModel

class UserUpdate(BaseModel):
    full_name: str | None = None
    avatar_url: str | None = None

@router.put("/me", response_model=UserResponse)
def update_user_profile(updates: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if updates.full_name:
        current_user.full_name = updates.full_name
    if updates.avatar_url:
        current_user.avatar_url = updates.avatar_url
    
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

@router.delete("/me")
def delete_user_account(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Delete user (cascading should handle related data if configured)
    db.delete(current_user)
    db.commit()
    return {"message": "Account deleted successfully"}

from fastapi import UploadFile, File
import shutil
import os

@router.post("/me/avatar")
async def upload_avatar(file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Validate extension
    ext = file.filename.split(".")[-1].lower()
    if ext not in ["jpg", "jpeg", "png", "gif", "webp"]:
        raise HTTPException(status_code=400, detail="Invalid image format")
        
    filename = f"{current_user.id}.{ext}"
    file_path = f"app/static/avatars/{filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Update URL
    # Hardcoding localhost for demo, in prod use Env var
    base_url = "http://localhost:8000"
    current_user.avatar_url = f"{base_url}/static/avatars/{filename}"
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    
    return {"avatar_url": current_user.avatar_url}

