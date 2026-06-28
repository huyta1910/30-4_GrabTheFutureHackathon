from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status

from app.optimizer.backend_adapter import (
    booking_has_coordinates,
    optimize_fixed_booking_pool,
)
from app.repositories.driver.pool_repository import PoolRepository
from app.repositories.matching import MatchingRepository
from app.services.matching import MatchingService
from app.schemas.driver.geo import GeoPoint
from app.schemas.driver.pool import (
    PoolPassenger,
    PoolRespondPayload,
    PoolStop,
    PoolSuggestion,
)
from app.services.driver.geo_mock import build_route, demo_congestion_zones, geocode


class PoolService:
    def __init__(self, pool_repo: PoolRepository) -> None:
        self._pools = pool_repo

    def list_suggestions(self, driver_id: UUID | None = None) -> list[PoolSuggestion]:
        # Auto-run AI matching so freshly-requested rides surface as pools with
        # no manual trigger — the driver's polling pool page shows them live.
        MatchingService(MatchingRepository(self._pools.session)).run()
        groups = self._pools.list_pending()
        driver_location = self._driver_location(driver_id)
        return [self._to_suggestion(g, driver_location) for g in groups]

    def get_suggestion(self, group_id: UUID, driver_id: UUID | None = None) -> PoolSuggestion:
        group = self._pools.get(group_id)
        if group is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pool suggestion not found",
            )
        # Prefer the assigned driver's location, else the viewing driver's.
        driver_location = self._driver_location(group.driver_id or driver_id)
        return self._to_suggestion(group, driver_location)

    def respond(
        self, driver_id: UUID, group_id: UUID, payload: PoolRespondPayload
    ) -> PoolSuggestion:
        group = self._pools.get(group_id)
        if group is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pool suggestion not found",
            )
        if group.status != "pending":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot respond to pool with status '{group.status}'",
            )

        if payload.action == "decline":
            group.status = "declined"
            self._pools.save(group)
            return self._to_suggestion(group, self._driver_location(driver_id))

        driver = self._pools.get_driver(driver_id)
        if driver is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Driver not found",
            )
        members_with_bookings = self._pools.get_members_with_bookings(group.id)
        self._pools.confirm_assignment(group, driver, members_with_bookings)
        return self._to_suggestion(group, _driver_point(driver))

    def complete(self, driver_id: UUID, group_id: UUID) -> PoolSuggestion:
        group = self._pools.get(group_id)
        if group is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pool suggestion not found",
            )
        if group.status != "active":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot complete a pool with status '{group.status}'",
            )
        driver = self._pools.get_driver(driver_id)
        if driver is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Driver not found",
            )
        members_with_bookings = self._pools.get_members_with_bookings(group.id)
        self._pools.complete_pool(group, driver, members_with_bookings)
        return self._to_suggestion(group, _driver_point(driver))

    def _driver_location(self, driver_id: UUID | None) -> GeoPoint | None:
        if driver_id is None:
            return None
        driver = self._pools.get_driver(driver_id)
        return _driver_point(driver) if driver is not None else None

    def _to_suggestion(self, group, driver_location: GeoPoint | None = None) -> PoolSuggestion:
        members_with_bookings = self._pools.get_members_with_bookings(group.id)
        passengers: list[PoolPassenger] = []
        total_fare = Decimal(0)
        pickups: list[GeoPoint] = []
        dropoffs: list[GeoPoint] = []
        for i, (_, booking) in enumerate(members_with_bookings):
            fare = booking.estimated_fare if booking else None
            pickup_label = booking.pickup_label if booking else "Unknown"
            dropoff_label = booking.dropoff_label if booking else "Unknown"
            pickup = _booking_point(
                booking.pickup_latitude if booking else None,
                booking.pickup_longitude if booking else None,
            ) or geocode(pickup_label)
            dropoff = _booking_point(
                booking.dropoff_latitude if booking else None,
                booking.dropoff_longitude if booking else None,
            ) or geocode(dropoff_label)
            if pickup:
                pickups.append(pickup)
            if dropoff:
                dropoffs.append(dropoff)
            passengers.append(
                PoolPassenger(
                    pickup_label=pickup_label,
                    dropoff_label=dropoff_label,
                    estimated_fare=fare,
                    stop_order=i + 1,
                    pickup=pickup,
                    dropoff=dropoff,
                )
            )
            if fare:
                total_fare += fare

        # Route starts at the driver's real location when known, else the first
        # pickup. Riders are then dropped off in AI-optimized order (Held-Karp).
        driver_start = driver_location or (pickups[0] if pickups else geocode(group.origin_area))

        dropoff_seq = _optimized_dropoff_sequence(members_with_bookings)
        if dropoff_seq is None:
            dropoff_seq = list(range(len(passengers)))

        ordered_dropoffs = [
            passengers[i].dropoff for i in dropoff_seq if passengers[i].dropoff is not None
        ]
        ordered_stops = pickups + ordered_dropoffs
        route = build_route(ordered_stops, avoid_congestion=True)

        # Navigation sequence: all pickups first, then drop-offs in optimal order.
        ordered: list[tuple[str, PoolPassenger, GeoPoint | None]] = []
        for p in passengers:
            ordered.append(("pickup", p, p.pickup))
        for i in dropoff_seq:
            p = passengers[i]
            ordered.append(("dropoff", p, p.dropoff))

        stops: list[PoolStop] = []
        prev_point = driver_start
        for seq, (kind, p, point) in enumerate(ordered, start=1):
            leg = _leg_route(prev_point, point)
            stops.append(
                PoolStop(
                    sequence=seq,
                    type=kind,  # type: ignore[arg-type]
                    label=p.pickup_label if kind == "pickup" else p.dropoff_label,
                    passenger_order=p.stop_order,
                    point=point,
                    leg_route=leg,
                )
            )
            if point is not None:
                prev_point = point

        return PoolSuggestion(
            id=group.id,
            status=group.status,
            driver_id=group.driver_id,
            origin_area=group.origin_area,
            destination_area=group.destination_area,
            passengers=passengers,
            total_estimated_fare=total_fare,
            created_at=group.created_at,
            driver_start=driver_start,
            route=route,
            congestion_zones=demo_congestion_zones(),
            stops=stops,
        )


def _leg_route(prev: GeoPoint | None, cur: GeoPoint | None) -> list[GeoPoint]:
    """Road geometry for a single leg between two stops (mock).

    Replaced by the AI router's Dijkstra path later. Returns a single point for
    a degenerate (zero-length) leg, e.g. driver already at the first pickup.
    """
    if cur is None:
        return []
    if prev is None or (prev.lat == cur.lat and prev.lng == cur.lng):
        return [cur]
    return build_route([prev, cur], avoid_congestion=True)


def _booking_point(lat, lng) -> GeoPoint | None:
    if lat is None or lng is None:
        return None
    return GeoPoint(lat=float(lat), lng=float(lng))


def _driver_point(driver) -> GeoPoint | None:
    if driver is None:
        return None
    return _booking_point(driver.current_latitude, driver.current_longitude)


def _optimized_dropoff_sequence(members_with_bookings) -> list[int] | None:
    """Optimal drop-off order as passenger indices, via Held-Karp TSP.

    Returns None when any booking lacks coordinates, so the caller falls back to
    the input order.
    """
    bookings = [booking for _, booking in members_with_bookings]
    if any(b is None for b in bookings):
        return None
    if not all(booking_has_coordinates(b) for b in bookings):
        return None

    plan = optimize_fixed_booking_pool(bookings)
    if plan is None:
        return None

    index_by_id = {str(b.id): i for i, b in enumerate(bookings)}
    return [index_by_id[uid] for uid in plan.dropoff_order]
