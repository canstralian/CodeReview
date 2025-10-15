"""
Configuration Management Module

This module implements a layered configuration hierarchy using environment variables
and Pydantic BaseSettings for secure, environment-specific configuration management.

The configuration supports multiple environments:
- development (default)
- staging (.env.staging)
- production (.env.production)
"""

from typing import Optional, List
from pydantic import Field, field_validator, ConfigDict
from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
    """
    Application settings with environment-specific overrides.
    
    Uses Pydantic BaseSettings to load configuration from environment variables
    with type validation and default values. Supports multiple environments
    through different .env files.
    """
    
    # Application Configuration
    app_name: str = Field(default="CodeReview AI", description="Application name")
    app_version: str = Field(default="1.0.0", description="Application version")
    environment: str = Field(default="development", description="Environment: development, staging, production")
    debug: bool = Field(default=False, description="Debug mode")
    
    # Server Configuration
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, description="Server port")
    workers: int = Field(default=1, description="Number of worker processes")
    
    # API Configuration
    api_prefix: str = Field(default="/api", description="API route prefix")
    allowed_origins: List[str] = Field(
        default=["http://localhost:5173", "http://localhost:5000"],
        description="CORS allowed origins"
    )
    
    # Database Configuration
    database_url: str = Field(
        default="postgresql+asyncpg://codereview:password@localhost:5432/codereview",
        description="PostgreSQL database URL with asyncpg driver"
    )
    db_pool_size: int = Field(default=10, description="Database connection pool size")
    db_max_overflow: int = Field(default=20, description="Maximum overflow connections")
    db_pool_timeout: int = Field(default=30, description="Connection pool timeout in seconds")
    db_echo: bool = Field(default=False, description="Echo SQL statements for debugging")
    
    # Redis Configuration
    redis_host: str = Field(default="localhost", description="Redis host")
    redis_port: int = Field(default=6379, description="Redis port")
    redis_password: Optional[str] = Field(default=None, description="Redis password")
    redis_db: int = Field(default=0, description="Redis database number")
    redis_key_prefix: str = Field(default="codereview:", description="Redis key prefix")
    
    # AI Services Configuration
    anthropic_api_key: Optional[str] = Field(default=None, description="Anthropic API key for Claude AI")
    
    # GitHub Integration
    github_token: Optional[str] = Field(default=None, description="GitHub personal access token")
    github_api_url: str = Field(default="https://api.github.com", description="GitHub API base URL")
    
    # Security Configuration
    secret_key: str = Field(
        default="your-secret-key-change-in-production",
        description="Secret key for JWT and session encryption"
    )
    algorithm: str = Field(default="HS256", description="JWT algorithm")
    access_token_expire_minutes: int = Field(default=30, description="Access token expiration in minutes")
    
    # Rate Limiting
    rate_limit_enabled: bool = Field(default=True, description="Enable rate limiting")
    rate_limit_requests: int = Field(default=100, description="Number of requests allowed")
    rate_limit_period: int = Field(default=900, description="Rate limit period in seconds (15 minutes)")
    
    # Message Queue Configuration
    queue_type: str = Field(default="rabbitmq", description="Queue type: rabbitmq or kafka")
    queue_url: str = Field(default="amqp://localhost", description="Message queue connection URL")
    rabbitmq_exchange: str = Field(default="codereview", description="RabbitMQ exchange name")
    rabbitmq_exchange_type: str = Field(default="topic", description="RabbitMQ exchange type")
    
    # Worker Pool Configuration
    max_workers: int = Field(default=10, description="Maximum number of worker processes")
    min_workers: int = Field(default=2, description="Minimum number of worker processes")
    worker_task_timeout: int = Field(default=300, description="Worker task timeout in seconds")
    
    # Monitoring and Observability
    sentry_dsn: Optional[str] = Field(default=None, description="Sentry DSN for error tracking")
    sentry_enabled: bool = Field(default=False, description="Enable Sentry error tracking")
    sentry_traces_sample_rate: float = Field(default=1.0, description="Sentry traces sample rate")
    
    # Prometheus Configuration
    prometheus_enabled: bool = Field(default=True, description="Enable Prometheus metrics")
    prometheus_port: int = Field(default=9090, description="Prometheus metrics port")
    
    # Logging Configuration
    log_level: str = Field(default="INFO", description="Logging level")
    log_format: str = Field(
        default="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        description="Log format"
    )
    
    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v):
        """Parse CORS allowed origins from string or list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @field_validator("environment")
    @classmethod
    def validate_environment(cls, v):
        """Validate environment is one of the allowed values."""
        allowed_environments = ["development", "staging", "production"]
        if v not in allowed_environments:
            raise ValueError(f"Environment must be one of {allowed_environments}")
        return v
    
    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v):
        """Validate log level is one of the allowed values."""
        allowed_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        v_upper = v.upper()
        if v_upper not in allowed_levels:
            raise ValueError(f"Log level must be one of {allowed_levels}")
        return v_upper
    
    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    @property
    def redis_url(self) -> str:
        """Construct Redis connection URL."""
        if self.redis_password:
            return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/{self.redis_db}"
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"
    
    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.environment == "production"
    
    @property
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.environment == "development"


def get_settings() -> Settings:
    """
    Get application settings based on environment.
    
    Loads configuration from:
    1. .env file (base configuration)
    2. .env.staging or .env.production (environment-specific overrides)
    3. Environment variables (highest priority)
    
    Returns:
        Settings: Application configuration object
    """
    env = os.getenv("ENVIRONMENT", "development")
    
    # Load environment-specific config file
    env_file = ".env"
    if env == "staging" and os.path.exists(".env.staging"):
        env_file = ".env.staging"
    elif env == "production" and os.path.exists(".env.production"):
        env_file = ".env.production"
    
    # Create settings with appropriate env file
    settings = Settings(_env_file=env_file)
    return settings


# Global settings instance
settings = get_settings()
