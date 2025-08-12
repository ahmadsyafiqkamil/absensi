from pydantic import BaseModel
from typing import Optional
from enum import Enum
from datetime import datetime

class UserRole(str, Enum):
    admin = "admin"
    hs = "hs"
    staff = "staff"


class UserBase(BaseModel):
    username: str
    email: str
    full_name: str
    is_active: bool = True
    is_admin: bool = False
    role: UserRole

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    role: Optional[UserRole] = None
    password: Optional[str] = None
    
class UserInDB(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class User(UserInDB):
    pass
