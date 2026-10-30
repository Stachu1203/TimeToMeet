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

    group_data = group.model_dump()
    days = group_data.pop("days",[])

    db_group = models.Group(**group_data)

    db.add(db_group)
    db.flush()

    for day_date in days:
        db_day = models.GroupDay(group_id = db_group.id, date=day_date)
        db.add(db_day)

    db.commit()
    db.refresh(db_group)

    return db_group

@app.post("/groups/{group_id}/availabilities", response_model = list[schemas.AvailabilityResponse])
def create_availability(availabilities: list[schemas.AvailabilityCreate],group_id: UUID, db: Session = Depends(get_db)):

    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupa nie istnieje")

    db_availabilities = []

    for av in availabilities:
        if av.start_time >= av.end_time:
            raise HTTPException(status_code=400, detail="Czas rozpoczęcia musi być przed czasem zakończenia")

        start_time_only = av.start_time.time()
        end_time_only = av.end_time.time()

        if start_time_only < group.grid_start_hour or end_time_only > group.grid_end_hour:
            raise HTTPException(
                status_code=400, 
                detail=f"Dostępność wykracza poza ramy czasowe grupy ({group.grid_start_hour} - {group.grid_end_hour})"
            )
    
        db_availabilities.append(models.Availability(**av.model_dump(), group_id=group_id))
    db.add_all(db_availabilities)
    db.commit()

    for db_av in db_availabilities:
        db.refresh(db_av)

    return db_availabilities

@app.get("/groups/{group_id}/heatmap", response_model = schemas.HeatmapResponse)
def get_heatmap(group_id: UUID, db: Session = Depends(get_db)):
    availabilities = db.query(models.Availability).filter(models.Availability.group_id == group_id).all()

    total_participants = db.query(models.Availability.user_id).filter(
        models.Availability.group_id == group_id,
        models.Availability.user_id.isnot(None)
    ).distinct().count()
     
    heatmap_data= calculate_overlaps(availabilities)

    return {
        "total_participants": total_participants,
        "heatmap": heatmap_data
    }
