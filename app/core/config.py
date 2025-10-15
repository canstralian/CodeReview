"""
Configuration Management

Implements layered configuration hierarchy using environment-specific files
and Pydantic BaseSettings for secure configuration management.
"""

import os
from typing import List, Optional
from pydantic import Field, PostgresDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings with environment-specific configuration.
    
    Supports layered configuration through .env, .env.staging, and .env.production files.
    Environment variables take precedence over file-based configuration.
    """
    
    # Application Configuration
    app_name: str = Field(default="CodeReview AI", description="Application name")
    app_version: str = Field(default="2.0.0", description="Application version")
    environment: str = Field(default="development", description="Environment: development, staging, production")
    debug: bool = Field(default=False, description="Enable debug mode")
    
    # Server Configuration
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, description="Server port")
    workers: int = Field(default=1, description="Number of worker processes")
    
    # Database Configuration
    database_url: PostgresDsn = Field(
        default="postgresql://localhost:5432/codereview",
        description="PostgreSQL connection URL"
    )
    db_pool_size: int = Field(default=10, ge=1, le=100, description="Database connection pool size")
    db_max_overflow: int = Field(default=20, ge=0, le=100, description="Maximum overflow connections")
    db_pool_timeout: int = Field(default=30, ge=5, le=300, description="Pool timeout in seconds")
    db_echo: bool = Field(default=False, description="Echo SQL queries for debugging")
    
    # Redis Configuration
    redis_host: str = Field(default="localhost", description="Redis host")
    redis_port: int = Field(default=6379, ge=1, le=65535, description="Redis port")
    redis_password: Optional[str] = Field(default=None, description="Redis password")
    redis_db: int = Field(default=0, ge=0, le=15, description="Redis database number")
    redis_key_prefix: str = Field(default="codereview:", description="Redis key prefix")
    
    # Celery Configuration
    celery_broker_url: str = Field(default="redis://localhost:6379/0", description="Celery broker URL")
    celery_result_backend: str = Field(default="redis://localhost:6379/0", description="Celery result backend")
    celery_task_timeout: int = Field(default=300, ge=10, le=3600, description="Task timeout in seconds")
    
    # AI Services Configuration
    anthropic_api_key: Optional[str] = Field(default=None, description="Anthropic Claude API key")
    anthropic_model: str = Field(default="claude-3-5-sonnet-20241022", description="Claude model version")
    anthropic_max_tokens: int = Field(default=4096, ge=1, le=8192, description="Maximum tokens for AI responses")
    anthropic_temperature: float = Field(default=0.7, ge=0.0, le=1.0, description="AI response temperature")
    
    # GitHub Integration
    github_token: Optional[str] = Field(default=None, description="GitHub personal access token")
    github_api_url: str = Field(default="https://api.github.com", description="GitHub API base URL")
    github_timeout: int = Field(default=30, ge=5, le=300, description="GitHub API timeout in seconds")
    
    # Security Configuration
    secret_key: str = Field(default="change-me-in-production", description="Secret key for signing")
    allowed_origins: List[str] = Field(
        default=["http://localhost:5173", "http://localhost:8000"],
        description="Allowed CORS origins"
    )
    allowed_hosts: List[str] = Field(default=["*"], description="Allowed host headers")
    
    # Rate Limiting
    rate_limit_enabled: bool = Field(default=True, description="Enable rate limiting")
    rate_limit_requests: int = Field(default=100, ge=1, le=10000, description="Requests per window")
    rate_limit_window: int = Field(default=900, ge=1, le=3600, description="Rate limit window in seconds")
    
    # Observability Configuration
    prometheus_enabled: bool = Field(default=True, description="Enable Prometheus metrics")
    prometheus_port: int = Field(default=9090, ge=1024, le=65535, description="Prometheus metrics port")
    
    opentelemetry_enabled: bool = Field(default=False, description="Enable OpenTelemetry tracing")
    opentelemetry_endpoint: Optional[str] = Field(default=None, description="OpenTelemetry collector endpoint")
    
    sentry_dsn: Optional[str] = Field(default=None, description="Sentry DSN for error tracking")
    sentry_traces_sample_rate: float = Field(default=1.0, ge=0.0, le=1.0, description="Sentry trace sample rate")
    
    # Logging Configuration
    log_level: str = Field(default="INFO", description="Logging level")
    log_format: str = Field(default="json", description="Log format: json or text")
    
    # Worker Configuration
    max_workers: int = Field(default=10, ge=1, le=100, description="Maximum worker processes")
    min_workers: int = Field(default=2, ge=1, le=10, description="Minimum worker processes")
    worker_task_timeout: int = Field(default=300, ge=10, le=3600, description="Worker task timeout in seconds")
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from string or list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @field_validator("allowed_hosts", mode="before")
    @classmethod
    def parse_allowed_hosts(cls, v):
        """Parse allowed hosts from string or list."""
        if isinstance(v, str):
            return [host.strip() for host in v.split(",")]
        return v
    
    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(cls, v, info):
        """Ensure secret key is changed in production."""
        if info.data.get("environment") == "production" and v == "change-me-in-production":
            raise ValueError("SECRET_KEY must be changed in production environment")
        return v
    
    @field_validator("anthropic_api_key")
    @classmethod
    def validate_anthropic_key(cls, v, info):
        """Warn if Anthropic API key is not set."""
        if not v and info.data.get("environment") == "production":
            import warnings
            warnings.warn("ANTHROPIC_API_KEY is not set. AI features will be disabled.")
        return v
    
    def get_database_url(self) -> str:
        """Get database URL as string."""
        if isinstance(self.database_url, str):
            return self.database_url
        return str(self.database_url)


def get_settings() -> Settings:
    """
    Get application settings instance.
    
    Loads settings from environment-specific configuration files:
    - .env (base configuration)
    - .env.staging (staging environment overrides)
    - .env.production (production environment overrides)
    
    Returns:
        Settings: Application settings instance
    """
    env = os.getenv("ENVIRONMENT", "development")
    
    # Load base .env file
    env_files = [".env"]
    
    # Add environment-specific files
    if env == "staging" and os.path.exists(".env.staging"):
        env_files.append(".env.staging")
    elif env == "production" and os.path.exists(".env.production"):
        env_files.append(".env.production")
    
    # Create settings with environment-specific configuration
    settings = Settings(environment=env)
    
    return settings


# Global settings instance
settings = get_settings()
