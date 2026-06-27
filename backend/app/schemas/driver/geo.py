from pydantic import BaseModel


class GeoPoint(BaseModel):
    lat: float
    lng: float


class CongestionZone(BaseModel):
    """A rain/traffic congestion area the AI router avoids."""

    lat: float
    lng: float
    radius_m: float
    severity: str  # "low" | "medium" | "high"
    label: str | None = None
