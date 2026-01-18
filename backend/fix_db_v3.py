import sqlite3
import os

DB_FILE = "database_v2.db"

def fix_db_v3():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # 1. Add subscription columns to expenses
    try:
        cursor.execute("ALTER TABLE expenses ADD COLUMN is_subscription BOOLEAN DEFAULT 0")
        print("Added is_subscription to expenses")
    except: pass
    
    try:
        cursor.execute("ALTER TABLE expenses ADD COLUMN billing_day INTEGER NULL")
        print("Added billing_day to expenses")
    except: pass

    # 2. Create Pantry Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pantry_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        expiration_date DATETIME,
        category TEXT DEFAULT 'General',
        group_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(group_id) REFERENCES groups(id)
    )
    """)
    print("Created pantry_items table")

    # 3. Create Shopping List Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS shopping_list (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        is_checked BOOLEAN DEFAULT 0,
        added_by_id TEXT,
        group_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(group_id) REFERENCES groups(id),
        FOREIGN KEY(added_by_id) REFERENCES users(id)
    )
    """)
    print("Created shopping_list table")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    fix_db_v3()
