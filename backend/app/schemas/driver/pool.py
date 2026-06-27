from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

from app.schemas.driver.geo import CongestionZone, GeoPoint


class PoolPassenger(BaseModel):
    pickup_label: str
    dropoff_label: str
    estimated_fare: Decimal | None
    stop_order: int
    pickup: GeoPoint | None = None
    dropoff: GeoPoint | None = None


class PoolStop(BaseModel):
    """One ordered stop in the optimized pickup→dropoff navigation sequence."""

    sequence: int  # 1-based order the driver visits this stop
    type: Literal["pickup", "dropoff"]
    label: str
    passenger_order: int  # which passenger (matches PoolPassenger.stop_order)
    point: GeoPoint | None = None
    # Road geometry from the previous stop (or driver start) to this stop.
    # Mock-AI fills a simple polyline; the real AI router replaces it with the
    # Dijkstra path that avoids rain-weighted edges.
    leg_route: list[GeoPoint] = []


class PoolSuggestion(BaseModel):
    id: UUID
    status: str
    driver_id: UUID | None = None
    origin_area: str | None
    destination_area: str | None
    passengers: list[PoolPassenger]
    total_estimated_fare: Decimal
    created_at: datetime
    driver_start: GeoPoint | None = None
    route: list[GeoPoint] = []
    congestion_zones: list[CongestionZone] = []
    stops: list[PoolStop] = []


class PoolRespondPayload(BaseModel):
    action: Literal["accept", "decline"]
