from fastapi import APIRouter

from app.api.matching.dependencies import MatchingServiceDependency
from app.schemas.common import ApiResponse
from app.schemas.matching import MatchingSummary

router = APIRouter(prefix="/matching", tags=["matching"])


@router.post("/run", response_model=ApiResponse[MatchingSummary])
async def run_matching(service: MatchingServiceDependency) -> ApiResponse[MatchingSummary]:
    """Trigger an AI pooling pass over all waiting ride requests."""
    summary = service.run()
    return ApiResponse(message="Matching completed.", data=summary)
