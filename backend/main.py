from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app import models
from app.database import engine, SessionLocal
from app.api import auth, videos, annotations, events, tags

models.Base.metadata.create_all(bind=engine)

def seed_data():
    db = SessionLocal()
    try:
        default_tags = [
            {"name": "Pieszy", "color_hex": "#00FF00"},
            {"name": "Samochód", "color_hex": "#FF0000"},
            {"name": "Rowerzysta", "color_hex": "#FFFF00"},
            {"name": "Sygnalizacja Świetlna", "color_hex": "#FF00FF"},
            {"name": "Znak Drogowy", "color_hex": "#00FFFF"}
        ]
        for tag_data in default_tags:
            existing = db.query(models.Tag).filter(models.Tag.name == tag_data["name"]).first()
            if not existing:
                db.add(models.Tag(**tag_data))

        default_states = [
            {"name": "Zielone Światło", "color_hex": "#00FF00"},
            {"name": "Czerwone Światło", "color_hex": "#FF0000"},
            {"name": "Ruch", "color_hex": "#0000FF"},
            {"name": "Zatrzymanie", "color_hex": "#FFFF00"},
            {"name": "Skręt", "color_hex": "#FF00FF"},
            {"name": "Wtargnięcie", "color_hex": "#FFA500"},
            {"name": "Przejście", "color_hex": "#00FFFF"}
        ]
        for state_data in default_states:
            existing = db.query(models.State).filter(models.State.name == state_data["name"]).first()
            if not existing:
                db.add(models.State(**state_data))

        db.commit()
        print("Database successfully seeded with default tags and states.")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

seed_data()

app = FastAPI(title="Video Annotation System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(videos.router)
app.include_router(videos.user_router)
app.include_router(annotations.router)
app.include_router(annotations.global_router)
app.include_router(events.router)
app.include_router(tags.router)