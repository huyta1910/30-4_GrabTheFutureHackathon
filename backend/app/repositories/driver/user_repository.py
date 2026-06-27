from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, user_id: UUID) -> User | None:
        return self.session.get(User, user_id)

    def update_name(self, user: User, full_name: str) -> User:
        user.full_name = full_name
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        return user
