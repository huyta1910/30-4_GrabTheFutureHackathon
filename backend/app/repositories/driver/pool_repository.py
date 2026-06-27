from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.booking import Booking
from app.models.ride_pool_group import RidePoolGroup
from app.models.ride_pool_member import RidePoolMember


class PoolRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_pending(self) -> list[RidePoolGroup]:
        stmt = (
            select(RidePoolGroup)
            .where(RidePoolGroup.status == "pending")
            .order_by(RidePoolGroup.created_at.desc())
        )
        return list(self.session.scalars(stmt).all())

    def get(self, group_id: UUID) -> RidePoolGroup | None:
        return self.session.get(RidePoolGroup, group_id)

    def get_members_with_bookings(
        self, group_id: UUID
    ) -> list[tuple[RidePoolMember, Booking | None]]:
        stmt = (
            select(RidePoolMember, Booking)
            .join(Booking, Booking.id == RidePoolMember.booking_id, isouter=True)
            .where(RidePoolMember.ride_pool_group_id == group_id)
            .order_by(RidePoolMember.created_at)
        )
        rows = self.session.execute(stmt).all()
        return [(row[0], row[1]) for row in rows]

    def save(self, group: RidePoolGroup) -> RidePoolGroup:
        self.session.add(group)
        self.session.commit()
        self.session.refresh(group)
        return group
