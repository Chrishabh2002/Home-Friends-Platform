from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    current_points = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    group_memberships = relationship("GroupMember", back_populates="user")

class Group(Base):
    __tablename__ = "groups"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    invite_code = Column(String, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    members = relationship("GroupMember", back_populates="group")

class GroupMember(Base):
    __tablename__ = "group_members"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    group_id = Column(String, ForeignKey("groups.id"), index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    role = Column(String, default="member") # admin, member
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="group_memberships")
    group = relationship("Group", back_populates="members")
