"""
Centralized Exception Handling

Defines custom exceptions and error response models for consistent
error handling across the application.
"""

from typing import Any, Dict, Optional
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field


class ErrorResponse(BaseModel):
    """
    Standard error response model.
    
    Provides a consistent structure for all error responses across the API.
    """
    error: str = Field(..., description="Error type or category")
    message: str = Field(..., description="Human-readable error message")
    status_code: int = Field(..., description="HTTP status code")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Additional error details")
    request_id: Optional[str] = Field(default=None, description="Request ID for tracking")


class AppException(HTTPException):
    """
    Base application exception.
    
    All custom exceptions should inherit from this class.
    """
    
    def __init__(
        self,
        status_code: int,
        error: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None
    ):
        self.error = error
        self.message = message
        self.details = details
        super().__init__(status_code=status_code, detail=message, headers=headers)


class ValidationException(AppException):
    """Exception raised for validation errors."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error="ValidationError",
            message=message,
            details=details
        )


class AuthenticationException(AppException):
    """Exception raised for authentication failures."""
    
    def __init__(self, message: str = "Authentication failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error="AuthenticationError",
            message=message,
            details=details,
            headers={"WWW-Authenticate": "Bearer"}
        )


class AuthorizationException(AppException):
    """Exception raised for authorization failures."""
    
    def __init__(self, message: str = "Insufficient permissions", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            error="AuthorizationError",
            message=message,
            details=details
        )


class NotFoundException(AppException):
    """Exception raised when a resource is not found."""
    
    def __init__(self, resource: str, identifier: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            error="NotFoundError",
            message=f"{resource} with identifier '{identifier}' not found",
            details=details
        )


class ConflictException(AppException):
    """Exception raised for resource conflicts."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            error="ConflictError",
            message=message,
            details=details
        )


class RateLimitException(AppException):
    """Exception raised when rate limit is exceeded."""
    
    def __init__(self, message: str = "Rate limit exceeded", retry_after: Optional[int] = None):
        headers = {"Retry-After": str(retry_after)} if retry_after else None
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            error="RateLimitError",
            message=message,
            headers=headers
        )


class ExternalServiceException(AppException):
    """Exception raised for external service failures."""
    
    def __init__(self, service: str, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_502_BAD_GATEWAY,
            error="ExternalServiceError",
            message=f"{service} service error: {message}",
            details=details
        )


class GitHubAPIException(ExternalServiceException):
    """Exception raised for GitHub API errors."""
    
    def __init__(self, message: str, status_code: Optional[int] = None, details: Optional[Dict[str, Any]] = None):
        if details is None:
            details = {}
        if status_code:
            details["github_status_code"] = status_code
        super().__init__(service="GitHub", message=message, details=details)


class AIServiceException(ExternalServiceException):
    """Exception raised for AI service errors."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(service="AI", message=message, details=details)


class DatabaseException(AppException):
    """Exception raised for database errors."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error="DatabaseError",
            message=message,
            details=details
        )


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """
    Handler for application-specific exceptions.
    
    Args:
        request: The incoming request
        exc: The application exception
        
    Returns:
        JSONResponse with error details
    """
    error_response = ErrorResponse(
        error=exc.error,
        message=exc.message,
        status_code=exc.status_code,
        details=exc.details,
        request_id=getattr(request.state, "request_id", None)
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.model_dump(exclude_none=True),
        headers=exc.headers
    )


async def validation_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handler for Pydantic validation errors.
    
    Args:
        request: The incoming request
        exc: The validation exception
        
    Returns:
        JSONResponse with validation error details
    """
    from fastapi.exceptions import RequestValidationError
    
    if isinstance(exc, RequestValidationError):
        errors = exc.errors()
        error_details = {
            "validation_errors": [
                {
                    "loc": ".".join(str(x) for x in error["loc"]),
                    "msg": error["msg"],
                    "type": error["type"]
                }
                for error in errors
            ]
        }
        
        error_response = ErrorResponse(
            error="ValidationError",
            message="Request validation failed",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=error_details,
            request_id=getattr(request.state, "request_id", None)
        )
        
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=error_response.model_dump(exclude_none=True)
        )
    
    # Fallback for other validation errors
    error_response = ErrorResponse(
        error="ValidationError",
        message=str(exc),
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        request_id=getattr(request.state, "request_id", None)
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_response.model_dump(exclude_none=True)
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handler for unhandled exceptions.
    
    Args:
        request: The incoming request
        exc: The unhandled exception
        
    Returns:
        JSONResponse with generic error message
    """
    from app.core.config import settings
    
    # Log the exception (in production, this would use proper logging)
    import traceback
    print(f"Unhandled exception: {exc}")
    if settings.debug:
        traceback.print_exc()
    
    error_response = ErrorResponse(
        error="InternalServerError",
        message="An unexpected error occurred",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        details={"exception": str(exc)} if settings.debug else None,
        request_id=getattr(request.state, "request_id", None)
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_response.model_dump(exclude_none=True)
    )
