from decimal import Decimal

from pydantic import BaseModel

from app.schemas.driver.driver import DriverRead
from app.schemas.driver.trip import DriverTripRead


class DriverDashboardStats(BaseModel):
    total_trips: int
    completed_trips: int
    earnings_today: Decimal
    earnings_total: Decimal


class DriverDashboard(BaseModel):
    driver: DriverRead
    stats: DriverDashboardStats
    active_trip: DriverTripRead | None
