"""
Health Check Endpoints

Provides health check, readiness, and liveness endpoints for
monitoring and orchestration (Kubernetes, Docker Swarm, etc.)
"""

from datetime import datetime
from fastapi import APIRouter, Depends, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import settings
from app.db import get_db
from app.schemas import HealthResponse


router = APIRouter()


@router.get(
    "/healthz",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Health Check",
    description="Check application health and dependency status"
)
async def health_check(db: AsyncSession = Depends(get_db)) -> HealthResponse:
    """
    Comprehensive health check endpoint.
    
    Checks the status of:
    - Application (always healthy if endpoint is reached)
    - Database connection
    - Redis connection (if configured)
    
    Returns:
        HealthResponse: Health status information
    """
    # Check database connection
    db_status = "healthy"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    # Check Redis connection (optional)
    redis_status = None
    if settings.redis_host:
        try:
            # Import redis here to make it optional
            import redis.asyncio as redis
            redis_client = redis.from_url(settings.redis_url)
            await redis_client.ping()
            redis_status = "healthy"
            await redis_client.close()
        except Exception as e:
            redis_status = f"unhealthy: {str(e)}"
    
    # Determine overall health
    overall_status = "healthy" if db_status == "healthy" else "unhealthy"
    
    return HealthResponse(
        status=overall_status,
        version=settings.app_version,
        environment=settings.environment,
        timestamp=datetime.utcnow(),
        database=db_status,
        redis=redis_status
    )


@router.get(
    "/health/ready",
    status_code=status.HTTP_200_OK,
    summary="Readiness Check",
    description="Check if application is ready to accept traffic"
)
async def readiness_check(db: AsyncSession = Depends(get_db)) -> dict:
    """
    Kubernetes readiness probe endpoint.
    
    Checks if the application is ready to handle requests.
    Returns 200 if ready, 503 if not ready.
    
    Returns:
        dict: Readiness status
    """
    try:
        # Check database is accessible
        await db.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Service not ready: {str(e)}"
        )


@router.get(
    "/health/live",
    status_code=status.HTTP_200_OK,
    summary="Liveness Check",
    description="Check if application is alive"
)
async def liveness_check() -> dict:
    """
    Kubernetes liveness probe endpoint.
    
    Simple check to verify the application is running.
    Returns 200 if alive.
    
    Returns:
        dict: Liveness status
    """
    return {"status": "alive"}
