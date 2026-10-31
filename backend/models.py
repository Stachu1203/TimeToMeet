import uuid
from sqlalchemy import Column, String, Text, Time, Date, DateTime, ForeignKey, Uuid
from sqlalchemy.orm import relationship
from database import Base
from datetime import date

class User(Base):
    
    __tablename__ = "users"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    password_hash = Column(String, nullable=True)

    groups_created = relationship("Group", back_populates = "creator")
    availabilities = relationship("Availability", back_populates="user")


class Group(Base):
    
    __tablename__ = "groups"

    id = Column(Uuid, primary_key=True, default = uuid.uuid4)
    creator_id = Column(Uuid, ForeignKey("users.id"))
    title = Column(String,nullable=False)
    description = Column(Text,nullable=True)
    created_at = Column(Date, default=date.today, nullable=False)
    timezone = Column(String,nullable=False)
    grid_start_hour = Column(Time, nullable = False)
    grid_end_hour = Column(Time, nullable = False)

    creator = relationship("User", back_populates="groups_created")
    days = relationship("GroupDay", back_populates="group", cascade="all, delete-orphan")
    availabilities = relationship("Availability", back_populates="group", cascade="all, delete-orphan")

class GroupDay(Base):

    __tablename__ = "group_days"

    id = Column(Uuid, primary_key=True, default= uuid.uuid4)
    group_id = Column(Uuid, ForeignKey("groups.id"))
    date = Column(Date,nullable = False)

    group = relationship("Group", back_populates="days")

class Availability(Base):

    __tablename__ = "availabilities"

    id = Column(Uuid, primary_key=True, default = uuid.uuid4)
    group_id = Column(Uuid, ForeignKey("groups.id"))
    user_id = Column(Uuid, ForeignKey("users.id"))
    voter_name = Column(String, nullable=True)
    start_time = Column(DateTime(timezone=True), nullable = False)
    end_time = Column(DateTime(timezone=True), nullable = False)

    group = relationship("Group", back_populates="availabilities")
    user = relationship("User", back_populates="availabilities")
