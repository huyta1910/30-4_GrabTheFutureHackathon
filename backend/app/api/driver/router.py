from fastapi import APIRouter

from app.api.driver.dashboard import router as dashboard_router
from app.api.driver.earnings import router as earnings_router
from app.api.driver.notifications import router as notifications_router
from app.api.driver.pool import router as pool_router
from app.api.driver.profile import router as profile_router
from app.api.driver.trips import router as trips_router

driver_router = APIRouter()
driver_router.include_router(dashboard_router)
driver_router.include_router(trips_router)
driver_router.include_router(earnings_router)
driver_router.include_router(pool_router)
driver_router.include_router(notifications_router)
driver_router.include_router(profile_router)
