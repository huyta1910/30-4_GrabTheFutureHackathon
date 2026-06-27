from uuid import UUID

from fastapi import APIRouter

from app.dependencies.driver import DriverServiceDep
from app.schemas.common import ApiResponse
from app.schemas.driver.dashboard import DriverDashboard
from app.schemas.driver.driver import AvailabilityUpdate, DriverRead

router = APIRouter()


@router.get("/{driver_id}/dashboard", response_model=ApiResponse[DriverDashboard])
async def get_driver_dashboard(
    driver_id: UUID,
    service: DriverServiceDep,
) -> ApiResponse[DriverDashboard]:
    dashboard = service.get_dashboard(driver_id)
    return ApiResponse(data=dashboard, message="Driver dashboard")


@router.patch("/{driver_id}/availability", response_model=ApiResponse[DriverRead])
async def update_driver_availability(
    driver_id: UUID,
    payload: AvailabilityUpdate,
    service: DriverServiceDep,
) -> ApiResponse[DriverRead]:
    driver = service.update_availability(driver_id, payload)
    return ApiResponse(data=driver, message="Availability updated")
