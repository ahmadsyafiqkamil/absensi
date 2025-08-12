from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.crud.user import user

router = APIRouter()

@router.get("/test-connection")
async def test_database_connection(db: Session = Depends(get_db)):
    """
    Test database connection
    """
    try:
        # Try to get user count
        users = user.get_all(db, skip=0, limit=1)
        return {
            "status": "success",
            "message": "Database connection successful",
            "user_count": len(users)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database connection failed: {str(e)}"
        )

@router.get("/init-db")
async def initialize_database(db: Session = Depends(get_db)):
    """
    Initialize database tables
    """
    try:
        from app.core.database_init import init_db
        init_db()
        return {
            "status": "success",
            "message": "Database tables initialized successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database initialization failed: {str(e)}"
        )
