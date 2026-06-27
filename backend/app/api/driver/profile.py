from uuid import UUID

from fastapi import APIRouter

from app.dependencies.driver import ProfileServiceDep
from app.schemas.common import ApiResponse
from app.schemas.driver.profile import DriverProfile, DriverProfileUpdate

router = APIRouter()


@router.get("/{driver_id}/profile", response_model=ApiResponse[DriverProfile])
async def get_profile(
    driver_id: UUID,
    service: ProfileServiceDep,
) -> ApiResponse[DriverProfile]:
    data = service.get_profile(driver_id)
    return ApiResponse(data=data, message="Driver profile")


@router.patch("/{driver_id}/profile", response_model=ApiResponse[DriverProfile])
async def update_profile(
    driver_id: UUID,
    payload: DriverProfileUpdate,
    service: ProfileServiceDep,
) -> ApiResponse[DriverProfile]:
    data = service.update_profile(driver_id, payload)
    return ApiResponse(data=data, message="Profile updated")
