from __future__ import annotations

from collections.abc import Sequence
from decimal import Decimal
from math import ceil
from typing import Protocol
from uuid import UUID

from app.optimizer.core import (
    PoolOptimizationResult,
    PoolPlan,
    RideRequest,
    optimize_passenger_pools,
)


class CoordinateBooking(Protocol):
    id: UUID
    pickup_latitude: Decimal | None
    pickup_longitude: Decimal | None
    dropoff_latitude: Decimal | None
    dropoff_longitude: Decimal | None


DEFAULT_MAX_POOL_SIZE = 4


def booking_has_coordinates(booking: CoordinateBooking) -> bool:
    return (
        booking.pickup_latitude is not None
        and booking.pickup_longitude is not None
        and booking.dropoff_latitude is not None
        and booking.dropoff_longitude is not None
    )


def ride_request_from_booking(booking: CoordinateBooking) -> RideRequest:
    if not booking_has_coordinates(booking):
        raise ValueError(f"Booking {booking.id} is missing pickup/dropoff coordinates.")

    return RideRequest(
        id=str(booking.id),
        source=(
            _coordinate_to_float(booking.pickup_longitude),
            _coordinate_to_float(booking.pickup_latitude),
        ),
        destination=(
            _coordinate_to_float(booking.dropoff_longitude),
            _coordinate_to_float(booking.dropoff_latitude),
        ),
    )


def optimize_booking_pools(
    bookings: Sequence[CoordinateBooking],
    pool_count: int,
    max_pool_size: int = DEFAULT_MAX_POOL_SIZE,
) -> PoolOptimizationResult:
    if pool_count <= 0:
        raise ValueError("pool_count must be positive.")
    if max_pool_size <= 0:
        raise ValueError("max_pool_size must be positive.")
    if not bookings:
        return PoolOptimizationResult(pools=(), total_cost=0.0)

    requests = tuple(ride_request_from_booking(booking) for booking in bookings)
    target_pool_count = min(pool_count, len(requests))
    max_pool_size = max(max_pool_size, ceil(len(requests) / target_pool_count))
    return optimize_passenger_pools(
        requests=requests,
        pool_count=target_pool_count,
        max_pool_size=max_pool_size,
    )


def optimize_fixed_booking_pool(bookings: Sequence[CoordinateBooking]) -> PoolPlan | None:
    if not bookings or not all(booking_has_coordinates(booking) for booking in bookings):
        return None

    requests = tuple(ride_request_from_booking(booking) for booking in bookings)
    result = optimize_passenger_pools(
        requests=requests,
        pool_count=1,
        max_pool_size=len(requests),
    )
    return result.pools[0]


def _coordinate_to_float(value: Decimal | None) -> float:
    if value is None:
        raise ValueError("Coordinate value cannot be None.")
    return float(value)
