from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status

from app.models.booking import Booking
from app.models.trip_history import TripHistory
from app.repositories.driver.trip_repository import DriverTripRepository
from app.schemas.common import PaginatedResponse
from app.schemas.driver.geo import GeoPoint
from app.schemas.driver.trip import (
    DriverTripDetail,
    DriverTripStatus,
    TripStatusUpdate,
)
from app.services.driver.geo_mock import build_route, demo_congestion_zones, geocode

# Trip statuses where a live tracking map is meaningful.
_ACTIVE_STATUSES = {
    DriverTripStatus.assigned.value,
    DriverTripStatus.en_route.value,
    DriverTripStatus.in_progress.value,
}

# Fraction of the route the driver has covered, per active status.
_PROGRESS_BY_STATUS = {
    DriverTripStatus.assigned.value: 0.0,
    DriverTripStatus.en_route.value: 0.35,
    DriverTripStatus.in_progress.value: 0.7,
}

# Booking status mirrored back to the passenger for each driver trip status,
# so passenger ride-status reflects what the driver is doing.
_BOOKING_STATUS_FOR_TRIP = {
    DriverTripStatus.assigned.value: "assigned",
    DriverTripStatus.en_route.value: "assigned",
    DriverTripStatus.in_progress.value: "in_progress",
    DriverTripStatus.completed.value: "completed",
    DriverTripStatus.cancelled.value: "cancelled",
}

# Allowed lifecycle transitions for a driver-managed trip.
_ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    DriverTripStatus.assigned.value: {
        DriverTripStatus.en_route.value,
        DriverTripStatus.cancelled.value,
    },
    DriverTripStatus.en_route.value: {
        DriverTripStatus.in_progress.value,
        DriverTripStatus.cancelled.value,
    },
    DriverTripStatus.in_progress.value: {
        DriverTripStatus.completed.value,
        DriverTripStatus.cancelled.value,
    },
    DriverTripStatus.completed.value: set(),
    DriverTripStatus.cancelled.value: set(),
}


class TripService:
    """Business logic for driver trip lifecycle management."""

    def __init__(self, trip_repository: DriverTripRepository) -> None:
        self._trips = trip_repository

    def list_trips(
        self,
        driver_id: UUID,
        statuses: tuple[str, ...] | None,
        page: int,
        page_size: int,
    ) -> PaginatedResponse[DriverTripDetail]:
        offset = (page - 1) * page_size
        rows = self._trips.list_trips(driver_id, statuses, page_size, offset)
        total = self._trips.count_trips(driver_id, statuses)
        return PaginatedResponse(
            items=[self._to_detail(trip, booking) for trip, booking in rows],
            page=page,
            page_size=page_size,
            total=total,
        )

    def get_trip_detail(self, driver_id: UUID, trip_id: UUID) -> DriverTripDetail:
        result = self._trips.get_trip_with_booking(driver_id, trip_id)
        if result is None:
            raise self._not_found()
        trip, booking = result
        return self._to_detail(trip, booking)

    def update_status(
        self,
        driver_id: UUID,
        trip_id: UUID,
        payload: TripStatusUpdate,
    ) -> DriverTripDetail:
        result = self._trips.get_trip_with_booking(driver_id, trip_id)
        if result is None:
            raise self._not_found()
        trip, booking = result

        target = payload.status.value
        self._assert_transition_allowed(trip.status, target)

        trip.status = target
        if target == DriverTripStatus.completed.value:
            trip.completed_at = datetime.now(timezone.utc)
            if trip.total_fare is None and booking is not None:
                trip.total_fare = booking.estimated_fare

        # Mirror the lifecycle onto the booking so the passenger sees progress.
        if booking is not None:
            booking.status = _BOOKING_STATUS_FOR_TRIP.get(target, booking.status)

        # Notify the passenger when the ride finishes or is cancelled.
        if booking is not None and target == DriverTripStatus.completed.value:
            self._trips.notify_passenger(
                booking,
                "Ride completed",
                f"Your pooled ride from {booking.pickup_label} to "
                f"{booking.dropoff_label} is complete. Thanks for sharing the trip!",
            )
        elif booking is not None and target == DriverTripStatus.cancelled.value:
            self._trips.notify_passenger(
                booking,
                "Ride cancelled",
                f"Your ride from {booking.pickup_label} to {booking.dropoff_label} "
                "was cancelled. Please request a new ride.",
            )

        saved = self._trips.save(trip, booking)
        return self._to_detail(saved, booking)

    def _assert_transition_allowed(self, current: str, target: str) -> None:
        allowed = _ALLOWED_TRANSITIONS.get(current)
        if allowed is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Unknown trip status '{current}'",
            )
        if target not in allowed:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot transition trip from '{current}' to '{target}'",
            )

    @staticmethod
    def _to_detail(trip: TripHistory, booking: Booking | None) -> DriverTripDetail:
        detail = DriverTripDetail.model_validate(trip)
        if booking is not None:
            detail.pickup_label = booking.pickup_label
            detail.dropoff_label = booking.dropoff_label
            detail.requested_at = booking.requested_at
            detail.estimated_fare = booking.estimated_fare
            detail.pickup = _booking_point(
                booking.pickup_latitude,
                booking.pickup_longitude,
            ) or geocode(booking.pickup_label)
            detail.dropoff = _booking_point(
                booking.dropoff_latitude,
                booking.dropoff_longitude,
            ) or geocode(booking.dropoff_label)

        # Live tracking geometry only for in-flight trips.
        if trip.status in _ACTIVE_STATUSES and detail.pickup and detail.dropoff:
            route = build_route([detail.pickup, detail.dropoff], avoid_congestion=True)
            detail.route = route
            detail.congestion_zones = demo_congestion_zones()
            detail.driver_position = _interpolate(
                route, _PROGRESS_BY_STATUS.get(trip.status, 0.0)
            )
        return detail

    @staticmethod
    def _not_found() -> HTTPException:
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found",
        )


def _interpolate(route: list[GeoPoint], progress: float) -> GeoPoint | None:
    """Point at `progress` (0..1) along the polyline, by segment length."""
    if not route:
        return None
    if len(route) == 1 or progress <= 0:
        return route[0]
    if progress >= 1:
        return route[-1]

    seg_lengths = [
        ((route[i + 1].lat - route[i].lat) ** 2 + (route[i + 1].lng - route[i].lng) ** 2) ** 0.5
        for i in range(len(route) - 1)
    ]
    total = sum(seg_lengths) or 1.0
    target = progress * total
    acc = 0.0
    for i, seg in enumerate(seg_lengths):
        if acc + seg >= target:
            t = (target - acc) / seg if seg else 0.0
            a, b = route[i], route[i + 1]
            return GeoPoint(lat=a.lat + (b.lat - a.lat) * t, lng=a.lng + (b.lng - a.lng) * t)
        acc += seg
    return route[-1]


def _booking_point(lat, lng) -> GeoPoint | None:
    if lat is None or lng is None:
        return None
    return GeoPoint(lat=float(lat), lng=float(lng))
