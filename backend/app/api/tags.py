from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import models, schemas, database

router = APIRouter(prefix="/tags", tags=["Tags & States"])

@router.get("/", response_model=List[schemas.TagOut])
def get_all_tags(video_id: Optional[str] = None, db: Session = Depends(database.get_db)):
    if video_id:
        video = db.query(models.Video).filter(models.Video.youtube_id == video_id).first()
        if video:
            return db.query(models.Tag).filter(
                (models.Tag.video_id == None) | (models.Tag.video_id == video.id)
            ).all()
    return db.query(models.Tag).filter(models.Tag.video_id == None).all()

@router.get("/states", response_model=List[schemas.StateOut])
def get_all_states(video_id: Optional[str] = None, db: Session = Depends(database.get_db)):
    if video_id:
        video = db.query(models.Video).filter(models.Video.youtube_id == video_id).first()
        if video:
            return db.query(models.State).filter(
                (models.State.video_id == None) | (models.State.video_id == video.id)
            ).all()
    return db.query(models.State).filter(models.State.video_id == None).all()

@router.post("/", response_model=schemas.TagOut, status_code=status.HTTP_201_CREATED)
def create_tag(tag: schemas.TagBase, db: Session = Depends(database.get_db)):
    tag_data = tag.model_dump()
    video_id_str = tag_data.pop("video_id", None)
    
    resolved_video_id = None
    if video_id_str:
        video = db.query(models.Video).filter(models.Video.youtube_id == video_id_str).first()
        if video:
            resolved_video_id = video.id
            
    if not tag_data.get("color_hex"):
        tag_data["color_hex"] = "#00FF00"
        
    new_tag = models.Tag(video_id=resolved_video_id, **tag_data)
    db.add(new_tag)
    db.commit()
    db.refresh(new_tag)
    return new_tag

@router.post("/states", response_model=schemas.StateOut, status_code=status.HTTP_201_CREATED)
def create_state(state: schemas.TagBase, db: Session = Depends(database.get_db)):
    state_data = state.model_dump()
    video_id_str = state_data.pop("video_id", None)
    
    resolved_video_id = None
    if video_id_str:
        video = db.query(models.Video).filter(models.Video.youtube_id == video_id_str).first()
        if video:
            resolved_video_id = video.id
            
    if not state_data.get("color_hex"):
        state_data["color_hex"] = "#FF0000"
        
    new_state = models.State(video_id=resolved_video_id, **state_data)
    db.add(new_state)
    db.commit()
    db.refresh(new_state)
    return new_state