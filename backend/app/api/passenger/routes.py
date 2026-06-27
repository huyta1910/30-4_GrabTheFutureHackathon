from uuid import UUID

from fastapi import APIRouter, Query, status

from app.api.passenger.dependencies import PassengerServiceDependency
from app.schemas.common import ApiResponse
from app.schemas.passenger import (
    NotificationRead,
    PassengerDashboardRead,
    PassengerProfileRead,
    PassengerProfileUpdate,
    RideHistoryRead,
    RideRequestCreate,
    RideRequestRead,
    RideStatusRead,
)

router = APIRouter(prefix="/passengers", tags=["passenger"])


@router.get("/{passenger_id}/dashboard", response_model=ApiResponse[PassengerDashboardRead])
async def get_dashboard(
    passenger_id: UUID,
    service: PassengerServiceDependency,
) -> ApiResponse[PassengerDashboardRead]:
    return ApiResponse(
        message="Passenger dashboard loaded.",
        data=service.get_dashboard(passenger_id),
    )


@router.get("/{passenger_id}/profile", response_model=ApiResponse[PassengerProfileRead])
async def get_profile(
    passenger_id: UUID,
    service: PassengerServiceDependency,
) -> ApiResponse[PassengerProfileRead]:
    return ApiResponse(
        message="Passenger profile loaded.",
        data=service.get_profile(passenger_id),
    )


@router.patch("/{passenger_id}/profile", response_model=ApiResponse[PassengerProfileRead])
async def update_profile(
    passenger_id: UUID,
    payload: PassengerProfileUpdate,
    service: PassengerServiceDependency,
) -> ApiResponse[PassengerProfileRead]:
    return ApiResponse(
        message="Passenger profile updated.",
        data=service.update_profile(passenger_id, payload.display_name),
    )


@router.post(
    "/{passenger_id}/rides",
    response_model=ApiResponse[RideRequestRead],
    status_code=status.HTTP_201_CREATED,
)
async def request_ride(
    passenger_id: UUID,
    payload: RideRequestCreate,
    service: PassengerServiceDependency,
) -> ApiResponse[RideRequestRead]:
    return ApiResponse(
        message="Ride request created.",
        data=service.request_ride(passenger_id, payload),
    )


@router.get("/{passenger_id}/rides/status", response_model=ApiResponse[RideStatusRead])
async def get_ride_status(
    passenger_id: UUID,
    service: PassengerServiceDependency,
) -> ApiResponse[RideStatusRead]:
    return ApiResponse(
        message="Ride status loaded.",
        data=service.get_ride_status(passenger_id),
    )


@router.patch("/{passenger_id}/rides/current/cancel", response_model=ApiResponse[RideRequestRead])
async def cancel_current_ride(
    passenger_id: UUID,
    service: PassengerServiceDependency,
) -> ApiResponse[RideRequestRead]:
    return ApiResponse(
        message="Current ride request cancelled.",
        data=service.cancel_current_ride(passenger_id),
    )


@router.get("/{passenger_id}/rides/history", response_model=ApiResponse[list[RideHistoryRead]])
async def get_ride_history(
    passenger_id: UUID,
    service: PassengerServiceDependency,
    limit: int = Query(default=10, ge=1, le=50),
) -> ApiResponse[list[RideHistoryRead]]:
    return ApiResponse(
        message="Ride history loaded.",
        data=service.get_ride_history(passenger_id, limit=limit),
    )


@router.get("/{passenger_id}/notifications", response_model=ApiResponse[list[NotificationRead]])
async def get_notifications(
    passenger_id: UUID,
    service: PassengerServiceDependency,
) -> ApiResponse[list[NotificationRead]]:
    return ApiResponse(
        message="Passenger notifications loaded.",
        data=service.get_notifications(passenger_id),
    )


@router.patch(
    "/{passenger_id}/notifications/{notification_id}/read",
    response_model=ApiResponse[NotificationRead],
)
async def mark_notification_read(
    passenger_id: UUID,
    notification_id: UUID,
    service: PassengerServiceDependency,
) -> ApiResponse[NotificationRead]:
    return ApiResponse(
        message="Notification marked as read.",
        data=service.mark_notification_read(passenger_id, notification_id),
    )
