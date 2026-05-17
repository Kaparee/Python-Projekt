from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import models, schemas, database, oauth2

router = APIRouter(
    prefix="/events",
    tags=["Events"]
)


def check_time_overlap(db: Session, user_id: int, video_id, start_time: float, end_time: float,
                       exclude_event_id: int = None):
    if start_time >= end_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Czas startu musi być mniejszy niż czas końca.")

    # Resolve video_id if it's a youtube_id string
    if isinstance(video_id, str) and not video_id.isdigit():
        video = db.query(models.Video).filter(models.Video.youtube_id == video_id).first()
        if not video:
            raise HTTPException(status_code=404, detail="Wideo nie istnieje")
        resolved_video_id = video.id
    else:
        resolved_video_id = int(video_id)

    query = db.query(models.Event).filter(
        models.Event.user_id == user_id,
        models.Event.video_id == resolved_video_id,
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
    video = db.query(models.Video).filter(models.Video.youtube_id == event.video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Wideo nie istnieje")

    check_time_overlap(db, current_user.id, video.id, event.start_time, event.end_time)

    event_data = event.model_dump()
    event_data["video_id"] = video.id

    new_event = models.Event(user_id=current_user.id, **event_data)
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    
    return schemas.EventOut(
        id=new_event.id,
        user_id=new_event.user_id,
        video_id=event.video_id,
        tag_id=new_event.tag_id,
        state_id=new_event.state_id,
        start_time=new_event.start_time,
        end_time=new_event.end_time,
        comment=new_event.comment,
        tag=new_event.tag,
        state=new_event.state
    )

@router.get("/", response_model=List[schemas.EventOut])
def get_events(
        video_id: str,
        user_id: Optional[int] = None,
        db: Session = Depends(database.get_db),
):
    video = db.query(models.Video).filter(models.Video.youtube_id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Wideo nie istnieje")

    query = db.query(models.Event).filter(models.Event.video_id == video.id)

    if user_id is not None:
        query = query.filter(models.Event.user_id == user_id)

    db_events = query.order_by(models.Event.start_time.asc()).all()
    events_out = []
    for e in db_events:
        events_out.append(schemas.EventOut(
            id=e.id,
            user_id=e.user_id,
            video_id=video_id,
            tag_id=e.tag_id,
            state_id=e.state_id,
            start_time=e.start_time,
            end_time=e.end_time,
            comment=e.comment,
            tag=e.tag,
            state=e.state
        ))
    return events_out


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
    
    updated = event_query.first()
    video = db.query(models.Video).filter(models.Video.id == updated.video_id).first()
    youtube_id = video.youtube_id if video else str(updated.video_id)
    
    return schemas.EventOut(
        id=updated.id,
        user_id=updated.user_id,
        video_id=youtube_id,
        tag_id=updated.tag_id,
        state_id=updated.state_id,
        start_time=updated.start_time,
        end_time=updated.end_time,
        comment=updated.comment,
        tag=updated.tag,
        state=updated.state
    )


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