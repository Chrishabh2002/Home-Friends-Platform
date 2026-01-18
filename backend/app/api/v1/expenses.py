from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.expense import Expense
from app.models.user import User, GroupMember
from app.schemas.expense import ExpenseCreate, ExpenseResponse
from app.api.v1.groups import get_current_user_dep

router = APIRouter()

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from app.core.email import send_bill_reminder

@router.post("/", response_model=ExpenseResponse)
def create_expense(
    expense: ExpenseCreate, 
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user_dep), 
    db: Session = Depends(get_db)
):
    # Find user's group (Assuming 1 group for now as per dashboard logic)
    membership = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).first()
    if not membership:
        raise HTTPException(status_code=400, detail="User is not in a group")
        
    new_expense = Expense(
        description=expense.description,
        amount=expense.amount,
        category=expense.category,
        is_subscription=expense.is_subscription,
        billing_day=expense.billing_day,
        paid_by_id=current_user.id,
        group_id=membership.group_id
    )
    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)

    # Send email reminder confirmation for subscription
    if new_expense.is_subscription:
        background_tasks.add_task(
            send_bill_reminder,
            current_user.email,
            current_user.full_name,
            new_expense.description,
            new_expense.amount,
            f"Day {new_expense.billing_day} of every month"
        )
    return new_expense

@router.get("/", response_model=List[ExpenseResponse])
def read_expenses(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_dep)):
    membership = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).first()
    if not membership:
        return []

    expenses = db.query(Expense).filter(Expense.group_id == membership.group_id)\
                 .order_by(Expense.created_at.desc())\
                 .offset(skip).limit(limit).all()
    
    # Enrich with payer name manually or via SQL (Pydantic can accept extra fields if configured)
    # For now, simplistic return
    return expenses

@router.get("/balances")
def get_balances(current_user: User = Depends(get_current_user_dep), db: Session = Depends(get_db)):
    membership = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).first()
    if not membership: return {"total": 0, "debts": []}
    
    group_id = membership.group_id
    
    # Get all members
    raw_members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    # Filter out orphaned members just in case
    members = [m for m in raw_members if m.user is not None]
    num_members = len(members)
    if num_members == 0: return {"total": 0, "debts": []}
    
    # Get all expenses
    expenses = db.query(Expense).filter(Expense.group_id == group_id).all()
    
    total_spent = sum(e.amount for e in expenses)
    share_per_person = total_spent / num_members if num_members > 0 else 0
    
    # Calculate Paid per person
    paid_by_user = {m.user_id: 0.0 for m in members}
    user_names = {m.user_id: m.user.full_name for m in members}
    
    for e in expenses:
        # If payer is no longer in group, we still validly count their payment, but we need to handle the Key
        if e.paid_by_id not in paid_by_user:
             paid_by_user[e.paid_by_id] = 0.0
             # Fetch name if possible, or use Unknown
             if e.paid_by_id not in user_names:
                 user_names[e.paid_by_id] = "Ex-Member"
        
        paid_by_user[e.paid_by_id] += e.amount
        
    # Calculate Net
    balances = {}
    for uid, paid in paid_by_user.items():
        # Only calculate share/debt for CURRENT members. 
        # Ex-members who paid get credit (positive balance) but don't owe share (subtract 0? No, they don't owe share)
        # Simplified logic: If they are in the group, they owe a share.
        
        is_member = any(m.user_id == uid for m in members)
        owe_amount = share_per_person if is_member else 0
        
        balances[uid] = paid - owe_amount
        
    # Create Transfers (Greedy algorithm)
    debtors = []
    creditors = []
    
    for uid, bal in balances.items():
        if bal < -0.01: debtors.append({'id': uid, 'amount': -bal})
        elif bal > 0.01: creditors.append({'id': uid, 'amount': bal})
        
    debtors.sort(key=lambda x: x['amount'], reverse=True)
    creditors.sort(key=lambda x: x['amount'], reverse=True)
    
    transfers = []
    i = 0
    j = 0
    while i < len(debtors) and j < len(creditors):
        debt = debtors[i]
        credit = creditors[j]
        
        amount = min(debt['amount'], credit['amount'])
        
        if amount > 0:
            transfers.append({
                "from": user_names.get(debt['id'], "Unknown"),
                "to": user_names.get(credit['id'], "Unknown"),
                "amount": round(amount, 2)
            })
            
        debtors[i]['amount'] -= amount
        creditors[j]['amount'] -= amount
        
        if debtors[i]['amount'] < 0.01: i += 1
        if creditors[j]['amount'] < 0.01: j += 1
        
    return {
        "total": round(total_spent, 2),
        "share_per_person": round(share_per_person, 2),
        "transfers": transfers
    }

@router.post("/settle")
def settle_expenses(current_user: User = Depends(get_current_user_dep), db: Session = Depends(get_db)):
    membership = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).first()
    if not membership: raise HTTPException(status_code=400)
    
    # Delete all expenses for group
    db.query(Expense).filter(Expense.group_id == membership.group_id).delete()
    db.commit()
    return {"message": "All settled up!"}
