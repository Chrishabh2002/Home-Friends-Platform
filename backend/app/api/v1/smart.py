from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import re
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.user import User, GroupMember
from app.models.task import Task, TaskStatus
from app.models.expense import Expense
from app.api.v1.tasks import get_current_user

router = APIRouter()

class SmartCommand(BaseModel):
    text: str

@router.post("/process")
def process_command(cmd: SmartCommand, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    text = cmd.text.lower().strip()
    membership = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).first()
    if not membership: raise HTTPException(status_code=400, detail="No group")
    
    response_data = {"type": "unknown", "message": "I didn't understand that."}

    # 1. EXPENSE DETECTION: "spent 50 on food" or "buy milk 5"
    expense_match = re.search(r'(spent|paid|buy|bought)\s+(\$?[\d\.]+)\s+(on|for)?\s*(.*)', text)
    if not expense_match:
        # Try "buy milk 50" format
        expense_match = re.search(r'(buy|bought)\s+(.*)\s+for\s+(\$?[\d\.]+)', text)

    if expense_match:
        # Simple extraction logic, improved
        try:
            # Check which group matched
            parts = text.split()
            amount = 0
            desc = "Expense"
            
            # Find number
            for p in parts:
                if p.replace('$','').replace('.','').isdigit():
                    amount = float(p.replace('$',''))
                    break
            
            # Rough description extraction
            desc = text.replace(str(int(amount)), "").replace("$", "").replace("spent", "").replace("paid", "").replace("on", "").replace("for", "").strip()
            
            new_expense = Expense(
                description=desc.capitalize(),
                amount=amount,
                category="General",
                paid_by_id=current_user.id,
                group_id=membership.group_id
            )
            db.add(new_expense)
            db.commit()
            return {"type": "expense", "message": f"Recorded expense: ${amount} for {desc}"}
        except:
            pass

    # 2. TASK DETECTION
    # "remind me to clean tomorrow"
    # "add task clean kitchen"
    if "remind" in text or "task" in text or "todo" in text or "need to" in text:
        task_title = text.replace("remind me to", "").replace("add task", "").replace("need to", "").strip()
        
        due_date = None
        if "tomorrow" in task_title:
            due_date = datetime.utcnow() + timedelta(days=1)
            task_title = task_title.replace("tomorrow", "").strip()
        
        new_task = Task(
            title=task_title.capitalize(),
            created_by_id=current_user.id,
            group_id=membership.group_id,
            status=TaskStatus.pending,
            points=10
        )
        if due_date:
            new_task.due_date = due_date
            
        db.add(new_task)
        db.commit()
        return {"type": "task", "message": f"Created task: {task_title}"}

    return response_data
