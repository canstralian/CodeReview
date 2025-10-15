"""
Custom Exceptions Module

This module defines custom exception classes and error response models
for consistent error handling across the FastAPI application.

All exceptions follow a structured format with status codes, error types,
and human-readable messages for better error tracking and debugging.
"""

from typing import Optional, Dict, Any
from fastapi import HTTPException, status


class AppException(HTTPException):
    """
    Base application exception class.
    
    All custom exceptions should inherit from this class to ensure
    consistent error handling and response format.
    """
    
    def __init__(
        self,
        status_code: int,
        detail: str,
        error_type: str = "ApplicationError",
        headers: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize application exception.
        
        Args:
            status_code: HTTP status code
            detail: Human-readable error message
            error_type: Type/category of error
            headers: Optional HTTP headers
        """
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.error_type = error_type


class ValidationException(AppException):
    """
    Exception raised for validation errors.
    
    Used when request data fails validation against Pydantic schemas
    or business logic validation rules.
    """
    
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
            error_type="ValidationError"
        )


class AuthenticationException(AppException):
    """
    Exception raised for authentication failures.
    
    Used when user credentials are invalid or authentication token
    is missing or expired.
    """
    
    def __init__(self, detail: str = "Authentication failed"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            error_type="AuthenticationError",
            headers={"WWW-Authenticate": "Bearer"}
        )


class AuthorizationException(AppException):
    """
    Exception raised for authorization failures.
    
    Used when authenticated user lacks permission to access
    a specific resource or perform an action.
    """
    
    def __init__(self, detail: str = "Insufficient permissions"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            error_type="AuthorizationError"
        )


class NotFoundException(AppException):
    """
    Exception raised when a requested resource is not found.
    
    Used for 404 errors when repositories, files, or other
    resources cannot be located.
    """
    
    def __init__(self, resource: str, identifier: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource} with identifier '{identifier}' not found",
            error_type="NotFoundError"
        )


class ConflictException(AppException):
    """
    Exception raised for resource conflicts.
    
    Used when attempting to create a resource that already exists
    or when concurrent modifications cause a conflict.
    """
    
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
            error_type="ConflictError"
        )


class RateLimitException(AppException):
    """
    Exception raised when rate limit is exceeded.
    
    Used to enforce API rate limiting and prevent abuse.
    """
    
    def __init__(self, detail: str = "Rate limit exceeded"):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail,
            error_type="RateLimitError",
            headers={"Retry-After": "900"}  # 15 minutes
        )


class ExternalServiceException(AppException):
    """
    Exception raised for external service failures.
    
    Used when GitHub API, Anthropic AI, or other external
    services return errors or are unavailable.
    """
    
    def __init__(self, service: str, detail: str):
        super().__init__(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"{service} service error: {detail}",
            error_type="ExternalServiceError"
        )


class DatabaseException(AppException):
    """
    Exception raised for database errors.
    
    Used when database operations fail due to connection issues,
    constraint violations, or other database-related errors.
    """
    
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {detail}",
            error_type="DatabaseError"
        )


class WorkerException(AppException):
    """
    Exception raised for worker/task processing errors.
    
    Used when background tasks or worker processes fail.
    """
    
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Worker error: {detail}",
            error_type="WorkerError"
        )


class ConfigurationException(AppException):
    """
    Exception raised for configuration errors.
    
    Used when required configuration values are missing or invalid.
    """
    
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Configuration error: {detail}",
            error_type="ConfigurationError"
        )


# Error response models for OpenAPI documentation
class ErrorResponse:
    """
    Standard error response structure.
    
    Provides a consistent format for all error responses
    across the API.
    """
    
    def __init__(
        self,
        error_type: str,
        message: str,
        status_code: int,
        details: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize error response.
        
        Args:
            error_type: Type/category of error
            message: Human-readable error message
            status_code: HTTP status code
            details: Optional additional error details
        """
        self.error = error_type
        self.message = message
        self.status_code = status_code
        self.details = details or {}
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert error response to dictionary.
        
        Returns:
            Dict containing error information
        """
        response = {
            "error": self.error,
            "message": self.message,
            "status_code": self.status_code
        }
        
        if self.details:
            response["details"] = self.details
        
        return response
