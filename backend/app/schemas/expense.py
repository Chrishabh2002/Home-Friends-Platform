from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ExpenseBase(BaseModel):
    description: str
    amount: float
    category: str

class ExpenseCreate(ExpenseBase):
    is_subscription: bool = False
    billing_day: Optional[int] = None

class ExpenseResponse(ExpenseBase):
    id: str
    created_at: datetime
    paid_by_id: str
    is_subscription: bool
    billing_day: Optional[int]
    group_id: str
    
    # We might want to return payer name too, but let's keep it simple for now or use a join
    paid_by_name: Optional[str] = None 

    class Config:
        from_attributes = True
