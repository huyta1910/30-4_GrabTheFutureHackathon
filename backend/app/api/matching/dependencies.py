from typing import Annotated

from fastapi import Depends

from app.dependencies.database import DatabaseSession
from app.repositories.matching import MatchingRepository
from app.services.matching import MatchingService


def get_matching_repository(session: DatabaseSession) -> MatchingRepository:
    return MatchingRepository(session)


MatchingRepositoryDependency = Annotated[
    MatchingRepository,
    Depends(get_matching_repository),
]


def get_matching_service(repository: MatchingRepositoryDependency) -> MatchingService:
    return MatchingService(repository)


MatchingServiceDependency = Annotated[
    MatchingService,
    Depends(get_matching_service),
]
