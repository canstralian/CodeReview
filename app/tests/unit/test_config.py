"""
Unit tests for core configuration module.
"""

import pytest
from app.core.config import Settings, get_settings


def test_settings_default_values():
    """Test that settings have correct default values."""
    settings = Settings()
    
    assert settings.app_name == "CodeReview AI"
    assert settings.app_version == "1.0.0"
    assert settings.environment == "development"
    assert settings.port == 8000
    assert settings.debug is False


def test_settings_environment_validation():
    """Test that environment validation works correctly."""
    # Valid environments should work
    valid_envs = ["development", "staging", "production"]
    for env in valid_envs:
        settings = Settings(environment=env)
        assert settings.environment == env
    
    # Invalid environment should raise error
    with pytest.raises(ValueError):
        Settings(environment="invalid")


def test_settings_log_level_validation():
    """Test that log level validation works correctly."""
    valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
    for level in valid_levels:
        settings = Settings(log_level=level)
        assert settings.log_level == level.upper()
    
    # Invalid log level should raise error
    with pytest.raises(ValueError):
        Settings(log_level="INVALID")


def test_settings_redis_url_property():
    """Test Redis URL construction."""
    settings = Settings(
        redis_host="testhost",
        redis_port=6380,
        redis_db=1
    )
    assert settings.redis_url == "redis://testhost:6380/1"
    
    # Test with password
    settings_with_password = Settings(
        redis_host="testhost",
        redis_port=6380,
        redis_password="secret",
        redis_db=1
    )
    assert settings_with_password.redis_url == "redis://:secret@testhost:6380/1"


def test_settings_is_production():
    """Test is_production property."""
    prod_settings = Settings(environment="production")
    assert prod_settings.is_production is True
    
    dev_settings = Settings(environment="development")
    assert dev_settings.is_production is False


def test_settings_is_development():
    """Test is_development property."""
    dev_settings = Settings(environment="development")
    assert dev_settings.is_development is True
    
    prod_settings = Settings(environment="production")
    assert prod_settings.is_development is False


def test_get_settings():
    """Test get_settings function returns Settings instance."""
    settings = get_settings()
    assert isinstance(settings, Settings)
