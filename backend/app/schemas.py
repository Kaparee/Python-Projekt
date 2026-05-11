from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True


class TagBase(BaseModel):
    name: str

class TagOut(TagBase):
    id: int

    class Config:
        from_attributes = True

class StateOut(TagBase):
    id: int

    class Config:
        from_attributes = True

class EventBase(BaseModel):
    video_id: str
    tag_id: Optional[int] = None
    state_id: Optional[int] = None
    start_time: float = Field(..., ge=0, description="Czas startu w sekundach")
    end_time: float = Field(..., ge=0, description="Czas końca w sekundach")
    comment: Optional[str] = None

class EventCreate(EventBase):
    pass

class EventUpdate(BaseModel):
    tag_id: Optional[int] = None
    state_id: Optional[int] = None
    start_time: Optional[float] = Field(None, ge=0)
    end_time: Optional[float] = Field(None, ge=0)
    comment: Optional[str] = None

class EventOut(EventBase):
    id: int
    user_id: int

    tag: Optional[TagOut] = None
    state: Optional[StateOut] = None

    class Config:
        from_attributes = True