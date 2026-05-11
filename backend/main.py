from fastapi import FastAPI
from app import models
from app.database import engine
from app.api import auth, videos, events

models.Base.metadata.create_all(bind=engine)
app = FastAPI()

app.include_router(auth.router)
app.include_router(videos.router)

app = FastAPI(title="Video Annotation System")

app.include_router(auth.router)
app.include_router(videos.router)

app.include_router(events.router)