from uuid import UUID

from fastapi import HTTPException, status

from app.repositories.driver.driver_repository import DriverRepository
from app.repositories.driver.notification_repository import DriverNotificationRepository
from app.schemas.driver.notification import DriverNotification, PaginatedNotifications


class NotificationService:
    def __init__(
        self,
        driver_repo: DriverRepository,
        notification_repo: DriverNotificationRepository,
    ) -> None:
        self._drivers = driver_repo
        self._notifications = notification_repo

    def list_notifications(
        self, driver_id: UUID, page: int, page_size: int
    ) -> PaginatedNotifications:
        driver = self._get_driver_or_404(driver_id)
        offset = (page - 1) * page_size
        items = self._notifications.list_for_user(driver.user_id, page_size, offset)
        total = self._notifications.count_for_user(driver.user_id)
        unread = self._notifications.count_unread(driver.user_id)
        return PaginatedNotifications(
            items=[DriverNotification.model_validate(n) for n in items],
            total=total,
            unread_count=unread,
        )

    def mark_read(self, driver_id: UUID, notification_id: UUID) -> DriverNotification:
        driver = self._get_driver_or_404(driver_id)
        notif = self._notifications.get(notification_id, driver.user_id)
        if notif is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found",
            )
        updated = self._notifications.mark_read(notif)
        return DriverNotification.model_validate(updated)

    def _get_driver_or_404(self, driver_id: UUID):
        driver = self._drivers.get(driver_id)
        if driver is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Driver not found",
            )
        return driver
