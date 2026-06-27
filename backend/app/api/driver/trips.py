from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query

from app.dependencies.driver import TripServiceDep
from app.schemas.common import ApiResponse, PaginatedResponse
from app.schemas.driver.trip import (
    DriverTripDetail,
    DriverTripStatus,
    TripStatusUpdate,
)

router = APIRouter()


@router.get("/{driver_id}/trips", response_model=ApiResponse[PaginatedResponse[DriverTripDetail]])
async def list_driver_trips(
    driver_id: UUID,
    service: TripServiceDep,
    statuses: Annotated[list[DriverTripStatus] | None, Query(alias="status")] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> ApiResponse[PaginatedResponse[DriverTripDetail]]:
    status_values = tuple(item.value for item in statuses) if statuses else None
    trips = service.list_trips(driver_id, status_values, page, page_size)
    return ApiResponse(data=trips, message="Driver trips")


@router.get(
    "/{driver_id}/trips/{trip_id}",
    response_model=ApiResponse[DriverTripDetail],
)
async def get_driver_trip(
    driver_id: UUID,
    trip_id: UUID,
    service: TripServiceDep,
) -> ApiResponse[DriverTripDetail]:
    trip = service.get_trip_detail(driver_id, trip_id)
    return ApiResponse(data=trip, message="Trip detail")


@router.patch(
    "/{driver_id}/trips/{trip_id}/status",
    response_model=ApiResponse[DriverTripDetail],
)
async def update_driver_trip_status(
    driver_id: UUID,
    trip_id: UUID,
    payload: TripStatusUpdate,
    service: TripServiceDep,
) -> ApiResponse[DriverTripDetail]:
    trip = service.update_status(driver_id, trip_id, payload)
    return ApiResponse(data=trip, message="Trip status updated")
