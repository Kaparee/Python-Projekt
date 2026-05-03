from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas, database

router = APIRouter(prefix="/videos", tags=["Videos"])


@router.get("/{youtube_id}/versions")
def get_video_versions(youtube_id: str, db: Session = Depends(database.get_db)):
    users = db.query(models.User).join(models.Annotation).join(models.Video). \
        filter(models.Video.youtube_id == youtube_id).distinct().all()

    if not users:
        return []

    return users