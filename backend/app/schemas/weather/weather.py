from uuid import UUID

from pydantic import BaseModel, Field


class WeatherAlertCreate(BaseModel):
    location_label: str = Field(min_length=2, max_length=255)
    minutes_until_rain: int = Field(default=20, ge=1, le=120)
    severity: str = Field(default="heavy")


class WeatherAlertResult(BaseModel):
    event_id: UUID
    location_label: str
    minutes_until_rain: int
    passengers_notified: int
