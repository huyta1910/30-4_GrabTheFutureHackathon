"""Mock geo provider for the driver module.

Maps human-readable place labels to HCMC coordinates and builds simple route
polylines + congestion zones. This is a MOCK-AI CONTRACT: the real AI routing
module (OSMnx graph + Dijkstra with rain-weighted edges) replaces these
functions later. The schema (GeoPoint / CongestionZone) stays the same.
"""
from __future__ import annotations

import hashlib

from app.schemas.driver.geo import CongestionZone, GeoPoint

# Known HCMC landmarks → (lat, lng). Substring-matched, case-insensitive.
_LANDMARKS: dict[str, tuple[float, float]] = {
    "ben thanh": (10.7720, 106.6980),
    "tan son nhat": (10.8188, 106.6520),
    "airport": (10.8188, 106.6520),
    "district 1": (10.7769, 106.7009),
    "district 2": (10.7872, 106.7498),
    "district 5": (10.7540, 106.6630),
    "district 7": (10.7340, 106.7220),
    "district 10": (10.7730, 106.6670),
    "binh thanh": (10.8106, 106.7091),
    "vincom": (10.7780, 106.7020),
    "duc ba": (10.7797, 106.6990),
    "nha tho": (10.7797, 106.6990),
    "bach khoa": (10.7726, 106.6577),
    "kinh te": (10.7830, 106.6960),
}

# HCMC center for deterministic fallback scatter.
_CENTER = (10.7769, 106.7009)


def geocode(label: str | None) -> GeoPoint | None:
    """Resolve a place label to a coordinate. Deterministic fallback near center."""
    if not label:
        return None
    key = label.strip().lower()
    for needle, (lat, lng) in _LANDMARKS.items():
        if needle in key:
            return GeoPoint(lat=lat, lng=lng)
    # Deterministic scatter around center so the same label always maps the same.
    digest = hashlib.md5(key.encode()).hexdigest()
    lat_off = (int(digest[:4], 16) / 0xFFFF - 0.5) * 0.06
    lng_off = (int(digest[4:8], 16) / 0xFFFF - 0.5) * 0.06
    return GeoPoint(lat=_CENTER[0] + lat_off, lng=_CENTER[1] + lng_off)


def build_route(stops: list[GeoPoint], avoid_congestion: bool = False) -> list[GeoPoint]:
    """Build a polyline through ordered stops.

    When avoid_congestion is True, inserts a detour waypoint between legs to
    visualize the AI router choosing a longer path that avoids a red zone.
    """
    points = [s for s in stops if s is not None]
    if len(points) < 2:
        return points

    route: list[GeoPoint] = []
    for i in range(len(points) - 1):
        a, b = points[i], points[i + 1]
        route.append(a)
        mid_lat = (a.lat + b.lat) / 2
        mid_lng = (a.lng + b.lng) / 2
        if avoid_congestion:
            # Bow the midpoint away from the congestion center to look like a detour.
            route.append(GeoPoint(lat=mid_lat + 0.008, lng=mid_lng - 0.006))
        else:
            route.append(GeoPoint(lat=mid_lat, lng=mid_lng))
    route.append(points[-1])
    return route


def demo_congestion_zones() -> list[CongestionZone]:
    """Static rain/flood congestion zones for the demo (60mm rain scenario)."""
    return [
        CongestionZone(
            lat=10.7820, lng=106.6950, radius_m=700, severity="high",
            label="Ngập nặng - Nguyễn Thị Minh Khai",
        ),
        CongestionZone(
            lat=10.7900, lng=106.7050, radius_m=550, severity="medium",
            label="Kẹt xe - Điện Biên Phủ",
        ),
        CongestionZone(
            lat=10.7650, lng=106.6820, radius_m=600, severity="high",
            label="Ngập - Vòng xoay Cộng Hòa",
        ),
    ]
