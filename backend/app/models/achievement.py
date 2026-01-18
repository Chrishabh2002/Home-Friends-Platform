from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.models.user import generate_uuid

class Achievement(Base):
    __tablename__ = "achievements"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    description = Column(String, nullable=False)
    icon = Column(String, nullable=False)  # emoji
    criteria_type = Column(String, nullable=False)  # tasks_completed, streak_days, points_earned
    criteria_value = Column(Integer, nullable=False)
    
class UserAchievement(Base):
    __tablename__ = "user_achievements"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    achievement_id = Column(String, ForeignKey("achievements.id"), nullable=False)
    earned_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", foreign_keys=[user_id])
    achievement = relationship("Achievement", foreign_keys=[achievement_id])
