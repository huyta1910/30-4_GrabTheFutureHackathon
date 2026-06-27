from uuid import UUID

from fastapi import APIRouter, Query

from app.dependencies.driver import NotificationServiceDep
from app.schemas.common import ApiResponse
from app.schemas.driver.notification import DriverNotification, PaginatedNotifications

router = APIRouter()


@router.get(
    "/{driver_id}/notifications",
    response_model=ApiResponse[PaginatedNotifications],
)
async def list_notifications(
    driver_id: UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    service: NotificationServiceDep = ...,
) -> ApiResponse[PaginatedNotifications]:
    data = service.list_notifications(driver_id, page, page_size)
    return ApiResponse(data=data, message="Notifications")


@router.patch(
    "/{driver_id}/notifications/{notification_id}/read",
    response_model=ApiResponse[DriverNotification],
)
async def mark_notification_read(
    driver_id: UUID,
    notification_id: UUID,
    service: NotificationServiceDep = ...,
) -> ApiResponse[DriverNotification]:
    data = service.mark_read(driver_id, notification_id)
    return ApiResponse(data=data, message="Notification marked as read")
