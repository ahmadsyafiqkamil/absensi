from app.core.database import engine, Base
from app.models.user import User

def init_db():
    """Initialize database and create tables"""
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully!")
    except Exception as e:
        print(f"❌ Error creating database tables: {e}")

if __name__ == "__main__":
    init_db()
