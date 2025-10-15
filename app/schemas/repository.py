"""
Pydantic Schemas Module

This module defines Pydantic models for request/response validation
and serialization throughout the FastAPI application.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, ConfigDict


# Base schemas with common configuration
class BaseSchema(BaseModel):
    """Base schema with common configuration."""
    
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        str_strip_whitespace=True
    )


# Repository Schemas
class RepositoryBase(BaseSchema):
    """Base repository schema with common fields."""
    
    full_name: str = Field(..., description="Full repository name (owner/repo)")
    name: str = Field(..., description="Repository name")
    owner: str = Field(..., description="Repository owner")
    description: Optional[str] = Field(None, description="Repository description")
    url: str = Field(..., description="Repository URL")
    visibility: Optional[str] = Field(None, description="Repository visibility (public/private)")
    stars: Optional[int] = Field(None, description="Number of stars")
    forks: Optional[int] = Field(None, description="Number of forks")
    watchers: Optional[int] = Field(None, description="Number of watchers")
    issues: Optional[int] = Field(None, description="Number of issues")
    pull_requests: Optional[int] = Field(None, description="Number of pull requests")
    language: Optional[str] = Field(None, description="Primary programming language")


class RepositoryCreate(RepositoryBase):
    """Schema for creating a new repository."""
    
    @field_validator("url")
    @classmethod
    def validate_url(cls, v):
        """Validate repository URL is a valid GitHub URL."""
        from app.core.security import validate_github_url
        validate_github_url(v)
        return v


class RepositoryUpdate(BaseSchema):
    """Schema for updating repository information."""
    
    description: Optional[str] = None
    code_quality: Optional[int] = Field(None, ge=0, le=100)
    test_coverage: Optional[int] = Field(None, ge=0, le=100)
    issues_count: Optional[int] = Field(None, ge=0)
    meta_data: Optional[Dict[str, Any]] = None
    file_structure: Optional[Dict[str, Any]] = None


class RepositoryResponse(RepositoryBase):
    """Schema for repository response."""
    
    id: int = Field(..., description="Repository ID")
    last_updated: Optional[datetime] = Field(None, description="Last update timestamp")
    code_quality: Optional[int] = Field(None, description="Code quality score (0-100)")
    test_coverage: Optional[int] = Field(None, description="Test coverage percentage")
    issues_count: Optional[int] = Field(None, description="Number of detected issues")
    meta_data: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    file_structure: Optional[Dict[str, Any]] = Field(None, description="Repository file structure")


# Code Issue Schemas
class CodeIssueBase(BaseSchema):
    """Base code issue schema with common fields."""
    
    file_path: str = Field(..., description="File path relative to repository root")
    line_number: int = Field(..., ge=1, description="Line number where issue was detected")
    issue_type: str = Field(..., description="Type of issue (security, performance, etc.)")
    severity: str = Field(..., description="Issue severity (low, medium, high, critical)")
    category: str = Field(default="codeQuality", description="Issue category")
    message: str = Field(..., description="Issue description")
    code: str = Field(..., description="Code snippet with the issue")
    suggestion: Optional[str] = Field(None, description="Suggested fix")
    
    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v):
        """Validate severity is one of allowed values."""
        from app.core.security import validate_severity
        return validate_severity(v)
    
    @field_validator("issue_type")
    @classmethod
    def validate_issue_type(cls, v):
        """Validate issue type is one of allowed values."""
        from app.core.security import validate_issue_type
        return validate_issue_type(v)


class CodeIssueCreate(CodeIssueBase):
    """Schema for creating a new code issue."""
    
    repository_id: int = Field(..., description="Repository ID")


class CodeIssueResponse(CodeIssueBase):
    """Schema for code issue response."""
    
    id: int = Field(..., description="Issue ID")
    repository_id: int = Field(..., description="Repository ID")


# Repository File Schemas
class RepositoryFileBase(BaseSchema):
    """Base repository file schema."""
    
    file_path: str = Field(..., description="File path relative to repository root")
    type: str = Field(..., description="File type (file/directory)")
    content: Optional[str] = Field(None, description="File content")
    language: Optional[str] = Field(None, description="Programming language")


class RepositoryFileCreate(RepositoryFileBase):
    """Schema for creating a repository file entry."""
    
    repository_id: int = Field(..., description="Repository ID")


class RepositoryFileResponse(RepositoryFileBase):
    """Schema for repository file response."""
    
    id: int = Field(..., description="File ID")
    repository_id: int = Field(..., description="Repository ID")


# Analysis Request/Response Schemas
class AnalysisRequest(BaseSchema):
    """Schema for code analysis request."""
    
    repository_url: str = Field(..., description="GitHub repository URL")
    include_ai_suggestions: bool = Field(default=True, description="Include AI-powered suggestions")
    
    @field_validator("repository_url")
    @classmethod
    def validate_url(cls, v):
        """Validate repository URL."""
        from app.core.security import validate_github_url
        validate_github_url(v)
        return v


class AnalysisResponse(BaseSchema):
    """Schema for analysis response."""
    
    repository_id: int = Field(..., description="Repository ID")
    total_issues: int = Field(..., description="Total number of issues found")
    issues_by_severity: Dict[str, int] = Field(..., description="Issues grouped by severity")
    issues_by_type: Dict[str, int] = Field(..., description="Issues grouped by type")
    code_quality_score: Optional[int] = Field(None, description="Overall code quality score")


class SecurityScanRequest(BaseSchema):
    """Schema for security scan request."""
    
    repository_id: int = Field(..., description="Repository ID to scan")
    deep_scan: bool = Field(default=False, description="Perform deep security scan")


class SecurityScanResponse(BaseSchema):
    """Schema for security scan response."""
    
    repository_id: int = Field(..., description="Repository ID")
    vulnerabilities_found: int = Field(..., description="Number of vulnerabilities found")
    critical_count: int = Field(default=0, description="Critical vulnerabilities")
    high_count: int = Field(default=0, description="High severity vulnerabilities")
    medium_count: int = Field(default=0, description="Medium severity vulnerabilities")
    low_count: int = Field(default=0, description="Low severity vulnerabilities")
    issues: List[CodeIssueResponse] = Field(default_factory=list, description="Security issues")


# Health Check Schemas
class HealthResponse(BaseSchema):
    """Schema for health check response."""
    
    status: str = Field(..., description="Health status (healthy/unhealthy)")
    version: str = Field(..., description="Application version")
    environment: str = Field(..., description="Current environment")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")
    database: str = Field(..., description="Database connection status")
    redis: Optional[str] = Field(None, description="Redis connection status")


# Error Response Schema
class ErrorResponseSchema(BaseSchema):
    """Schema for error responses."""
    
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    status_code: int = Field(..., description="HTTP status code")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
