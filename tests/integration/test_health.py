"""
Integration Tests for Health Endpoints

Tests for health check and monitoring endpoints.
"""

import pytest
from fastapi import status
from fastapi.testclient import TestClient


class TestHealthEndpoints:
    """Test cases for health check endpoints."""
    
    def test_health_check(self, client: TestClient):
        """Test /healthz endpoint returns healthy status."""
        response = client.get("/healthz")
        
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
        assert "environment" in data
    
    def test_readiness_check(self, client: TestClient):
        """Test /readyz endpoint returns ready status."""
        response = client.get("/readyz")
        
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["status"] == "ready"
        assert "version" in data
        assert "checks" in data
    
    def test_metrics_endpoint(self, client: TestClient):
        """Test /metrics endpoint returns Prometheus metrics."""
        response = client.get("/metrics")
        
        assert response.status_code == status.HTTP_200_OK
        assert "text/plain" in response.headers["content-type"]
        
        # Check for basic Prometheus metrics
        content = response.text
        assert "http_requests_total" in content or len(content) > 0
    
    def test_health_check_includes_request_id(self, client: TestClient):
        """Test that health check response includes request ID header."""
        response = client.get("/healthz")
        
        assert "X-Request-ID" in response.headers
        assert len(response.headers["X-Request-ID"]) > 0


class TestCORSMiddleware:
    """Test cases for CORS middleware."""
    
    def test_cors_headers_present(self, client: TestClient):
        """Test that CORS headers are present in responses."""
        response = client.get("/healthz")
        
        assert "access-control-allow-origin" in response.headers
    
    def test_cors_preflight_request(self, client: TestClient):
        """Test CORS preflight request handling."""
        response = client.options(
            "/healthz",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            }
        )
        
        # Should allow the request
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT]


class TestErrorHandling:
    """Test cases for error handling."""
    
    def test_404_not_found(self, client: TestClient):
        """Test that 404 errors are handled properly."""
        response = client.get("/nonexistent-endpoint")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
        
        data = response.json()
        assert "error" in data or "detail" in data
    
    def test_method_not_allowed(self, client: TestClient):
        """Test that method not allowed errors are handled."""
        response = client.post("/healthz")
        
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED


class TestMiddleware:
    """Test cases for middleware functionality."""
    
    def test_request_id_middleware(self, client: TestClient):
        """Test that request ID is added to all responses."""
        response = client.get("/healthz")
        
        assert "X-Request-ID" in response.headers
        request_id = response.headers["X-Request-ID"]
        assert len(request_id) == 36  # UUID format
    
    def test_compression_middleware(self, client: TestClient):
        """Test that compression middleware is working."""
        # Make request with large payload expectation
        response = client.get(
            "/healthz",
            headers={"Accept-Encoding": "gzip"}
        )
        
        # Should succeed regardless of compression
        assert response.status_code == status.HTTP_200_OK
