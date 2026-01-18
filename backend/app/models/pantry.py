from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.models.user import generate_uuid

class PantryItem(Base):
    __tablename__ = "pantry_items"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    quantity = Column(Integer, default=1)
    expiration_date = Column(DateTime(timezone=True), nullable=True)
    category = Column(String, default="General") # Dairy, Produce, etc.
    
    group_id = Column(String, ForeignKey("groups.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    group = relationship("Group", foreign_keys=[group_id])

class ShoppingItem(Base):
    __tablename__ = "shopping_list"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    is_checked = Column(Boolean, default=False)
    added_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    
    group_id = Column(String, ForeignKey("groups.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    group = relationship("Group", foreign_keys=[group_id])
    adder = relationship("User", foreign_keys=[added_by_id])
