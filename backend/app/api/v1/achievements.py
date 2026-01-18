from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.achievement import Achievement, UserAchievement
from app.models.user import User
from app.models.task import Task
from pydantic import BaseModel

router = APIRouter()

from app.api.v1.tasks import get_current_user

class AchievementResponse(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    earned_at: str | None = None
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[AchievementResponse])
def get_all_achievements(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    achievements = db.query(Achievement).all()
    user_achievements = db.query(UserAchievement).filter(UserAchievement.user_id == current_user.id).all()
    
    earned_ids = {ua.achievement_id: ua.earned_at for ua in user_achievements}
    
    result = []
    for ach in achievements:
        result.append({
            "id": ach.id,
            "name": ach.name,
            "description": ach.description,
            "icon": ach.icon,
            "earned_at": str(earned_ids.get(ach.id)) if ach.id in earned_ids else None
        })
    
    return result

@router.post("/check")
def check_achievements(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Check and unlock achievements for current user"""
    
    # Count completed tasks
    completed_tasks = db.query(Task).filter(
        Task.assigned_to_id == current_user.id,
        Task.status == "completed"
    ).count()
    
    # Get all achievements
    achievements = db.query(Achievement).all()
    newly_earned = []
    
    for ach in achievements:
        # Check if already earned
        existing = db.query(UserAchievement).filter(
            UserAchievement.user_id == current_user.id,
            UserAchievement.achievement_id == ach.id
        ).first()
        
        if existing:
            continue
        
        # Check criteria
        earned = False
        if ach.criteria_type == "tasks_completed" and completed_tasks >= ach.criteria_value:
            earned = True
        elif ach.criteria_type == "points_earned" and current_user.current_points >= ach.criteria_value:
            earned = True
        
        if earned:
            new_achievement = UserAchievement(
                user_id=current_user.id,
                achievement_id=ach.id
            )
            db.add(new_achievement)
            newly_earned.append(ach)
    
    db.commit()
    
    return {
        "newly_earned": [{"name": a.name, "icon": a.icon, "description": a.description} for a in newly_earned],
        "count": len(newly_earned)
    }

@router.post("/seed")
def seed_achievements(db: Session = Depends(get_db)):
    """Seed initial achievements"""
    
    achievements_data = [
        {"name": "First Steps", "description": "Complete your first task", "icon": "👶", "criteria_type": "tasks_completed", "criteria_value": 1},
        {"name": "Getting Started", "description": "Complete 5 tasks", "icon": "🌱", "criteria_type": "tasks_completed", "criteria_value": 5},
        {"name": "Task Master", "description": "Complete 25 tasks", "icon": "🏆", "criteria_type": "tasks_completed", "criteria_value": 25},
        {"name": "Legend", "description": "Complete 50 tasks", "icon": "👑", "criteria_type": "tasks_completed", "criteria_value": 50},
        {"name": "Point Collector", "description": "Earn 100 points", "icon": "💰", "criteria_type": "points_earned", "criteria_value": 100},
        {"name": "Wealthy", "description": "Earn 500 points", "icon": "💎", "criteria_type": "points_earned", "criteria_value": 500},
    ]
    
    for ach_data in achievements_data:
        existing = db.query(Achievement).filter(Achievement.name == ach_data["name"]).first()
        if not existing:
            ach = Achievement(**ach_data)
            db.add(ach)
    
    db.commit()
    return {"message": "Achievements seeded successfully"}
