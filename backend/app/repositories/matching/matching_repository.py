from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.booking import Booking
from app.models.driver import Driver
from app.models.notification import Notification
from app.models.passenger import Passenger
from app.models.ride_pool_group import RidePoolGroup
from app.models.ride_pool_member import RidePoolMember
from app.models.trip_history import TripHistory

# Booking states the matcher is allowed to (re)group. Anything that has been
# accepted by a driver (booking -> "assigned", group -> "active") is left alone.
REMATCHABLE_BOOKING_STATUSES = ("matching", "matched")

# Driver availability values that count as "free to take a pool". The demo seed
# marks drivers "active"; the driver app toggles "online" via the API.
AVAILABLE_DRIVER_STATUSES = ("active", "online")


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

    def list_available_drivers(self) -> list[Driver]:
        """Available drivers with a known location who are free to take a pool.

        Drivers already serving an active pool are excluded so the optimizer
        never reshuffles a trip that is already under way.
        """
        busy_driver_ids = (
            select(RidePoolGroup.driver_id)
            .where(RidePoolGroup.status == "active")
            .where(RidePoolGroup.driver_id.is_not(None))
        )
        stmt = (
            select(Driver)
            .where(Driver.availability_status.in_(AVAILABLE_DRIVER_STATUSES))
            .where(Driver.current_latitude.is_not(None))
            .where(Driver.current_longitude.is_not(None))
            .where(Driver.id.not_in(busy_driver_ids))
        )
        return list(self.session.scalars(stmt).all())

    def list_pending_pools_with_members(
        self,
    ) -> list[tuple[RidePoolGroup, list[tuple[RidePoolMember, Booking | None]]]]:
        """Pending pools paired with their members and underlying bookings."""
        groups = self.session.scalars(
            select(RidePoolGroup).where(RidePoolGroup.status == "pending")
        ).all()

        result: list[tuple[RidePoolGroup, list[tuple[RidePoolMember, Booking | None]]]] = []
        for group in groups:
            rows = self.session.execute(
                select(RidePoolMember, Booking)
                .join(Booking, Booking.id == RidePoolMember.booking_id, isouter=True)
                .where(RidePoolMember.ride_pool_group_id == group.id)
                .order_by(RidePoolMember.created_at)
            ).all()
            result.append((group, [(row[0], row[1]) for row in rows]))
        return result

    def assign_pool_to_driver(
        self,
        group: RidePoolGroup,
        driver: Driver,
        members_with_bookings: list[tuple[RidePoolMember, Booking | None]],
    ) -> None:
        """Attach an optimizer-chosen driver to a pool (without committing).

        Mirrors ``PoolRepository.confirm_assignment`` (activate the group, confirm
        members, move bookings to ``assigned``, open trip rows, notify both sides)
        but leaves the commit to the matching pass so the whole run is one
        transaction.
        """
        group.status = "active"
        group.driver_id = driver.id
        self.session.add(group)

        for member, booking in members_with_bookings:
            member.status = "confirmed"
            self.session.add(member)
            if booking is None:
                continue
            booking.status = "assigned"
            self.session.add(booking)
            self.session.add(
                TripHistory(
                    booking_id=booking.id,
                    driver_id=driver.id,
                    status="assigned",
                )
            )
            passenger = self.session.get(Passenger, booking.passenger_id)
            if passenger is not None:
                self.session.add(
                    Notification(
                        user_id=passenger.user_id,
                        title="Driver assigned",
                        body=(
                            "A driver has been matched to your pool and is heading to "
                            f"{booking.pickup_label}."
                        ),
                        status="unread",
                    )
                )

        self.session.add(
            Notification(
                user_id=driver.user_id,
                title="Pool assigned",
                body=f"You were matched to a pool with {len(members_with_bookings)} rider(s).",
                status="unread",
            )
        )
        self.session.flush()

    def commit(self) -> None:
        self.session.commit()
