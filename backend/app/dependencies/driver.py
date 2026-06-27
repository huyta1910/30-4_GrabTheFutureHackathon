from typing import Annotated

from fastapi import Depends

from app.dependencies.database import DatabaseSession
from app.repositories.driver.driver_repository import DriverRepository
from app.repositories.driver.notification_repository import DriverNotificationRepository
from app.repositories.driver.pool_repository import PoolRepository
from app.repositories.driver.trip_repository import DriverTripRepository
from app.repositories.driver.user_repository import UserRepository
from app.services.driver.driver_service import DriverService
from app.services.driver.earnings_service import EarningsService
from app.services.driver.notification_service import NotificationService
from app.services.driver.pool_service import PoolService
from app.services.driver.profile_service import ProfileService
from app.services.driver.trip_service import TripService


def get_driver_repository(session: DatabaseSession) -> DriverRepository:
    return DriverRepository(session)


def get_driver_trip_repository(session: DatabaseSession) -> DriverTripRepository:
    return DriverTripRepository(session)


def get_pool_repository(session: DatabaseSession) -> PoolRepository:
    return PoolRepository(session)


def get_notification_repository(session: DatabaseSession) -> DriverNotificationRepository:
    return DriverNotificationRepository(session)


def get_user_repository(session: DatabaseSession) -> UserRepository:
    return UserRepository(session)


def get_driver_service(
    driver_repository: Annotated[DriverRepository, Depends(get_driver_repository)],
    trip_repository: Annotated[DriverTripRepository, Depends(get_driver_trip_repository)],
) -> DriverService:
    return DriverService(driver_repository, trip_repository)


def get_trip_service(
    trip_repository: Annotated[DriverTripRepository, Depends(get_driver_trip_repository)],
) -> TripService:
    return TripService(trip_repository)


def get_earnings_service(
    driver_repository: Annotated[DriverRepository, Depends(get_driver_repository)],
    trip_repository: Annotated[DriverTripRepository, Depends(get_driver_trip_repository)],
) -> EarningsService:
    return EarningsService(driver_repository, trip_repository)


def get_pool_service(
    pool_repository: Annotated[PoolRepository, Depends(get_pool_repository)],
) -> PoolService:
    return PoolService(pool_repository)


def get_notification_service(
    driver_repository: Annotated[DriverRepository, Depends(get_driver_repository)],
    notification_repository: Annotated[
        DriverNotificationRepository, Depends(get_notification_repository)
    ],
) -> NotificationService:
    return NotificationService(driver_repository, notification_repository)


def get_profile_service(
    driver_repository: Annotated[DriverRepository, Depends(get_driver_repository)],
    user_repository: Annotated[UserRepository, Depends(get_user_repository)],
) -> ProfileService:
    return ProfileService(driver_repository, user_repository)


DriverServiceDep = Annotated[DriverService, Depends(get_driver_service)]
TripServiceDep = Annotated[TripService, Depends(get_trip_service)]
EarningsServiceDep = Annotated[EarningsService, Depends(get_earnings_service)]
PoolServiceDep = Annotated[PoolService, Depends(get_pool_service)]
NotificationServiceDep = Annotated[NotificationService, Depends(get_notification_service)]
ProfileServiceDep = Annotated[ProfileService, Depends(get_profile_service)]
