from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, database

router = APIRouter(prefix="/tags", tags=["Tags & States"])

@router.get("/", response_model=List[schemas.TagOut])
def get_all_tags(db: Session = Depends(database.get_db)):
    return db.query(models.Tag).all()

@router.get("/states", response_model=List[schemas.StateOut])
def get_all_states(db: Session = Depends(database.get_db)):
    return db.query(models.State).all()

@router.post("/", response_model=schemas.TagOut, status_code=status.HTTP_201_CREATED)
def create_tag(tag: schemas.TagBase, db: Session = Depends(database.get_db)):
    new_tag = models.Tag(**tag.model_dump())
    db.add(new_tag)
    db.commit()
    db.refresh(new_tag)
    return new_tag