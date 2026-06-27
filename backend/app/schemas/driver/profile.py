from uuid import UUID

from pydantic import BaseModel


class DriverProfile(BaseModel):
    id: UUID
    user_id: UUID
    license_number: str
    vehicle_label: str
    availability_status: str
    full_name: str
    email: str


class DriverProfileUpdate(BaseModel):
    vehicle_label: str | None = None
    full_name: str | None = None
