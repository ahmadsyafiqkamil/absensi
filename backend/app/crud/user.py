from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from typing import List, Optional
from passlib.context import CryptContext

class CRUDUser:
    def __init__(self) -> None:
        self._pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    def _hash_password(self, plain_password: str) -> str:
        return self._pwd_context.hash(plain_password)

    def get(self, db: Session, user_id: int) -> Optional[User]:
        """Get user by ID"""
        return db.query(User).filter(User.id == user_id).first()
    
    def get_by_username(self, db: Session, username: str) -> Optional[User]:
        """Get user by username"""
        return db.query(User).filter(User.username == username).first()
    
    def get_by_email(self, db: Session, email: str) -> Optional[User]:
        """Get user by email"""
        return db.query(User).filter(User.email == email).first()
    
    def get_all(self, db: Session, skip: int = 0, limit: int = 100) -> List[User]:
        """Get all users with pagination"""
        return db.query(User).offset(skip).limit(limit).all()
    
    def get_active_users(self, db: Session, skip: int = 0, limit: int = 100) -> List[User]:
        """Get all active users"""
        return db.query(User).filter(User.is_active == True).offset(skip).limit(limit).all()
    
    def create(self, db: Session, user: UserCreate) -> User:
        """Create new user"""
        # Hash password before storing
        db_user = User(
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            hashed_password=self._hash_password(user.password),
            is_active=user.is_active,
            is_admin=user.is_admin,
            role=user.role
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
    
    def update(self, db: Session, user_id: int, user: UserUpdate) -> Optional[User]:
        """Update user"""
        db_user = self.get(db, user_id)
        if not db_user:
            return None
        
        update_data = user.dict(exclude_unset=True)
        # Handle password hashing if provided
        if "password" in update_data and update_data["password"]:
            db_user.hashed_password = self._hash_password(update_data.pop("password"))
        for field, value in update_data.items():
            setattr(db_user, field, value)
        
        db.commit()
        db.refresh(db_user)
        return db_user
    
    def delete(self, db: Session, user_id: int) -> bool:
        """Delete user"""
        db_user = self.get(db, user_id)
        if not db_user:
            return False
        
        db.delete(db_user)
        db.commit()
        return True

user = CRUDUser()
