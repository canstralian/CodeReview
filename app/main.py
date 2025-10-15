"""
FastAPI Application Entry Point

Main application setup with middleware, exception handlers, and observability features.
"""

import time
import uuid
from contextlib import asynccontextmanager
from typing import Any, Dict

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import Counter, Histogram, generate_latest
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.exceptions import (
    AppException,
    app_exception_handler,
    generic_exception_handler,
    validation_exception_handler,
)
from app.db.session import close_db, init_db

# Import routers
# from app.api import repositories, analysis, health

# Prometheus metrics
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"]
)

REQUEST_DURATION = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint"]
)


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Middleware to add unique request ID to each request."""
    
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        
        return response


class MetricsMiddleware(BaseHTTPMiddleware):
    """Middleware to collect Prometheus metrics."""
    
    async def dispatch(self, request: Request, call_next):
        if not settings.prometheus_enabled:
            return await call_next(request)
        
        start_time = time.time()
        
        response = await call_next(request)
        
        duration = time.time() - start_time
        
        # Record metrics
        REQUEST_COUNT.labels(
            method=request.method,
            endpoint=request.url.path,
            status=response.status_code
        ).inc()
        
        REQUEST_DURATION.labels(
            method=request.method,
            endpoint=request.url.path
        ).observe(duration)
        
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    
    Handles startup and shutdown events.
    """
    # Startup
    print(f"Starting {settings.app_name} v{settings.app_version}")
    print(f"Environment: {settings.environment}")
    print(f"Debug mode: {settings.debug}")
    
    # Initialize database
    await init_db()
    print("Database initialized")
    
    # Initialize OpenTelemetry if enabled
    if settings.opentelemetry_enabled:
        print("OpenTelemetry tracing enabled")
        # TODO: Initialize OpenTelemetry
    
    # Initialize Sentry if configured
    if settings.sentry_dsn:
        import sentry_sdk
        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            traces_sample_rate=settings.sentry_traces_sample_rate,
            environment=settings.environment,
        )
        print("Sentry error tracking initialized")
    
    yield
    
    # Shutdown
    print("Shutting down application")
    await close_db()
    print("Database connections closed")


def create_application() -> FastAPI:
    """
    Create and configure the FastAPI application.
    
    Returns:
        FastAPI: Configured application instance
    """
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="A modern, scalable code review and analysis platform",
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
        openapi_url="/openapi.json" if settings.debug else None,
        lifespan=lifespan,
    )
    
    # Add trusted host middleware
    if settings.allowed_hosts != ["*"]:
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts)
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Add compression middleware
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    
    # Add custom middleware
    app.add_middleware(RequestIDMiddleware)
    if settings.prometheus_enabled:
        app.add_middleware(MetricsMiddleware)
    
    # Register exception handlers
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)
    
    # Health check endpoint
    @app.get("/healthz", tags=["monitoring"], status_code=status.HTTP_200_OK)
    async def health_check() -> Dict[str, Any]:
        """
        Health check endpoint for operational monitoring.
        
        Returns:
            dict: Application health status
        """
        return {
            "status": "healthy",
            "version": settings.app_version,
            "environment": settings.environment,
        }
    
    # Readiness check endpoint
    @app.get("/readyz", tags=["monitoring"], status_code=status.HTTP_200_OK)
    async def readiness_check() -> Dict[str, Any]:
        """
        Readiness check endpoint for operational monitoring.
        
        Verifies that the application is ready to accept traffic.
        
        Returns:
            dict: Application readiness status
        """
        # TODO: Add database connectivity check
        # TODO: Add Redis connectivity check
        # TODO: Add external service connectivity checks
        
        return {
            "status": "ready",
            "version": settings.app_version,
            "checks": {
                "database": "ok",
                "redis": "ok",
            }
        }
    
    # Prometheus metrics endpoint
    if settings.prometheus_enabled:
        @app.get("/metrics", tags=["monitoring"])
        async def metrics():
            """
            Prometheus metrics endpoint.
            
            Returns:
                Response: Prometheus metrics in text format
            """
            from fastapi.responses import PlainTextResponse
            return PlainTextResponse(generate_latest())
    
    # Include API routers
    # app.include_router(repositories.router, prefix="/api/repositories", tags=["repositories"])
    # app.include_router(analysis.router, prefix="/api/analysis", tags=["analysis"])
    # app.include_router(health.router, prefix="/api", tags=["health"])
    
    return app


# Create application instance
app = create_application()
