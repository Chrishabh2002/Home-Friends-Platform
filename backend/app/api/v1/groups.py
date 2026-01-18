from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import Group, GroupMember, User
from app.schemas.group import GroupCreate, GroupJoin, GroupResponse, GroupMemberResponse

import random
import string
from typing import List

# Fix for getting current user since I didn't export it in auth.py explicitly in the previous step
# I'll just copy the dependency logic briefly or import it if I updated auth.py. 
# Actually, I defined get_current_user in tasks.py too. I should centralize it.
# For now, I'll import from tasks or re-declare. Re-declaring for speed avoiding circular import hell.

from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from app.core.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user_dep(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401)
    except JWTError:
        raise HTTPException(status_code=401)
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401)
    return user

router = APIRouter()

def generate_invite_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

@router.post("/", response_model=GroupResponse)
def create_group(group: GroupCreate, current_user: User = Depends(get_current_user_dep), db: Session = Depends(get_db)):
    # Check if user already has a group? Optional. Let's allow multiple for now but frontend might restrict.
    
    code = generate_invite_code()
    # Ensure unique code logic could be here
    
    new_group = Group(name=group.name, invite_code=code)
    db.add(new_group)
    db.commit()
    db.refresh(new_group)
    
    # Add creator as admin
    member = GroupMember(group_id=new_group.id, user_id=current_user.id, role="admin")
    db.add(member)
    db.commit()
    
    return new_group

@router.post("/join", response_model=GroupResponse)
def join_group(join_data: GroupJoin, current_user: User = Depends(get_current_user_dep), db: Session = Depends(get_db)):
    group = db.query(Group).filter(Group.invite_code == join_data.invite_code).first()
    if not group:
        raise HTTPException(status_code=404, detail="Invalid invite code")
        
    # Check if already member
    existing = db.query(GroupMember).filter(GroupMember.group_id == group.id, GroupMember.user_id == current_user.id).first()
    if existing:
        return group # Already joined
        
    new_member = GroupMember(group_id=group.id, user_id=current_user.id, role="member")
    db.add(new_member)
    db.commit()
    
    return group

@router.get("/my", response_model=List[GroupResponse])
def get_my_groups(current_user: User = Depends(get_current_user_dep), db: Session = Depends(get_db)):
    # Join queries often better, but lazy loading works too
    memberships = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).all()
    groups = [m.group for m in memberships]
    return groups

@router.get("/{group_id}/members", response_model=List[GroupMemberResponse])
def get_group_members(group_id: str, current_user: User = Depends(get_current_user_dep), db: Session = Depends(get_db)):
    # Check access
    exists = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == current_user.id).first()
    if not exists:
        raise HTTPException(status_code=403, detail="Not a member")
        
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    
    return [
        GroupMemberResponse(
            user_id=m.user.id,
            full_name=m.user.full_name,
            avatar_url=m.user.avatar_url,
            role=m.role,
            points=m.user.current_points
        ) for m in members if m.user is not None
    ]

@router.get("/{group_id}/leaderboard", response_model=List[GroupMemberResponse])
def get_group_leaderboard(group_id: str, current_user: User = Depends(get_current_user_dep), db: Session = Depends(get_db)):
    # Check access
    exists = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == current_user.id).first()
    if not exists:
        raise HTTPException(status_code=403, detail="Not a member")
        
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).join(User).order_by(User.current_points.desc()).all()
    
    return [
        GroupMemberResponse(
            user_id=m.user.id,
            full_name=m.user.full_name,
            avatar_url=m.user.avatar_url,
            role=m.role,
            points=m.user.current_points
        ) for m in members if m.user is not None
    ]
