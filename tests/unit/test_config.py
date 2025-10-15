"""
Unit Tests for Configuration

Tests for configuration management and settings validation.
"""

import os
import pytest

from app.core.config import Settings, get_settings


class TestSettings:
    """Test cases for Settings class."""
    
    def test_default_settings(self):
        """Test that default settings are loaded correctly."""
        settings = Settings()
        
        assert settings.app_name == "CodeReview AI"
        assert settings.app_version == "2.0.0"
        assert settings.host == "0.0.0.0"
        assert settings.port == 8000
    
    def test_environment_override(self, monkeypatch):
        """Test that environment variables override default settings."""
        monkeypatch.setenv("APP_NAME", "Test App")
        monkeypatch.setenv("PORT", "9000")
        monkeypatch.setenv("DEBUG", "true")
        
        settings = Settings()
        
        assert settings.app_name == "Test App"
        assert settings.port == 9000
        assert settings.debug is True
    
    def test_database_url_validation(self):
        """Test database URL validation."""
        settings = Settings()
        db_url = settings.get_database_url()
        
        assert isinstance(db_url, str)
        assert "postgresql" in db_url
    
    def test_cors_origins_parsing_from_string(self):
        """Test CORS origins parsing from comma-separated string."""
        os.environ["ALLOWED_ORIGINS"] = "http://localhost:3000,https://example.com"
        settings = Settings()
        
        assert len(settings.allowed_origins) == 2
        assert "http://localhost:3000" in settings.allowed_origins
        assert "https://example.com" in settings.allowed_origins
    
    def test_cors_origins_parsing_from_list(self):
        """Test CORS origins parsing from list."""
        settings = Settings(
            allowed_origins=["http://localhost:3000", "https://example.com"]
        )
        
        assert len(settings.allowed_origins) == 2
    
    def test_secret_key_validation_production(self):
        """Test that secret key validation fails with default key in production."""
        with pytest.raises(ValueError, match="SECRET_KEY must be changed"):
            Settings(
                environment="production",
                secret_key="change-me-in-production"
            )
    
    def test_secret_key_validation_development(self):
        """Test that secret key validation passes in development."""
        settings = Settings(
            environment="development",
            secret_key="change-me-in-production"
        )
        
        assert settings.secret_key == "change-me-in-production"
    
    def test_get_settings_function(self):
        """Test get_settings function returns Settings instance."""
        settings = get_settings()
        
        assert isinstance(settings, Settings)
    
    def test_pool_size_validation(self):
        """Test database pool size validation."""
        settings = Settings(db_pool_size=5)
        assert settings.db_pool_size == 5
        
        # Test minimum value
        settings = Settings(db_pool_size=1)
        assert settings.db_pool_size == 1
    
    def test_rate_limit_configuration(self):
        """Test rate limiting configuration."""
        settings = Settings(
            rate_limit_enabled=True,
            rate_limit_requests=50,
            rate_limit_window=60
        )
        
        assert settings.rate_limit_enabled is True
        assert settings.rate_limit_requests == 50
        assert settings.rate_limit_window == 60
