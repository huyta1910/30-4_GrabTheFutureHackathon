"""Real road routing via the VietMap Route API.

Replaces the straight-line mock (:func:`geo_mock.build_route`) with a real
road-following polyline plus the authoritative distance/duration of the trip.

This is the "drawing" half of routing: given an ordered list of stops, return
the road geometry to draw and the real distance/time to display. The optimizer
cost (``core.euclidean_distance``) is intentionally left untouched for now.

The VietMap Route API is GraphHopper-compatible::

    GET {base}?api-version=1.1&apikey=KEY
        &point=lat,lng&point=lat,lng&vehicle=car&points_encoded=true

    -> { "paths": [ { "distance": <m>, "time": <ms>, "points": "<polyline>" } ] }

Everything degrades gracefully: if no API key is configured or the call fails,
:func:`road_route` falls back to the mock polyline so the demo never breaks.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx

from app.config.settings import settings
from app.schemas.driver.geo import GeoPoint
from app.services.driver.geo_mock import build_route

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class RouteResult:
    """A drawn route: road geometry plus its real cost."""

    points: list[GeoPoint]
    distance_m: float | None
    duration_s: float | None


def road_route(stops: list[GeoPoint], avoid_congestion: bool = True) -> RouteResult:
    """Road-following polyline + distance/duration through ordered ``stops``.

    Tries the VietMap Route API first; on any failure (no key, network error,
    bad response) falls back to the straight-line mock so callers always get a
    drawable route. ``avoid_congestion`` only affects the mock fallback's bow —
    the real API already routes around live traffic.
    """
    points = [s for s in stops if s is not None]
    if len(points) < 2:
        return RouteResult(points=points, distance_m=None, duration_s=None)

    fetched = _fetch_vietmap_route(points)
    if fetched is not None:
        return fetched

    # Fallback: mock geometry, no trustworthy distance/duration.
    logger.warning(
        "VietMap routing unavailable (enabled=%s, key_set=%s) — drawing straight-line mock.",
        settings.routing_enabled,
        bool(settings.vietmap_api_key),
    )
    return RouteResult(
        points=build_route(points, avoid_congestion=avoid_congestion),
        distance_m=None,
        duration_s=None,
    )


def _fetch_vietmap_route(points: list[GeoPoint]) -> RouteResult | None:
    """Call the VietMap Route API. Returns None on any error or if disabled."""
    if not settings.routing_enabled or not settings.vietmap_api_key:
        return None

    params: list[tuple[str, str]] = [
        ("api-version", "1.1"),
        ("apikey", settings.vietmap_api_key),
        ("vehicle", "car"),
        ("points_encoded", "true"),
    ]
    params += [("point", f"{p.lat},{p.lng}") for p in points]

    try:
        response = httpx.get(
            settings.vietmap_route_url,
            params=params,
            timeout=settings.routing_timeout_seconds,
        )
        response.raise_for_status()
        payload = response.json()
    except httpx.HTTPStatusError as exc:
        logger.warning(
            "VietMap route HTTP %s: %s",
            exc.response.status_code,
            exc.response.text[:200],
        )
        return None
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("VietMap route request failed: %s", exc)
        return None

    paths = payload.get("paths")
    if not paths:
        return None

    path = paths[0]
    encoded = path.get("points")
    if not isinstance(encoded, str) or not encoded:
        return None

    geometry = _decode_polyline(encoded)
    if len(geometry) < 2:
        return None

    time_ms = path.get("time")
    return RouteResult(
        points=geometry,
        distance_m=_as_float(path.get("distance")),
        duration_s=_as_float(time_ms) / 1000.0 if time_ms is not None else None,
    )


def _decode_polyline(encoded: str, precision: int = 5) -> list[GeoPoint]:
    """Decode a Google/GraphHopper encoded polyline into points.

    VietMap returns latitude,longitude order at precision 5 when
    ``points_encoded=true``.
    """
    factor = float(10**precision)
    index = 0
    lat = 0
    lng = 0
    length = len(encoded)
    points: list[GeoPoint] = []

    while index < length:
        lat_delta, index = _decode_delta(encoded, index)
        lng_delta, index = _decode_delta(encoded, index)
        lat += lat_delta
        lng += lng_delta
        points.append(GeoPoint(lat=lat / factor, lng=lng / factor))

    return points


def _decode_delta(encoded: str, index: int) -> tuple[int, int]:
    """Decode one varint-encoded delta, returning ``(value, next_index)``."""
    result = 0
    shift = 0
    while True:
        byte = ord(encoded[index]) - 63
        index += 1
        result |= (byte & 0x1F) << shift
        shift += 5
        if byte < 0x20:
            break
    value = ~(result >> 1) if (result & 1) else (result >> 1)
    return value, index


def _as_float(value: object) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    return None
