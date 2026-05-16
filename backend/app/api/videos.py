import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schemas, database
from app.oauth2 import get_current_user
from typing import List

router = APIRouter(prefix="/videos", tags=["Videos"])
user_router = APIRouter(prefix="/user", tags=["User"])

def extract_youtube_id(url: str):
    # to jest z internetu skopiowane do wyciagania id
    regex = r"(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^\"&?\/\s]{11})"
    match = re.search(regex, url)
    if not match:
        raise HTTPException(status_code=400, detail="Zly link yt")
    return match.group(1)

@router.post("", response_model=schemas.VideoResponse)
def create_video(video: schemas.VideoCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    youtube_id = extract_youtube_id(video.url)
    
    # sprawdzam czy film juz jest w bazie zeby nie duplikowac
    db_video = db.query(models.Video).filter(models.Video.youtube_id == youtube_id).first()
    
    if db_video == None:
        # jak nie ma to dodaje nowy
        db_video = models.Video(youtube_id=youtube_id, added_by_user_id=current_user.id, title=video.title)
        db.add(db_video)
        db.commit()
        db.refresh(db_video)
    else:
        # jak jest to tylko zmieniam mu wlasciciela jak nikt nie ma
        if db_video.added_by_user_id == None:
            db_video.added_by_user_id = current_user.id
        if video.title and video.title != 'Untitled Project':
            db_video.title = video.title
            
        has_annotation = db.query(models.Annotation).filter(
            models.Annotation.video_id == db_video.id,
            models.Annotation.user_id == current_user.id
        ).first()
        
        # dodajemy sztuczna adnotacje zeby sie pokazywalo
        if has_annotation == None and db_video.added_by_user_id != current_user.id:
            dummy_annotation = models.Annotation(
                video_id=db_video.id,
                user_id=current_user.id,
                timestamp=-1.0,
                x=-1.0,
                y=-1.0,
                width=0.0,
                height=0.0
            )
            db.add(dummy_annotation)
            
        db.commit()
        db.refresh(db_video)
    return db_video

@router.delete("/{video_id}")
def delete_video(video_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    db_video = db.query(models.Video).filter(models.Video.id == video_id, models.Video.added_by_user_id == current_user.id).first()
    if not db_video:
        raise HTTPException(status_code=404, detail="Video not found or you are not the owner")
    db_video.added_by_user_id = None
    db.commit()
    return {"message": "Video removed from profile"}

@user_router.get("/videos", response_model=List[schemas.VideoResponse])
def get_user_videos(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    videos = db.query(models.Video).filter(models.Video.added_by_user_id == current_user.id).all()
    # Jeśli użytkownik zaczął analizować film (dodał adnotacje), pokaż go w profilu
    annotated_videos = db.query(models.Video).join(models.Annotation).filter(models.Annotation.user_id == current_user.id).all()
    all_videos = {v.id: v for v in videos + annotated_videos}.values()
    return list(all_videos)

@router.get("/{youtube_id}", response_model=schemas.VideoResponse)
def get_video_by_youtube_id(youtube_id: str, db: Session = Depends(database.get_db)):
    db_video = db.query(models.Video).filter(models.Video.youtube_id == youtube_id).first()
    if not db_video:
        raise HTTPException(status_code=404, detail="Video not found")
    return db_video

@router.get("/{youtube_id}/versions")
def get_video_versions(youtube_id: str, db: Session = Depends(database.get_db)):
    users = db.query(models.User).join(models.Annotation).join(models.Video). \
        filter(models.Video.youtube_id == youtube_id).distinct().all()

    if not users:
        return []

    return users