"""
Database Migration Script: SQLite to PostgreSQL
This script copies all data from SQLite to PostgreSQL
"""

import os
from sqlalchemy import create_engine, MetaData, Table
from sqlalchemy.orm import sessionmaker

# Source: SQLite
SQLITE_URL = "sqlite:///./database_v2.db"

# Target: PostgreSQL (update with your credentials)
POSTGRES_URL = os.getenv("DATABASE_URL", "postgresql://postgres:homepass123@localhost:5432/homedb")

def migrate_database():
    print("🔄 Starting database migration...")
    
    # Create engines
    sqlite_engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
    postgres_engine = create_engine(POSTGRES_URL)
    
    # Create sessions
    SqliteSession = sessionmaker(bind=sqlite_engine)
    PostgresSession = sessionmaker(bind=postgres_engine)
    
    sqlite_session = SqliteSession()
    postgres_session = PostgresSession()
    
    # Reflect metadata from SQLite
    metadata = MetaData()
    metadata.reflect(bind=sqlite_engine)
    
    print(f"📊 Found {len(metadata.tables)} tables to migrate")
    
    # Create all tables in PostgreSQL
    print("🏗️  Creating tables in PostgreSQL...")
    from app.core.database import Base
    Base.metadata.create_all(bind=postgres_engine)
    
    # Migrate data table by table
    table_order = ['users', 'groups', 'group_members', 'tasks', 'expenses', 'messages', 
                   'pantry_items', 'shopping_items', 'achievements', 'user_achievements']
    
    for table_name in table_order:
        if table_name not in metadata.tables:
            print(f"⏭️  Skipping {table_name} (doesn't exist)")
            continue
            
        print(f"📦 Migrating {table_name}...")
        
        table = Table(table_name, metadata, autoload_with=sqlite_engine)
        
        # Read from SQLite
        sqlite_data = sqlite_session.execute(table.select()).fetchall()
        
        if not sqlite_data:
            print(f"   ⚠️  No data in {table_name}")
            continue
        
        # Insert into PostgreSQL
        try:
            for row in sqlite_data:
                postgres_session.execute(table.insert().values(**dict(row._mapping)))
            postgres_session.commit()
            print(f"   ✅ Migrated {len(sqlite_data)} rows")
        except Exception as e:
            print(f"   ❌ Error: {e}")
            postgres_session.rollback()
    
    sqlite_session.close()
    postgres_session.close()
    
    print("✅ Migration complete!")
    print("\n📝 Next steps:")
    print("1. Update .env: DATABASE_URL=postgresql://postgres:homepass123@localhost:5432/homedb")
    print("2. Restart backend server")
    print("3. Test the application")

if __name__ == "__main__":
    try:
        migrate_database()
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        print("\nMake sure PostgreSQL is running:")
        print("  - Docker: docker ps")
        print("  - Local: Check PostgreSQL service in Windows Services")
