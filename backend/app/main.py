from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
from app.api.v1 import auth, tasks, groups, expenses, chat, rewards, achievements, pantry, smart

# Create Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Home & Friends Platform API",
    description="Backend for the Smart Home & Friends Productivity Platform",
    version="1.0.0",
)

# CORS Configuration
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "https://home-friends-platform.vercel.app",
    "https://home-friends-platform.onrender.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(tasks.router, prefix="/api/v1/tasks", tags=["tasks"])
app.include_router(groups.router, prefix="/api/v1/groups", tags=["groups"])
app.include_router(expenses.router, prefix="/api/v1/expenses", tags=["expenses"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["chat"])
app.include_router(rewards.router, prefix="/api/v1/rewards", tags=["rewards"])
app.include_router(achievements.router, prefix="/api/v1/achievements", tags=["achievements"])
app.include_router(pantry.router, prefix="/api/v1/pantry", tags=["pantry"])
app.include_router(smart.router, prefix="/api/v1/smart", tags=["smart"])

from fastapi.staticfiles import StaticFiles
import os

# Create static directories
os.makedirs("app/static/avatars", exist_ok=True)
os.makedirs("app/static/proofs", exist_ok=True)

app.mount("/static", StaticFiles(directory="app/static"), name="static")

@app.get("/")
async def root():
    return {"message": "Welcome to the Home & Friends Platform API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
