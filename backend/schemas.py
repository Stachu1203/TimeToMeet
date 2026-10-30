from pydantic import BaseModel, Field, field_validator
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


class GroupDayResponse(BaseModel):
    id: UUID
    group_id: UUID
    date: date

    class Config:
        from_attributes = True

class GroupResponse(BaseModel):
    id: UUID
    creator_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    timezone: str
    grid_start_hour: time
    grid_end_hour: time
    days: list[GroupDayResponse]

    class Config:
        from_attributes = True

class AvailabilityCreate(BaseModel):
    start_time: datetime
    end_time: datetime

class AvailabilityResponse(BaseModel):
    id: UUID
    group_id: UUID
    user_id: Optional[UUID] = None
    start_time: datetime
    end_time: datetime

    class Config:
        from_attributes = True

class GroupDayCreate(BaseModel):
    date: date

class HeatmapResponse(BaseModel):
    total_participants: int
    heatmap: dict[datetime,int]





        