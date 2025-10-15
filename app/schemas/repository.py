"""
Repository Schemas

Pydantic models for repository data validation and serialization.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, HttpUrl, validator


class RepositoryBase(BaseModel):
    """Base repository schema with common fields."""
    
    owner: str = Field(..., min_length=1, max_length=100, description="Repository owner")
    name: str = Field(..., min_length=1, max_length=100, description="Repository name")
    description: Optional[str] = Field(None, description="Repository description")
    language: Optional[str] = Field(None, max_length=50, description="Primary programming language")


class RepositoryCreate(RepositoryBase):
    """Schema for creating a repository."""
    
    url: str = Field(..., description="GitHub repository URL")
    
    @validator("url")
    def validate_github_url(cls, v):
        """Validate that URL is a GitHub repository."""
        from app.core.security import validate_repository_url
        # This will raise ValidationException if invalid
        validate_repository_url(v)
        return v


class RepositoryUpdate(BaseModel):
    """Schema for updating a repository."""
    
    description: Optional[str] = None
    language: Optional[str] = Field(None, max_length=50)
    stars: Optional[int] = Field(None, ge=0)
    forks: Optional[int] = Field(None, ge=0)
    open_issues: Optional[int] = Field(None, ge=0)
    default_branch: Optional[str] = Field(None, max_length=100)


class RepositoryResponse(RepositoryBase):
    """Schema for repository response."""
    
    id: int
    full_name: str
    url: str
    github_id: Optional[int]
    default_branch: str
    stars: int
    forks: int
    open_issues: int
    is_analyzed: bool
    last_analyzed_at: Optional[datetime]
    analysis_status: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class RepositoryAnalysisRequest(BaseModel):
    """Schema for requesting repository analysis."""
    
    analysis_type: str = Field(
        default="full",
        description="Type of analysis to perform",
        pattern="^(full|incremental|file-specific)$"
    )
    file_paths: Optional[list[str]] = Field(
        None,
        description="Specific file paths to analyze (for file-specific analysis)"
    )
    force: bool = Field(
        default=False,
        description="Force re-analysis even if already analyzed"
    )


class RepositoryAnalysisResponse(BaseModel):
    """Schema for repository analysis response."""
    
    repository_id: int
    analysis_id: int
    status: str
    message: str
    issues_found: Optional[int] = None
    
    class Config:
        from_attributes = True


class RepositoryListResponse(BaseModel):
    """Schema for paginated repository list."""
    
    items: list[RepositoryResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
