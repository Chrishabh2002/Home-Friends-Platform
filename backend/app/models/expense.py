from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Boolean, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.models.user import generate_uuid

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(String, primary_key=True, default=generate_uuid)
    description = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(String, nullable=False) # e.g. Grocery, Rent
    
    # Subscription Tracking
    is_subscription = Column(Boolean, default=False)
    billing_day = Column(Integer, nullable=True) # Day of month (1-31)
    
    paid_by_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    group_id = Column(String, ForeignKey("groups.id"), nullable=False, index=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    payer = relationship("User", foreign_keys=[paid_by_id])
    group = relationship("Group", foreign_keys=[group_id])
