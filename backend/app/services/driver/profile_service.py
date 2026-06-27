from uuid import UUID

from fastapi import HTTPException, status

from app.repositories.driver.driver_repository import DriverRepository
from app.repositories.driver.user_repository import UserRepository
from app.schemas.driver.profile import DriverProfile, DriverProfileUpdate


class ProfileService:
    def __init__(
        self,
        driver_repo: DriverRepository,
        user_repo: UserRepository,
    ) -> None:
        self._drivers = driver_repo
        self._users = user_repo

    def get_profile(self, driver_id: UUID) -> DriverProfile:
        driver = self._get_driver_or_404(driver_id)
        user = self._users.get(driver.user_id)
        return self._build(driver, user)

    def update_profile(self, driver_id: UUID, payload: DriverProfileUpdate) -> DriverProfile:
        driver = self._get_driver_or_404(driver_id)
        user = self._users.get(driver.user_id)

        if payload.vehicle_label is not None:
            driver = self._drivers.update_vehicle(driver, payload.vehicle_label)
        if payload.full_name is not None and user is not None:
            user = self._users.update_name(user, payload.full_name)

        return self._build(driver, user)

    def _build(self, driver, user) -> DriverProfile:
        return DriverProfile(
            id=driver.id,
            user_id=driver.user_id,
            license_number=driver.license_number,
            vehicle_label=driver.vehicle_label,
            availability_status=driver.availability_status,
            full_name=user.full_name if user else "",
            email=user.email if user else "",
        )

    def _get_driver_or_404(self, driver_id: UUID):
        driver = self._drivers.get(driver_id)
        if driver is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Driver not found",
            )
        return driver
