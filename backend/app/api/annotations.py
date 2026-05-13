from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app import models, schemas
from app.database import get_db
from app.oauth2 import get_current_user

router = APIRouter(prefix="/annotations", tags=["Annotations"])


@router.post("/", response_model=schemas.AnnotationResponse)
def create_annotation(
        annotation: schemas.AnnotationCreate,
        db: Session = Depends(get_db),
        current_user: models.User = Depends(get_current_user)
):
    new_annotation = models.Annotation(
        **annotation.model_dump(),
        user_id=current_user.id
    )
    db.add(new_annotation)
    db.commit()
    db.refresh(new_annotation)
    return new_annotation


@router.get("/{video_id}", response_model=List[schemas.AnnotationResponse])
def get_annotations(
        video_id: int,
        user_id: Optional[int] = None,
        db: Session = Depends(get_db)
):
    query = db.query(models.Annotation).filter(models.Annotation.video_id == video_id)
    if user_id:
        query = query.filter(models.Annotation.user_id == user_id)
    return query.all()

@router.get("/youtube/{youtube_id}", response_model=List[schemas.AnnotationResponse])
def get_annotations_by_youtube_id(
        youtube_id: str,
        user_id: Optional[int] = None,
        db: Session = Depends(get_db)
):
    query = db.query(models.Annotation).join(models.Video).filter(models.Video.youtube_id == youtube_id)
    if user_id:
        query = query.filter(models.Annotation.user_id == user_id)
    return query.all()



@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_annotation(
        id: int,
        db: Session = Depends(get_db),
        current_user: models.User = Depends(get_current_user)
):
    annotation = db.query(models.Annotation).filter(models.Annotation.id == id).first()

    if not annotation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Annotation not found")

    if annotation.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this annotation")

    db.delete(annotation)
    db.commit()
    return None

@router.put("/{id}", response_model=schemas.AnnotationResponse)
def update_annotation(
        id: int,
        annotation_update: schemas.AnnotationUpdate,
        db: Session = Depends(get_db),
        current_user: models.User = Depends(get_current_user)
):
    annotation = db.query(models.Annotation).filter(models.Annotation.id == id).first()

    if not annotation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Annotation not found")

    if annotation.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this annotation")

    annotation.x = annotation_update.x
    annotation.y = annotation_update.y
    annotation.width = annotation_update.width
    annotation.height = annotation_update.height

    db.commit()
    db.refresh(annotation)
    return annotation