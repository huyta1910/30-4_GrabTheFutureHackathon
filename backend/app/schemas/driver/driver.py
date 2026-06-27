from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AvailabilityStatus(str, Enum):
    online = "online"
    offline = "offline"
    inactive = "inactive"


class DriverRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    license_number: str
    vehicle_label: str
    availability_status: str


class AvailabilityUpdate(BaseModel):
    availability_status: AvailabilityStatus
