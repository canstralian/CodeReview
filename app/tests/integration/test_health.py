"""
Integration tests for health check endpoints.
"""

import pytest
from fastapi.testclient import TestClient


def test_health_check(client: TestClient):
    """Test health check endpoint returns correct status."""
    response = client.get("/healthz")
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["status"] in ["healthy", "unhealthy"]
    assert "version" in data
    assert "environment" in data
    assert "database" in data
    assert "timestamp" in data


def test_readiness_check(client: TestClient):
    """Test readiness check endpoint."""
    response = client.get("/health/ready")
    
    # Should return 200 when ready
    assert response.status_code in [200, 503]
    data = response.json()
    
    if response.status_code == 200:
        assert data["status"] == "ready"


def test_liveness_check(client: TestClient):
    """Test liveness check endpoint."""
    response = client.get("/health/live")
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "alive"
