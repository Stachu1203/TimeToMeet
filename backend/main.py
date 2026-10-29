from fastapi import FastAPI,Depends
from sqlalchemy.orm import Session
import models
import schemas
from database import engine, SessionLocal

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


@app.post("/groups", response_model = schemas.GroupDayResponse)
def create_group(group: schemas.GroupCreate, db: Session = Depends(get_db)):
    db_group = models.Group(**group.model_dump())

    db.add(db_group)
    db.commit()

    db.refresh(db_group)

    return db_group