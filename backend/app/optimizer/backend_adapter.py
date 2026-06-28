from __future__ import annotations

from collections.abc import Sequence
from decimal import Decimal
from math import ceil
from typing import Protocol
from uuid import UUID

from app.optimizer.core import (
    Driver,
    OptimizationResult,
    PassengerPool,
    PoolOptimizationResult,
    PoolPlan,
    RideRequest,
    assign_pools_to_drivers,
    optimize_passenger_pools,
)


class CoordinateBooking(Protocol):
    id: UUID
    pickup_latitude: Decimal | None
    pickup_longitude: Decimal | None
    dropoff_latitude: Decimal | None
    dropoff_longitude: Decimal | None


class LocatableDriver(Protocol):
    id: UUID
    current_latitude: Decimal | None
    current_longitude: Decimal | None


DEFAULT_MAX_POOL_SIZE = 4

# Drivers are treated as having unlimited seat capacity for the assignment stage,
# so any driver can serve any pool regardless of its size.
UNLIMITED_CAPACITY = 1_000_000


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


def driver_has_location(driver: LocatableDriver) -> bool:
    return driver.current_latitude is not None and driver.current_longitude is not None


def driver_from_model(driver: LocatableDriver) -> Driver:
    if not driver_has_location(driver):
        raise ValueError(f"Driver {driver.id} is missing a current location.")

    return Driver(
        id=str(driver.id),
        current_location=(
            _coordinate_to_float(driver.current_longitude),
            _coordinate_to_float(driver.current_latitude),
        ),
        capacity=UNLIMITED_CAPACITY,
    )


def assign_booking_pools_to_drivers(
    pools: Sequence[tuple[str, Sequence[CoordinateBooking]]],
    drivers: Sequence[LocatableDriver],
) -> OptimizationResult:
    """Match already-built booking pools to the closest available drivers.

    ``pools`` is a sequence of ``(pool_id, bookings)`` pairs. Pools whose
    bookings are missing coordinates, and drivers without a current location,
    are skipped. Each returned :class:`RoutePlan` carries ``pool_id`` (the input
    pool id) and ``driver_id`` so the caller can persist the assignment.
    """

    located_drivers = [driver for driver in drivers if driver_has_location(driver)]
    if not located_drivers:
        return OptimizationResult(groups=(), total_cost=0.0)

    passenger_pools: list[PassengerPool] = []
    for pool_id, bookings in pools:
        if not bookings or not all(booking_has_coordinates(booking) for booking in bookings):
            continue
        passenger_pools.append(
            PassengerPool(
                id=pool_id,
                requests=tuple(ride_request_from_booking(booking) for booking in bookings),
            )
        )

    if not passenger_pools:
        return OptimizationResult(groups=(), total_cost=0.0)

    return assign_pools_to_drivers(
        passenger_pools,
        tuple(driver_from_model(driver) for driver in located_drivers),
    )


def _coordinate_to_float(value: Decimal | None) -> float:
    if value is None:
        raise ValueError("Coordinate value cannot be None.")
    return float(value)
