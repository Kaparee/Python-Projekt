from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schemas, database
from app.oauth2 import get_current_user
from typing import List

router = APIRouter(prefix="/videos", tags=["Annotations"])

@router.get("/{youtube_id}/annotations", response_model=List[schemas.AnnotationResponse])
def get_annotations(youtube_id: str, user_id: int, db: Session = Depends(database.get_db)):
    video = db.query(models.Video).filter(models.Video.youtube_id == youtube_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
        
    annotations = db.query(models.Annotation).filter(
        models.Annotation.video_id == video.id,
        models.Annotation.user_id == user_id
    ).all()
    
    return [a for a in annotations if a.x != -1.0]

@router.post("/{youtube_id}/annotations")
def save_annotations(youtube_id: str, payload: List[schemas.AnnotationBase], db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    video = db.query(models.Video).filter(models.Video.youtube_id == youtube_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
        
    db.query(models.Annotation).filter(
        models.Annotation.video_id == video.id,
        models.Annotation.user_id == current_user.id
    ).delete()
    
    new_annotations = []
    for ann in payload:
        new_annotations.append(models.Annotation(
            video_id=video.id,
            user_id=current_user.id,
            timestamp=ann.timestamp,
            x=ann.x,
            y=ann.y,
            width=ann.width,
            height=ann.height,
            label=ann.label,
            color=ann.color
        ))
    
    if new_annotations:
        db.add_all(new_annotations)
    else:
        dummy = models.Annotation(
            video_id=video.id,
            user_id=current_user.id,
            timestamp=-1.0,
            x=-1.0,
            y=-1.0,
            width=0.0,
            height=0.0
        )
        db.add(dummy)
        
    db.commit()
    return {"message": "Saved successfully"}