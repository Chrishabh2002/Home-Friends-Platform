from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.task import Task, TaskStatus
from app.models.user import User, GroupMember
from app.schemas.task import TaskCreate, TaskResponse, TaskUpdate
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from app.core.config import settings

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

@router.post("/", response_model=TaskResponse)
def create_task(task: TaskCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    membership = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).first()
    if not membership:
        raise HTTPException(status_code=400, detail="User not part of any group")

    new_task = Task(
        title=task.title,
        description=task.description,
        priority=task.priority,
        points=task.points,
        due_date=task.due_date,
        recurrence=task.recurrence,
        assigned_to_id=task.assigned_to_id,  # Assume valid ID or handle error
        created_by_id=current_user.id,
        group_id=membership.group_id
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task

@router.get("/", response_model=List[TaskResponse])
def read_tasks(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    membership = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).first()
    if not membership:
        return []
        
    return db.query(Task).filter(Task.group_id == membership.group_id).offset(skip).limit(limit).all()

from datetime import timedelta, datetime

@router.put("/{task_id}", response_model=TaskResponse)
def update_task_status(task_id: str, status: TaskStatus, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Logic: If moving TO completed FROM non-completed, award points
    if status == TaskStatus.completed and task.status != TaskStatus.completed:
        current_user.current_points += task.points
        db.add(current_user)
        
        # Handle Recurrence
        if task.recurrence:
            delta = None
            if task.recurrence == 'daily': delta = timedelta(days=1)
            elif task.recurrence == 'weekly': delta = timedelta(weeks=1)
            elif task.recurrence == 'monthly': delta = timedelta(days=30)
            
            if delta:
                base_date = task.due_date if task.due_date else datetime.utcnow()
                next_date = base_date + delta
                
                next_task = Task(
                    title=task.title,
                    description=task.description,
                    priority=task.priority,
                    points=task.points,
                    due_date=next_date,
                    recurrence=task.recurrence,
                    assigned_to_id=task.assigned_to_id,
                    created_by_id=task.created_by_id,
                    group_id=task.group_id,
                    status=TaskStatus.pending
                )
                db.add(next_task)

    task.status = status
    db.commit()
    db.refresh(task)
    return task

@router.delete("/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    db.delete(task)
    db.commit()
    return {"message": "Task deleted successfully"}

from fastapi import UploadFile, File
import shutil
import os

@router.post("/{task_id}/proof")
async def upload_task_proof(
    task_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Validate extension
    ext = file.filename.split(".")[-1].lower()
    if ext not in ["jpg", "jpeg", "png", "gif", "webp"]:
        raise HTTPException(status_code=400, detail="Invalid image format")
    
    # Create proof directory
    os.makedirs("app/static/proofs", exist_ok=True)
    
    filename = f"{task_id}_{current_user.id}.{ext}"
    file_path = f"app/static/proofs/{filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    base_url = "http://localhost:8000"
    task.proof_photo_url = f"{base_url}/static/proofs/{filename}"
    task.needs_approval = "pending"
    task.status = TaskStatus.completed  # Mark as completed but pending approval
    
    db.add(task)
    db.commit()
    db.refresh(task)
    
    return {"message": "Proof uploaded, awaiting approval", "proof_url": task.proof_photo_url}

@router.put("/{task_id}/approve")
def approve_task_proof(
    task_id: str,
    approved: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.needs_approval != "pending":
        raise HTTPException(status_code=400, detail="Task not pending approval")
    
    if approved:
        task.needs_approval = "approved"
        task.approved_by_id = current_user.id
        # Award points
        if task.assigned_to_id:
            assignee = db.query(User).filter(User.id == task.assigned_to_id).first()
            if assignee:
                assignee.current_points += task.points
                db.add(assignee)
    else:
        task.needs_approval = "rejected"
        task.status = TaskStatus.pending  # Reset to pending
        task.approved_by_id = current_user.id
    
    db.commit()
    db.refresh(task)
    
    return {"message": f"Task {'approved' if approved else 'rejected'}", "task": task}

@router.get("/pending-approvals", response_model=List[TaskResponse])
def get_pending_approvals(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    membership = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).first()
    if not membership:
        return []
    
    return db.query(Task).filter(
        Task.group_id == membership.group_id,
        Task.needs_approval == "pending"
    ).all()
