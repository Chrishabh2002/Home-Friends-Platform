from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.models.user import generate_uuid

class Reward(Base):
    __tablename__ = "rewards"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    cost = Column(Integer, nullable=False) # Points required
    
    group_id = Column(String, ForeignKey("groups.id"), nullable=False)
    
    # Optional: If we want to track one-time vs reusable rewards
    is_recurring = Column(Boolean, default=True) 
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    group = relationship("Group", foreign_keys=[group_id])
    
class Redemption(Base):
    __tablename__ = "redemptions"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    reward_id = Column(String, ForeignKey("rewards.id"), nullable=False)
    group_id = Column(String, ForeignKey("groups.id"), nullable=False)
    
    status = Column(String, default="pending") # pending, approved, rejected
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", foreign_keys=[user_id])
    reward = relationship("Reward", foreign_keys=[reward_id])
