"""
Prometheus Metrics Endpoints

Provides Prometheus metrics for monitoring application performance
and health. Includes custom metrics for repository analysis and API usage.
"""

from fastapi import APIRouter, Response
from prometheus_client import (
    Counter,
    Histogram,
    Gauge,
    generate_latest,
    CONTENT_TYPE_LATEST
)


router = APIRouter()


# Define custom metrics
# Request counters
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

# Request duration histogram
http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint']
)

# Repository metrics
repositories_total = Gauge(
    'repositories_total',
    'Total number of repositories analyzed'
)

code_issues_total = Gauge(
    'code_issues_total',
    'Total number of code issues detected',
    ['severity']
)

# AI analysis metrics
ai_analysis_requests_total = Counter(
    'ai_analysis_requests_total',
    'Total number of AI analysis requests'
)

ai_analysis_duration_seconds = Histogram(
    'ai_analysis_duration_seconds',
    'AI analysis duration in seconds'
)

# GitHub API metrics
github_api_requests_total = Counter(
    'github_api_requests_total',
    'Total number of GitHub API requests',
    ['status']
)

# Database metrics
db_connections_active = Gauge(
    'db_connections_active',
    'Number of active database connections'
)

db_query_duration_seconds = Histogram(
    'db_query_duration_seconds',
    'Database query duration in seconds',
    ['operation']
)


@router.get(
    "/metrics",
    response_class=Response,
    summary="Prometheus Metrics",
    description="Expose Prometheus metrics for monitoring"
)
async def metrics() -> Response:
    """
    Prometheus metrics endpoint.
    
    Returns metrics in Prometheus exposition format for scraping
    by Prometheus server.
    
    Returns:
        Response: Prometheus metrics in text format
    """
    metrics_output = generate_latest()
    return Response(
        content=metrics_output,
        media_type=CONTENT_TYPE_LATEST
    )
