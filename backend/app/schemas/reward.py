from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class RewardBase(BaseModel):
    title: str
    description: Optional[str] = None
    cost: int

class RewardCreate(RewardBase):
    pass

class RewardResponse(RewardBase):
    id: str
    group_id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class RedemptionResponse(BaseModel):
    id: str
    reward_id: str
    user_id: str
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class RedemptionRead(RedemptionResponse):
    user_name: Optional[str] = None
    reward_title: Optional[str] = None
    reward_cost: Optional[int] = None
