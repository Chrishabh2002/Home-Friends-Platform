from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.task import TaskPriority, TaskStatus

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Optional[TaskPriority] = TaskPriority.medium
    points: int = 10
    due_date: Optional[datetime] = None
    recurrence: Optional[str] = None
    assigned_to_id: Optional[str] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(TaskBase):
    status: Optional[TaskStatus] = None

class TaskResponse(TaskBase):
    id: str
    created_by_id: str
    status: Optional[TaskStatus] = TaskStatus.pending
    created_at: datetime
    proof_photo_url: Optional[str] = None
    needs_approval: Optional[str] = "no"
    approved_by_id: Optional[str] = None

    class Config:
        from_attributes = True
