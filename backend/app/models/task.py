from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.models.user import generate_uuid
import enum

class TaskPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"

class TaskStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"

class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    assigned_to_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    created_by_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    group_id = Column(String, ForeignKey("groups.id"), nullable=False, index=True)
    
    priority = Column(String, default=TaskPriority.medium)
    status = Column(String, default=TaskStatus.pending)
    points = Column(Integer, default=10)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    due_date = Column(DateTime(timezone=True), nullable=True)
    recurrence = Column(String, nullable=True) # daily, weekly, monthly
    
    # Photo Proof System
    proof_photo_url = Column(String, nullable=True)
    needs_approval = Column(String, default="no")  # "no", "pending", "approved", "rejected"
    approved_by_id = Column(String, ForeignKey("users.id"), nullable=True)

    # Relationships
    assignee = relationship("User", foreign_keys=[assigned_to_id])
    creator = relationship("User", foreign_keys=[created_by_id])
    approver = relationship("User", foreign_keys=[approved_by_id])

