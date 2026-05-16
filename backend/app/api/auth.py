from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schemas, utils
from app.database import get_db
from fastapi.security.oauth2 import OAuth2PasswordRequestForm
from app.oauth2 import create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # sprawdzamy czy taki gosc juz jest
    existing_user = db.query(models.User).filter(
        (models.User.email == user.email) | (models.User.username == user.username)
    ).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="Email lub nazwa zajeta")

    hashed_password = utils.hash_password(user.password)
    new_user = models.User(
        email=user.email,
        username=user.username,
        password_hash=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user_obj = db.query(models.User).filter(
        (models.User.email == form_data.username) | (models.User.username == form_data.username)
    ).first()

    if user_obj == None:
        raise HTTPException(status_code=403, detail="Zle dane")
        
    if not utils.verify_password(form_data.password, user_obj.password_hash):
        raise HTTPException(status_code=403, detail="Zle dane")

    token_data = {"user_id": user_obj.id}
    token = create_access_token(data=token_data)

    return {"access_token": token, "token_type": "bearer"}

@router.get("/user", response_model=schemas.UserResponse)
def info(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.delete("/user")
def delete_account(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db.delete(current_user)
    db.commit()
    return {"message": "Account successfully deleted"}