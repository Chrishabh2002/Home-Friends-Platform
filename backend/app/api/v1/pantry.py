from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.models.pantry import PantryItem, ShoppingItem
from app.models.user import User, GroupMember
from app.api.v1.tasks import get_current_user

router = APIRouter()

# Schemas
class PantryItemBase(BaseModel):
    name: str
    quantity: int = 1
    category: str = "General"
    expiration_date: Optional[datetime] = None

class PantryItemCreate(PantryItemBase):
    pass

class ShoppingItemBase(BaseModel):
    name: str

class ShoppingItemCreate(ShoppingItemBase):
    pass

# Endpoints
@router.get("/items", response_model=List[dict])
def get_pantry(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    membership = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).first()
    if not membership: return []
    return db.query(PantryItem).filter(PantryItem.group_id == membership.group_id).all()

@router.post("/items")
def add_pantry_item(item: PantryItemCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    membership = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).first()
    if not membership: raise HTTPException(status_code=400, detail="No group")
    
    new_item = PantryItem(**item.dict(), group_id=membership.group_id)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.delete("/items/{item_id}")
def delete_pantry_item(item_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(PantryItem).filter(PantryItem.id == item_id).first()
    if item:
        db.delete(item)
        db.commit()
    return {"message": "Deleted"}

# Shopping List
@router.get("/shopping-list", response_model=List[dict])
def get_shopping_list(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    membership = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).first()
    if not membership: return []
    return db.query(ShoppingItem).filter(ShoppingItem.group_id == membership.group_id).all()

@router.post("/shopping-list")
def add_shopping_item(item: ShoppingItemCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    membership = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).first()
    if not membership: raise HTTPException(status_code=400, detail="No group")
    
    new_item = ShoppingItem(name=item.name, group_id=membership.group_id, added_by_id=current_user.id)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.put("/shopping-list/{item_id}/toggle")
def toggle_shopping_item(item_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(ShoppingItem).filter(ShoppingItem.id == item_id).first()
    if item:
        item.is_checked = not item.is_checked
        db.commit()
    return item

@router.post("/shopping-list/{item_id}/move-to-pantry")
def move_shopping_to_pantry(item_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(ShoppingItem).filter(ShoppingItem.id == item_id).first()
    if not item: raise HTTPException(status_code=404, detail="Item not found")
    
    # Create in Pantry
    p_item = PantryItem(name=item.name, group_id=item.group_id, category="General")
    db.add(p_item)
    
    # Remove from Shopping List
    db.delete(item)
    
    db.commit()
    return {"message": "Moved to pantry"}
