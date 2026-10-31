from pydantic import BaseModel, Field, field_validator,model_validator
from typing import Optional, List
from uuid import UUID
from datetime import time, date, datetime
import zoneinfo

class UserCreate(BaseModel):
    name: str
    email: Optional[str] = None
    password: Optional[str] = None

class UserResponse(BaseModel):
    id: UUID
    name: str
    email: Optional[str] = None

    class Config:
        from_attributes = True

class GroupCreate(BaseModel):
    title: str
    description: Optional[str] = None
    timezone: str
    grid_start_hour: time
    grid_end_hour: time
    days: list[date]

    @field_validator('timezone')
    @classmethod
    def chec_timezone(cls,v):
        try:
            zoneinfo.ZoneInfo(v)
        except zoneinfo.ZoneInfoNotFoundError:
            raise ValueError('Podano nieistniejącą strefe czasową')
        return v
    @field_validator('days')
    @classmethod
    def check_days(cls, v: list[date]):
        if not v:
            raise ValueError('Musisz podać przynajmniej jeden dzień dla grupy')
        
        return list(dict.fromkeys(v))
    
    @model_validator(mode='after')
    def check_hours(self):
        if self.grid_start_hour >= self.grid_end_hour:
            raise ValueError('Godzina rozpoczęcia siatki musi być wcześniejsza niż godzina zakończenia')
        return self

class GroupDayResponse(BaseModel):
    id: UUID
    group_id: UUID
    date: date

    class Config:
        from_attributes = True

class GroupResponse(BaseModel):
    id: UUID
    creator_id: UUID
    title: str
    description: Optional[str] = None
    created_at: date
    timezone: str
    grid_start_hour: time
    grid_end_hour: time
    days: list[GroupDayResponse]

    class Config:
        from_attributes = True

class AvailabilityCreate(BaseModel):
    start_time: datetime
    end_time: datetime
    voter_name: Optional[str] = None

class AvailabilityResponse(BaseModel):
    id: UUID
    group_id: UUID
    user_id: Optional[UUID] = None
    voter_name: Optional[str] = None
    start_time: datetime
    end_time: datetime

    class Config:
        from_attributes = True

class GroupDayCreate(BaseModel):
    date: date

class HeatmapResponse(BaseModel):
    total_participants: int
    heatmap: dict[datetime,int]
    available_users: dict[datetime, list[str]]

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str


class GroupUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    timezone: Optional[str] = None
    grid_start_hour: Optional[time] = None
    grid_end_hour: Optional[time] = None
    days: Optional[list[date]] = None
    @field_validator('timezone')
    @classmethod
    def check_timezone(cls, v):
        if v is not None:
            try:
                zoneinfo.ZoneInfo(v)
            except zoneinfo.ZoneInfoNotFoundError:
                raise ValueError('Podano nieistniejącą strefe czasową')
        return v
    @field_validator('days')
    @classmethod
    def check_days(cls, v: Optional[list[date]]):
        if v is not None:
            if not v:
                raise ValueError('Musisz podać przynajmniej jeden dzień dla grupy')
            return list(dict.fromkeys(v))
        return v



        