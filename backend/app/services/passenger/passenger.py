from uuid import UUID

from fastapi import HTTPException, status

from app.models.booking import Booking
from app.models.passenger import Passenger
from app.repositories.passenger import PassengerRepository
from app.schemas.passenger import (
    NotificationRead,
    PassengerDashboardRead,
    PassengerProfileRead,
    RideHistoryRead,
    RideRequestCreate,
    RideRequestRead,
    RideStatusRead,
)


class PassengerService:
    def __init__(self, repository: PassengerRepository) -> None:
        self.repository = repository

    def get_dashboard(self, passenger_id: UUID) -> PassengerDashboardRead:
        passenger = self._get_passenger(passenger_id)
        return PassengerDashboardRead(
            profile=PassengerProfileRead.model_validate(passenger),
            current_ride=self._ride_to_schema(self.repository.get_current_ride(passenger_id)),
            recent_rides=self.get_ride_history(passenger_id, limit=5),
            notifications=[
                NotificationRead.model_validate(notification)
                for notification in self.repository.list_notifications(passenger.user_id, limit=5)
            ],
        )

    def get_profile(self, passenger_id: UUID) -> PassengerProfileRead:
        return PassengerProfileRead.model_validate(self._get_passenger(passenger_id))

    def update_profile(self, passenger_id: UUID, display_name: str) -> PassengerProfileRead:
        passenger = self.repository.update_profile(self._get_passenger(passenger_id), display_name)
        return PassengerProfileRead.model_validate(passenger)

    def request_ride(self, passenger_id: UUID, payload: RideRequestCreate) -> RideRequestRead:
        self._get_passenger(passenger_id)
        active_ride = self.repository.get_current_ride(passenger_id)
        if active_ride is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Passenger already has an active ride request.",
            )

        booking = self.repository.create_ride_request(
            passenger_id=passenger_id,
            pickup_label=payload.pickup_label,
            dropoff_label=payload.dropoff_label,
        )
        return RideRequestRead.model_validate(booking)

    def get_ride_status(self, passenger_id: UUID) -> RideStatusRead:
        self._get_passenger(passenger_id)
        current_ride = self.repository.get_current_ride(passenger_id)
        return RideStatusRead(
            current_ride=self._ride_to_schema(current_ride),
            next_step=self._next_step_for(current_ride),
        )

    def cancel_current_ride(self, passenger_id: UUID) -> RideRequestRead:
        self._get_passenger(passenger_id)
        current_ride = self.repository.get_current_ride(passenger_id)
        if current_ride is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Passenger does not have an active ride request.",
            )

        if current_ride.status not in {"requested", "matching"}:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This ride can no longer be cancelled by the passenger.",
            )

        return RideRequestRead.model_validate(self.repository.cancel_ride_request(current_ride))

    def get_ride_history(self, passenger_id: UUID, limit: int = 10) -> list[RideHistoryRead]:
        self._get_passenger(passenger_id)
        history = self.repository.list_ride_history(passenger_id=passenger_id, limit=limit)
        return [
            RideHistoryRead(
                id=trip.id,
                booking_id=booking.id,
                pickup_label=booking.pickup_label,
                dropoff_label=booking.dropoff_label,
                status=trip.status,
                requested_at=booking.requested_at,
                completed_at=trip.completed_at,
                total_fare=trip.total_fare,
            )
            for trip, booking in history
        ]

    def get_notifications(self, passenger_id: UUID) -> list[NotificationRead]:
        passenger = self._get_passenger(passenger_id)
        return [
            NotificationRead.model_validate(notification)
            for notification in self.repository.list_notifications(passenger.user_id)
        ]

    def mark_notification_read(self, passenger_id: UUID, notification_id: UUID) -> NotificationRead:
        passenger = self._get_passenger(passenger_id)
        notification = self.repository.mark_notification_read(notification_id, passenger.user_id)
        if notification is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification was not found for this passenger.",
            )
        return NotificationRead.model_validate(notification)

    def _get_passenger(self, passenger_id: UUID) -> Passenger:
        passenger = self.repository.get_by_id(passenger_id)
        if passenger is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Passenger was not found.",
            )
        return passenger

    @staticmethod
    def _ride_to_schema(ride: Booking | None) -> RideRequestRead | None:
        if ride is None:
            return None
        return RideRequestRead.model_validate(ride)

    @staticmethod
    def _next_step_for(ride: Booking | None) -> str:
        if ride is None:
            return "Request a ride to start pooling."

        next_steps = {
            "requested": "Matching your request with nearby pooled routes.",
            "matching": "Looking for compatible co-passengers and drivers.",
            "assigned": "A driver has been assigned and is heading to pickup.",
            "in_progress": "Ride is in progress.",
        }
        return next_steps.get(ride.status, "Ride status is being updated.")
