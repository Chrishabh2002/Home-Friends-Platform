from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db, SessionLocal
from app.models.chat import Message
from app.models.user import User

from app.core.security import settings
from jose import jwt, JWTError
from typing import List, Dict
import json

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # group_id -> List[WebSocket]
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, group_id: str):
        await websocket.accept()
        if group_id not in self.active_connections:
            self.active_connections[group_id] = []
        self.active_connections[group_id].append(websocket)

    def disconnect(self, websocket: WebSocket, group_id: str):
        if group_id in self.active_connections:
            self.active_connections[group_id].remove(websocket)
            if not self.active_connections[group_id]:
                del self.active_connections[group_id]

    async def broadcast(self, message: dict, group_id: str):
        if group_id in self.active_connections:
            for connection in self.active_connections[group_id]:
                await connection.send_json(message)

manager = ConnectionManager()

# Helper to get user from token in WebSocket
def get_user_from_token(token: str, db: Session):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        return db.query(User).filter(User.id == user_id).first()
    except JWTError:
        return None

@router.websocket("/{group_id}")
async def websocket_endpoint(websocket: WebSocket, group_id: str, token: str):
    # Since we can't inject DB into WS easily, use SessionLocal
    db = SessionLocal()
    user = get_user_from_token(token, db)
    
    if not user:
        await websocket.close(code=4003)
        return

    await manager.connect(websocket, group_id)
    try:
        # Send history? Optional. For now let's just do real-time.
        # Actually, let's load last 50 messages
        messages = db.query(Message).filter(Message.group_id == group_id).order_by(Message.created_at.asc()).limit(50).all()
        for msg in messages:
            await websocket.send_json({
                "content": msg.content,
                "sender_id": msg.sender_id,
                "sender_name": msg.sender.full_name, # Lazy load might fail if session closed? No, session open.
                "created_at": str(msg.created_at)
            })


        while True:
            data = await websocket.receive_text()
            
            # Parse JSON message
            try:
                msg_data = json.loads(data)
                content = msg_data.get("content", data)
            except:
                content = data
            
            # Save to DB
            new_msg = Message(content=content, sender_id=user.id, group_id=group_id)
            db.add(new_msg)
            db.commit()
            
            # Broadcast
            await manager.broadcast({
                "content": content,
                "sender_id": user.id,
                "sender_name": user.full_name,
                "created_at": str(new_msg.created_at)
            }, group_id)
            
            # Check for AI trigger
            if content.lower().startswith("homie") or "@homie" in content.lower():
                await handle_ai_command(content, group_id, db, manager, user)

            
    except WebSocketDisconnect:
        manager.disconnect(websocket, group_id)
    finally:
        db.close()

from app.core.ai import get_homie_response
from app.models.task import Task
from app.models.expense import Expense

async def handle_ai_command(content: str, group_id: str, db: Session, manager: ConnectionManager, user: User):
    # Trigger AI
    ai_res = await get_homie_response(content)
    
    # Send AI Text reply
    if ai_res.get("text"):
        ai_msg = Message(content=ai_res["text"], sender_id="ai_homie", group_id=group_id)
        # We need a dummy user for AI or just handle sender_id="ai_homie" in frontend
        # For DB integrity, we might need a system user or nullable sender_id.
        # Let's assume sender_id can be 'ai_homie' if column allows string (it does).
        # But foreign key constraint on users.id might fail.
        # Fix: Create a system user or make sender_id nullable?
        # Better: use a dedicated System User created at startup.
        # Short term hack for demo: Find ANY user or use the current user as proxy? No.
        # Let's just broadcast without saving to DB for AI right now to avoid FK error, 
        # OR handle "sender_id=None" if model allows.
        # Model user.py: sender_id = Column(String, ForeignKey("users.id"))
        # we can't insert random string.
        # Workaround: Retrieve the "System AI" user. If not exists, create it.
        
        system_user = db.query(User).filter(User.email == "homie@ai.com").first()
        if not system_user:
            # Create on fly (not ideal for async but okay for demo)
            from app.models.user import User
            system_user = User(email="homie@ai.com", full_name="Homie 🤖", hashed_password="x", avatar_url="https://api.dicebear.com/7.x/bottts/svg?seed=Homie")
            db.add(system_user)
            db.commit()
            db.refresh(system_user)
            
        ai_msg = Message(content=ai_res["text"], sender_id=system_user.id, group_id=group_id)
        db.add(ai_msg)
        db.commit()
        
        await manager.broadcast({
            "content": ai_msg.content,
            "sender_id": system_user.id,
            "sender_name": system_user.full_name,
            "created_at": str(ai_msg.created_at)
        }, group_id)

    # Process Tools
    for tool in ai_res.get("tool_calls", []):
        if tool["name"] == "create_task":
            args = tool["parameters"] if "parameters" in tool else tool["args"]
            new_task = Task(
                title=args.get("title"),
                priority=args.get("priority", "medium"),
                points=args.get("points", 10),
                group_id=group_id,
                created_by_id=user.id # Created by user who asked
            )
            db.add(new_task)
            db.commit()
            
            # Announce
            check_msg = Message(content=f"✅ Created task: {new_task.title}", sender_id=system_user.id, group_id=group_id)
            db.add(check_msg)
            db.commit()
            await manager.broadcast({
                "content": check_msg.content,
                "sender_id": system_user.id,
                "sender_name": system_user.full_name,
                "created_at": str(check_msg.created_at)
            }, group_id)
            
        elif tool["name"] == "create_expense":
            args = tool["parameters"] if "parameters" in tool else tool["args"]
            new_expense = Expense(
                 description=args.get("description"),
                 amount=float(args.get("amount")),
                 category=args.get("category", "General"),
                 group_id=group_id,
                 paid_by_id=user.id
            )
            db.add(new_expense)
            db.commit()
            
            check_msg = Message(content=f"💸 Added expense: ${new_expense.amount} for {new_expense.description}", sender_id=system_user.id, group_id=group_id)
            db.add(check_msg)
            db.commit()
            await manager.broadcast({
                "content": check_msg.content,
                 "sender_id": system_user.id,
                "sender_name": system_user.full_name,
                "created_at": str(check_msg.created_at)
            }, group_id)

from fastapi import HTTPException
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user_from_token(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@router.get("/{group_id}/history")
async def get_chat_history(
    group_id: str,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Get last 50 messages for a group"""
    messages = db.query(Message).filter(
        Message.group_id == group_id
    ).order_by(Message.created_at.desc()).limit(50).all()
    
    # Reverse to show oldest first
    messages.reverse()
    
    result = []
    for msg in messages:
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        result.append({
            "content": msg.content,
            "sender_id": msg.sender_id,
            "sender_name": sender.full_name if sender else "Unknown",
            "created_at": str(msg.created_at)
        })
    
    return result
