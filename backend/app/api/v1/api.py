from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, attendance, test_db

api_router = APIRouter()

# Include routers
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(attendance.router, prefix="/attendance", tags=["attendance"])
api_router.include_router(test_db.router, prefix="/test", tags=["database-testing"])
