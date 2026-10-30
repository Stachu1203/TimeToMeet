from fastapi import FastAPI,Depends,HTTPException
from sqlalchemy.orm import Session
import models
import schemas
from database import engine, SessionLocal
from datetime import datetime
from logic import *
from uuid import UUID

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Backend działa!"}


@app.post("/groups", response_model = schemas.GroupResponse)
def create_group(group: schemas.GroupCreate, db: Session = Depends(get_db)):
    db_group = models.Group(**group.model_dump())

    db.add(db_group)
    db.commit()

    db.refresh(db_group)

    return db_group

@app.post("/groups/{group_id}/availabilities", response_model = schemas.AvailabilityResponse)
def create_availability(availability: schemas.AvailabilityCreate,group_id: UUID, db: Session = Depends(get_db)):

    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupa nie istnieje")

    if availability.start_time >= availability.end_time:
        raise HTTPException(status_code=400, detail="Czas rozpoczęcia musi być przed czasem zakończenia")

    start_time_only = availability.start_time.time()
    end_time_only = availability.end_time.time()

    if start_time_only < group.grid_start_hour or end_time_only > group.grid_end_hour:
        raise HTTPException(
            status_code=400, 
            detail=f"Dostępność wykracza poza ramy czasowe grupy ({group.grid_start_hour} - {group.grid_end_hour})"
        )
    
    db_availability = models.Availability(**availability.model_dump(), group_id=group_id)
    db.add(db_availability)
    db.commit()

    db.refresh(db_availability)

    return db_availability

@app.get("/groups/{group_id}/heatmap", response_model = dict[datetime, int])
def get_heatmap(group_id: UUID, db: Session = Depends(get_db)):
    availabilities = db.query(models.Availability).filter(models.Availability.group_id == group_id).all()
     
    heatmap= calculate_overlaps(availabilities)

    return heatmap
