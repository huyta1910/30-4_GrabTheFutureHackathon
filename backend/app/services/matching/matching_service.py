from decimal import Decimal
from math import ceil
from uuid import UUID

from app.optimizer.backend_adapter import (
    DEFAULT_MAX_POOL_SIZE,
    booking_has_coordinates,
    optimize_booking_pools,
)
from app.repositories.matching import MatchingRepository
from app.schemas.matching import MatchingSummary
from app.services.driver.geo_mock import geocode

# Cap per pass so the exact (exponential) pooling DP stays fast.
MAX_BOOKINGS_PER_PASS = 9


class MatchingService:
    """AI pooling matcher.

    Groups compatible pending ride requests into shared pools using the
    optimizer (source-centroid pooling + Held-Karp drop-off ordering), then
    publishes them as pending ``ride_pool_groups`` for drivers to accept.
    """

    def __init__(self, repository: MatchingRepository) -> None:
        self._repo = repository

    def run(self) -> MatchingSummary:
        # No new waiting requests -> nothing to do. This keeps the matcher
        # idempotent so it can be called on every driver poll without churning
        # already-published pool ids.
        if not self._repo.has_unmatched_requests():
            return MatchingSummary(pools_created=0, bookings_matched=0, total_cost=0.0)

        # Free previously-published (but not yet accepted) pools so we always
        # regroup against the full set of waiting requests.
        self._repo.reset_pending_pools()

        bookings = self._repo.list_matchable_bookings(limit=MAX_BOOKINGS_PER_PASS)
        if not bookings:
            self._repo.commit()
            return MatchingSummary(pools_created=0, bookings_matched=0, total_cost=0.0)

        # Manual address entry leaves coordinates null; geocode from the label so
        # every waiting request can be pooled and shown on the map.
        for booking in bookings:
            _ensure_coordinates(booking)

        with_coords = [b for b in bookings if booking_has_coordinates(b)]
        without_coords = [b for b in bookings if not booking_has_coordinates(b)]

        pools_created = 0
        bookings_matched = 0
        total_cost = 0.0

        if with_coords:
            count = len(with_coords)
            pool_count = max(1, ceil(count / DEFAULT_MAX_POOL_SIZE))
            result = optimize_booking_pools(with_coords, pool_count=pool_count)
            total_cost = result.total_cost
            booking_by_id = {str(b.id): b for b in with_coords}

            for plan in result.pools:
                members = [booking_by_id[uid] for uid in plan.user_ids]
                dropoff_ids = [UUID(uid) for uid in plan.dropoff_order]
                self._repo.create_pool(members, dropoff_order_ids=dropoff_ids)
                pools_created += 1
                bookings_matched += len(members)

        # Requests without coordinates can't be optimized; publish them solo so
        # they still reach a driver.
        for booking in without_coords:
            self._repo.create_pool([booking])
            pools_created += 1
            bookings_matched += 1

        self._repo.commit()
        return MatchingSummary(
            pools_created=pools_created,
            bookings_matched=bookings_matched,
            total_cost=total_cost,
        )


def _ensure_coordinates(booking) -> None:
    """Fill missing pickup/dropoff coordinates by geocoding the labels."""
    if booking_has_coordinates(booking):
        return
    pickup = geocode(booking.pickup_label)
    dropoff = geocode(booking.dropoff_label)
    if pickup is not None:
        booking.pickup_latitude = Decimal(str(round(pickup.lat, 6)))
        booking.pickup_longitude = Decimal(str(round(pickup.lng, 6)))
    if dropoff is not None:
        booking.dropoff_latitude = Decimal(str(round(dropoff.lat, 6)))
        booking.dropoff_longitude = Decimal(str(round(dropoff.lng, 6)))
