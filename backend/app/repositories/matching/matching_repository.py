from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.booking import Booking
from app.models.ride_pool_group import RidePoolGroup
from app.models.ride_pool_member import RidePoolMember

# Booking states the matcher is allowed to (re)group. Anything that has been
# accepted by a driver (booking -> "assigned", group -> "active") is left alone.
REMATCHABLE_BOOKING_STATUSES = ("matching", "matched")


class MatchingRepository:
    """Data access for the AI pooling matcher."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def reset_pending_pools(self) -> None:
        """Tear down un-accepted pools so the matcher can regroup from scratch.

        Only pending groups whose members are all still rematchable are removed;
        seeded/active pools (bookings already confirmed) are left untouched. The
        freed bookings are returned to the ``matching`` queue.
        """
        pending = self.session.scalars(
            select(RidePoolGroup).where(RidePoolGroup.status == "pending")
        ).all()

        for group in pending:
            members = self.session.scalars(
                select(RidePoolMember).where(RidePoolMember.ride_pool_group_id == group.id)
            ).all()
            bookings = [self.session.get(Booking, m.booking_id) for m in members]

            if not all(
                b is not None and b.status in REMATCHABLE_BOOKING_STATUSES for b in bookings
            ):
                continue

            # Delete children first and flush so the group delete below does not
            # violate the members FK (no ORM relationship to order it for us).
            for member in members:
                self.session.delete(member)
            self.session.flush()

            for booking in bookings:
                if booking is not None:
                    booking.status = "matching"
                    self.session.add(booking)
            self.session.delete(group)
            self.session.flush()

    def has_unmatched_requests(self) -> bool:
        """True when at least one ride request is still waiting to be pooled."""
        stmt = select(Booking.id).where(Booking.status == "matching").limit(1)
        return self.session.scalar(stmt) is not None

    def list_matchable_bookings(self, limit: int = 10) -> list[Booking]:
        stmt = (
            select(Booking)
            .where(Booking.status == "matching")
            .order_by(Booking.requested_at)
            .limit(limit)
        )
        return list(self.session.scalars(stmt).all())

    def create_pool(
        self,
        bookings: list[Booking],
        dropoff_order_ids: list[UUID] | None = None,
    ) -> RidePoolGroup:
        """Create a pending pool from a set of bookings and mark them matched."""
        origin = bookings[0].pickup_label
        # Destination area = the final drop-off in the optimized order, if given.
        if dropoff_order_ids:
            last_id = dropoff_order_ids[-1]
            last = next((b for b in bookings if b.id == last_id), bookings[-1])
            destination = last.dropoff_label
        else:
            destination = bookings[-1].dropoff_label

        group = RidePoolGroup(
            status="pending",
            origin_area=origin,
            destination_area=destination,
        )
        self.session.add(group)
        self.session.flush()

        for booking in bookings:
            self.session.add(
                RidePoolMember(
                    ride_pool_group_id=group.id,
                    booking_id=booking.id,
                    status="pending",
                )
            )
            booking.status = "matched"
            self.session.add(booking)

        return group

    def commit(self) -> None:
        self.session.commit()
