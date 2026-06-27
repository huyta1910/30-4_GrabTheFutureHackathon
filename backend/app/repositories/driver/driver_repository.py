from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.driver import Driver
from app.repositories.base import BaseRepository


class DriverRepository(BaseRepository[Driver]):
    """Data access for the Driver aggregate."""

    def __init__(self, session: Session) -> None:
        super().__init__(Driver, session)

    def get_by_user_id(self, user_id: UUID) -> Driver | None:
        statement = select(Driver).where(Driver.user_id == user_id)
        return self.session.scalars(statement).first()

    def update_availability(self, driver: Driver, availability_status: str) -> Driver:
        driver.availability_status = availability_status
        self.session.add(driver)
        self.session.commit()
        self.session.refresh(driver)
        return driver

    def update_vehicle(self, driver: Driver, vehicle_label: str) -> Driver:
        driver.vehicle_label = vehicle_label
        self.session.add(driver)
        self.session.commit()
        self.session.refresh(driver)
        return driver
