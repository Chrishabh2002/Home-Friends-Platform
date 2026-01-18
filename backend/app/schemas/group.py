from pydantic import BaseModel
from typing import List, Optional

class GroupBase(BaseModel):
    name: str

class GroupCreate(GroupBase):
    pass

class GroupJoin(BaseModel):
    invite_code: str

class GroupResponse(GroupBase):
    id: str
    invite_code: str
    member_count: int = 1
    
    class Config:
        from_attributes = True

class GroupMemberResponse(BaseModel):
    user_id: str
    full_name: str
    avatar_url: Optional[str] = None
    role: str
    points: int = 0
