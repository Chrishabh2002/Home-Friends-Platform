from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.reward import Reward, Redemption
from app.models.user import User, GroupMember
from app.schemas.reward import RewardCreate, RewardResponse, RedemptionResponse
from app.api.v1.groups import get_current_user_dep

router = APIRouter()

@router.post("/", response_model=RewardResponse)
def create_reward(reward: RewardCreate, current_user: User = Depends(get_current_user_dep), db: Session = Depends(get_db)):
    membership = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).first()
    if not membership:
        raise HTTPException(status_code=400, detail="User not in group")

    new_reward = Reward(
        title=reward.title,
        description=reward.description,
        cost=reward.cost,
        group_id=membership.group_id
    )
    db.add(new_reward)
    db.commit()
    db.refresh(new_reward)
    return new_reward

@router.get("/", response_model=List[RewardResponse])
def get_rewards(current_user: User = Depends(get_current_user_dep), db: Session = Depends(get_db)):
    membership = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).first()
    if not membership:
        return []

    rewards = db.query(Reward).filter(Reward.group_id == membership.group_id).all()
    return rewards

@router.post("/{reward_id}/claim", response_model=RedemptionResponse)
def claim_reward(reward_id: str, current_user: User = Depends(get_current_user_dep), db: Session = Depends(get_db)):
    reward = db.query(Reward).filter(Reward.id == reward_id).first()
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")
        
    if current_user.current_points < reward.cost:
        raise HTTPException(status_code=400, detail="Not enough points")
        
    # Deduct points
    current_user.current_points -= reward.cost
    
    # Create redemption record
    redemption = Redemption(
        user_id=current_user.id,
        reward_id=reward.id,
        group_id=reward.group_id,
        status="pending" # Wait for parent/admin approval? Or auto-approve? Let's say pending.
    )
    
    db.add(redemption)
    db.add(current_user)
    db.commit()
    db.refresh(redemption)
    return redemption

from app.schemas.reward import RedemptionRead

@router.get("/redemptions/pending", response_model=List[RedemptionRead])
def get_pending_redemptions(current_user: User = Depends(get_current_user_dep), db: Session = Depends(get_db)):
    membership = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).first()
    if not membership: return []
    
    redemptions = db.query(Redemption).filter(Redemption.group_id == membership.group_id, Redemption.status == "pending").all()
    
    results = []
    for r in redemptions:
        results.append(RedemptionRead(
            id=r.id, reward_id=r.reward_id, user_id=r.user_id, status=r.status, created_at=r.created_at,
            user_name=r.user.full_name if r.user else "Unknown",
            reward_title=r.reward.title if r.reward else "Unknown",
            reward_cost=r.reward.cost if r.reward else 0
        ))
    return results

@router.put("/redemptions/{redemption_id}", response_model=RedemptionResponse)
def update_redemption_status(redemption_id: str, status: str, current_user: User = Depends(get_current_user_dep), db: Session = Depends(get_db)):
    membership = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).first()
    if not membership: raise HTTPException(status_code=403, detail="Not authorized")
    
    redemption = db.query(Redemption).filter(Redemption.id == redemption_id).first()
    if not redemption: raise HTTPException(status_code=404, detail="Redemption not found")
    
    if redemption.group_id != membership.group_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    if status == "rejected" and redemption.status != "rejected":
        # Refund points
        user = db.query(User).filter(User.id == redemption.user_id).first()
        # Need cost. access via relationship or query.
        cost = redemption.reward.cost if redemption.reward else 0
        
        if user and cost > 0:
            user.current_points += cost
            db.add(user)
            
    redemption.status = status
    db.commit()
    db.refresh(redemption)
    return redemption
