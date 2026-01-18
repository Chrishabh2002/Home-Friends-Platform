from sqlalchemy import Column, String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.models.user import generate_uuid

class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=generate_uuid)
    content = Column(String, nullable=False)
    
    sender_id = Column(String, ForeignKey("users.id"), nullable=False)
    group_id = Column(String, ForeignKey("groups.id"), nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    sender = relationship("User", foreign_keys=[sender_id])
    group = relationship("Group", foreign_keys=[group_id])
