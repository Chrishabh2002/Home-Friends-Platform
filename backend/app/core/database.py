from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# SQLite for Development (Connects to ./backend/database.db)
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

# Database Optimization for High Traffic
# Supports both SQLite (dev) and PostgreSQL (production)

if "sqlite" in SQLALCHEMY_DATABASE_URL:
    # SQLite Configuration
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, 
        connect_args={"check_same_thread": False},
        pool_pre_ping=True
    )
    
    # Enable SQLite WAL Mode (Crucial for Concurrency)
    from sqlalchemy import event
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA cache_size=10000")
        cursor.execute("PRAGMA temp_store=MEMORY")
        cursor.close()
else:
    # PostgreSQL Configuration (Production)
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_size=20,              # 20 persistent connections
        max_overflow=40,           # +40 overflow = 60 total max
        pool_recycle=3600,         # Recycle connections every hour
        pool_pre_ping=True,        # Verify connections before use
        echo=False                 # Set True for SQL debugging
    )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
