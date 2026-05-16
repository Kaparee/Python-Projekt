from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import models, schemas, database, oauth2

router = APIRouter(
    prefix="/events",
    tags=["Events"]
)


def check_time_overlap(db: Session, user_id: int, video_id: str, start_time: float, end_time: float,
                       exclude_event_id: int = None):
    if start_time >= end_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Czas startu musi być mniejszy niż czas końca.")

    query = db.query(models.Event).filter(
        models.Event.user_id == user_id,
        models.Event.video_id == video_id,
        models.Event.start_time < end_time,
        models.Event.end_time > start_time
    )

    if exclude_event_id:
        query = query.filter(models.Event.id != exclude_event_id)

    overlapping_event = query.first()

    if overlapping_event:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Zdarzenie nakłada się na inne istniejące zdarzenie (ID: {overlapping_event.id})."
        )


@router.post("/", response_model=schemas.EventOut, status_code=status.HTTP_201_CREATED)
def create_event(
        event: schemas.EventCreate,
        db: Session = Depends(database.get_db),
        current_user=Depends(oauth2.get_current_user)  # Wymaga zalogowania do tworzenia!
):
    check_time_overlap(db, current_user.id, event.video_id, event.start_time, event.end_time)

    new_event = models.Event(user_id=current_user.id, **event.model_dump())
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return new_event

@router.get("/", response_model=List[schemas.EventOut])
def get_events(
        video_id: str,
        user_id: Optional[int] = None,
        db: Session = Depends(database.get_db),
):
    query = db.query(models.Event).filter(models.Event.video_id == video_id)

    if user_id is not None:
        query = query.filter(models.Event.user_id == user_id)

    return query.order_by(models.Event.start_time.asc()).all()


# UPDATE (KAMIL-04)
@router.put("/{id}", response_model=schemas.EventOut)
def update_event(
        id: int,
        updated_event: schemas.EventUpdate,
        db: Session = Depends(database.get_db),
        current_user=Depends(oauth2.get_current_user)
):
    event_query = db.query(models.Event).filter(models.Event.id == id)
    event = event_query.first()

    if event == None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zdarzenie nie istnieje")

    if event.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Brak uprawnień do edycji")

    # Jeśli aktualizujemy czasy, musimy ponownie sprawdzić walidację nakładania!
    new_start = updated_event.start_time if updated_event.start_time is not None else event.start_time
    new_end = updated_event.end_time if updated_event.end_time is not None else event.end_time

    if updated_event.start_time is not None or updated_event.end_time is not None:
        check_time_overlap(db, current_user.id, event.video_id, new_start, new_end, exclude_event_id=id)

    event_query.update(updated_event.model_dump(exclude_unset=True), synchronize_session=False)
    db.commit()
    return event_query.first()


# DELETE (KAMIL-04)
@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
        id: int,
        db: Session = Depends(database.get_db),
        current_user=Depends(oauth2.get_current_user)
):
    event_query = db.query(models.Event).filter(models.Event.id == id)
    event = event_query.first()

    if event == None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zdarzenie nie istnieje")

    if event.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Brak uprawnień do usunięcia")

    event_query.delete(synchronize_session=False)
    db.commit()
    return {"message": "Usunięto"}