from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
from config import settings
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer

from fastapi import FastAPI,Depends,HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
from config import settings
import uuid



oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="login", auto_error=False)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: dict):

    to_encode = data.copy()

    expire = datetime.now(timezone.utc)+ timedelta(minutes = settings.access_token_expire_minutes)

    to_encode.update({"exp":expire})

    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)

    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms = [settings.algorithm])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=401, 
                detail= "Verification error"
            )

        user_id = uuid.UUID(user_id)
    except (JWTError,ValueError):
        raise HTTPException(
                status_code=401, 
                detail= "Verification error"
            )
    user_data = db.query(models.User).filter(user_id == models.User.id).first()

    if user_data is None:
        raise HTTPException(
                        status_code=401, 
                        detail= "Verification error"
                    )
    return user_data


def get_optional_current_user(token: str = Depends(oauth2_scheme_optional), db: Session = Depends(get_db)):
    if not token:
        return None  
    
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id_str = payload.get("sub")
        if user_id_str is None:
            return None
        user_id = uuid.UUID(user_id_str)
    except (JWTError, ValueError):
        return None
        
    return db.query(models.User).filter(models.User.id == user_id).first()