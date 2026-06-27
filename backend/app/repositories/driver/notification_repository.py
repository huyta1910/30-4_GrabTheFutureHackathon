from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.notification import Notification


class DriverNotificationRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_for_user(self, user_id: UUID, limit: int, offset: int) -> list[Notification]:
        stmt = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(self.session.scalars(stmt).all())

    def count_for_user(self, user_id: UUID) -> int:
        stmt = (
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user_id)
        )
        return self.session.scalar(stmt) or 0

    def count_unread(self, user_id: UUID) -> int:
        stmt = (
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user_id, Notification.status == "unread")
        )
        return self.session.scalar(stmt) or 0

    def get(self, notification_id: UUID, user_id: UUID) -> Notification | None:
        stmt = select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
        return self.session.scalars(stmt).first()

    def mark_read(self, notification: Notification) -> Notification:
        notification.status = "read"
        self.session.add(notification)
        self.session.commit()
        self.session.refresh(notification)
        return notification
