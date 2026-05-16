from pydantic import BaseModel, EmailStr
from datetime import datetime

class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True

class AnnotationBase(BaseModel):
    timestamp: float
    x: float
    y: float
    width: float
    height: float
    label: str | None = None
    color: str | None = None

class AnnotationCreate(AnnotationBase):
    video_id: int

class AnnotationUpdate(BaseModel):
    x: float
    y: float
    width: float
    height: float

class AnnotationResponse(AnnotationBase):
    id: int
    video_id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class VideoCreate(BaseModel):
    url: str
    title: str | None = None

class VideoResponse(BaseModel):
    id: int
    youtube_id: str
    title: str | None = None
    added_by_user_id: int | None = None
    created_at: datetime

    class Config:
        from_attributes = True