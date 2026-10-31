from fastapi import FastAPI,Depends,HTTPException
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
import models
import schemas
from database import engine, SessionLocal,get_db
from datetime import datetime
from logic import *
from uuid import UUID
from auth import pwd_context,get_current_user,create_access_token,get_optional_current_user
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import or_

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Backend działa!"}


@app.post("/groups", response_model = schemas.GroupResponse)
def create_group(group: schemas.GroupCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):

    group_data = group.model_dump()
    days = group_data.pop("days",[])

    group_data["creator_id"] = current_user.id

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
def create_availability(availabilities: list[schemas.AvailabilityCreate],group_id: UUID, db: Session = Depends(get_db),current_user:models.User = Depends(get_optional_current_user)):

    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupa nie istnieje")

    if not availabilities:
        raise HTTPException(status_code=400, detail="Lista dostępności nie może być pusta")

    allowed_dates = {day.date for day in group.days}

    if current_user:
        db.query(models.Availability).filter(
            models.Availability.group_id == group_id,
            models.Availability.user_id == current_user.id
        ).delete()
        voter_id = current_user.id
        voter_name = current_user.name
    else:
        guest_name = availabilities[0].voter_name
        if not guest_name or not guest_name.strip():
            raise HTTPException(status_code=400, detail="Goście muszą podać imię (voter_name)")
        guest_user = models.User(name=guest_name.strip())
        db.add(guest_user)
        db.flush()  
        voter_id = guest_user.id
        voter_name = guest_user.name

    db_availabilities = []

    for av in availabilities:
        if av.start_time >= av.end_time:
            raise HTTPException(status_code=400, detail="Czas rozpoczęcia musi być przed czasem zakończenia")

        if av.start_time.date() != av.end_time.date():
            raise HTTPException(status_code=400, detail="Przedział dostępności musi mieścić się w jednym dniu")
        if av.start_time.date() not in allowed_dates:
            raise HTTPException(status_code=400, detail="Wybrana data nie należy do dni tej grupy")
        start_time_only = av.start_time.time()
        end_time_only = av.end_time.time()

        if start_time_only < group.grid_start_hour or end_time_only > group.grid_end_hour:
            raise HTTPException(
                status_code=400, 
                detail=f"Dostępność wykracza poza ramy czasowe grupy ({group.grid_start_hour} - {group.grid_end_hour})"
            )



        db_availabilities.append(
            models.Availability(
                group_id=group_id,
                user_id=voter_id,
                voter_name=voter_name,
                start_time=av.start_time,
                end_time=av.end_time
            )
        )
    db.add_all(db_availabilities)
    db.commit()

    for db_av in db_availabilities:
        db.refresh(db_av)

    return db_availabilities

@app.get("/groups/{group_id}/heatmap", response_model = schemas.HeatmapResponse)
def get_heatmap(group_id: UUID, db: Session = Depends(get_db)):

    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupa nie istnieje")
    availabilities = db.query(models.Availability).filter(models.Availability.group_id == group_id).all()

    total_participants = db.query(models.Availability.user_id).filter(
        models.Availability.group_id == group_id,
        models.Availability.user_id.isnot(None)
    ).distinct().count()
     
    heatmap_data,available_users= calculate_overlaps(availabilities)

    return {
        "total_participants": total_participants,
        "heatmap": heatmap_data,
        "available_users": available_users
    }


@app.post("/login", response_model = schemas.Token)
def handle_login(data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    
    user_data = db.query(models.User).filter(models.User.email == data.username).first()

    if user_data is None or not user_data.password_hash:
        raise HTTPException(
            status_code=401, 
            detail="Invalid login data"
        )

    if not pwd_context.verify(data.password, user_data.password_hash):
        raise HTTPException(
                status_code=401, 
                detail="Invalid login data"
            )

    
    payload = {"sub": str(user_data.id)}

    token = create_access_token(payload)

    return {"access_token": token, "token_type": "bearer"}

@app.post("/register", response_model = schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):

    if not user.email or not user.password:
        raise HTTPException(status_code=400, detail="Email and password are required for registration")

    email_check = db.query(models.User).filter(models.User.email == user.email).first()

    if email_check is not None:
         raise HTTPException(
                status_code=400, 
                detail="Bad request"
            )

    hashed_password = pwd_context.hash(user.password)

    new_user = models.User(
        name=user.name,
        email=user.email,
        password_hash=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user

@app.get("/groups", response_model=list[schemas.GroupResponse])
def get_my_groups(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    participated_group_ids = db.query(models.Availability.group_id).filter(
        models.Availability.user_id == current_user.id
    ).subquery()

    groups = db.query(models.Group).filter(
        or_(
            models.Group.creator_id == current_user.id,
            models.Group.id.in_(participated_group_ids)
        )
    ).all()

    return groups

@app.get("/groups/{group_id}", response_model=schemas.GroupResponse)
def get_group(group_id: UUID, db: Session = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupa nie istnieje")
    
    return group
    

@app.get("/users/me", response_model=schemas.UserResponse)
def get_current_user_profile(current_user: models.User = Depends(get_current_user)):
    return current_user



@app.get("/groups/{group_id}/availabilities/me", response_model=list[schemas.AvailabilityResponse])
def get_my_availabilities(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupa nie istnieje")

    return db.query(models.Availability).filter(
        models.Availability.group_id == group_id,
        models.Availability.user_id == current_user.id
    ).all()


@app.delete("/groups/{group_id}/availabilities", status_code=204)
def delete_my_availabilities(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupa nie istnieje")

    db.query(models.Availability).filter(
        models.Availability.group_id == group_id,
        models.Availability.user_id == current_user.id
    ).delete()
    db.commit()



@app.patch("/groups/{group_id}", response_model=schemas.GroupResponse)
def update_group(
    group_id: UUID,
    group_update: schemas.GroupUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupa nie istnieje")

    if group.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Brak uprawnień do edycji tej grupy")

    update_data = group_update.model_dump(exclude_unset=True)
    new_days = update_data.pop("days", None)

    new_start = update_data.get("grid_start_hour", group.grid_start_hour)
    new_end = update_data.get("grid_end_hour", group.grid_end_hour)
    if new_start >= new_end:
        raise HTTPException(status_code=400, detail="Godzina rozpoczęcia siatki musi być wcześniejsza niż godzina zakończenia")

    for key, value in update_data.items():
        setattr(group, key, value)

    if new_days is not None:
        db.query(models.GroupDay).filter(models.GroupDay.group_id == group_id).delete()
        for day_date in new_days:
            db.add(models.GroupDay(group_id=group.id, date=day_date))

    db.commit()
    db.refresh(group)
    return group


@app.delete("/groups/{group_id}", status_code=204)
def delete_group(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupa nie istnieje")

    if group.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Brak uprawnień do usunięcia tej grupy")

    db.delete(group)
    db.commit()

@app.get("/groups/{group_id}/availabilities", response_model=list[schemas.AvailabilityResponse])
def get_group_availabilities(group_id: UUID, db: Session = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupa nie istnieje")

    return db.query(models.Availability).filter(
        models.Availability.group_id == group_id
    ).all()