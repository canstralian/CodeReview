"""
Repository Endpoints

API endpoints for managing and analyzing GitHub repositories.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import NotFoundException
from app.db import get_db
from app.models import Repository, CodeIssue
from app.schemas import (
    RepositoryCreate,
    RepositoryResponse,
    RepositoryUpdate,
    CodeIssueResponse
)


router = APIRouter()


@router.post(
    "/repositories",
    response_model=RepositoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Repository",
    description="Add a new repository for analysis"
)
async def create_repository(
    repository: RepositoryCreate,
    db: AsyncSession = Depends(get_db)
) -> RepositoryResponse:
    """
    Create a new repository entry.
    
    Args:
        repository: Repository data
        db: Database session
        
    Returns:
        RepositoryResponse: Created repository
    """
    # Create repository model
    db_repository = Repository(**repository.model_dump())
    
    db.add(db_repository)
    await db.commit()
    await db.refresh(db_repository)
    
    return RepositoryResponse.model_validate(db_repository)


@router.get(
    "/repositories",
    response_model=List[RepositoryResponse],
    status_code=status.HTTP_200_OK,
    summary="List Repositories",
    description="Get list of all repositories"
)
async def list_repositories(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of records to return"),
    db: AsyncSession = Depends(get_db)
) -> List[RepositoryResponse]:
    """
    List all repositories with pagination.
    
    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        db: Database session
        
    Returns:
        List[RepositoryResponse]: List of repositories
    """
    result = await db.execute(
        select(Repository)
        .offset(skip)
        .limit(limit)
        .order_by(Repository.id.desc())
    )
    repositories = result.scalars().all()
    
    return [RepositoryResponse.model_validate(repo) for repo in repositories]


@router.get(
    "/repositories/{repository_id}",
    response_model=RepositoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Repository",
    description="Get repository details by ID"
)
async def get_repository(
    repository_id: int,
    db: AsyncSession = Depends(get_db)
) -> RepositoryResponse:
    """
    Get repository by ID.
    
    Args:
        repository_id: Repository ID
        db: Database session
        
    Returns:
        RepositoryResponse: Repository details
        
    Raises:
        NotFoundException: If repository not found
    """
    result = await db.execute(
        select(Repository).where(Repository.id == repository_id)
    )
    repository = result.scalar_one_or_none()
    
    if not repository:
        raise NotFoundException("Repository", str(repository_id))
    
    return RepositoryResponse.model_validate(repository)


@router.patch(
    "/repositories/{repository_id}",
    response_model=RepositoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Repository",
    description="Update repository information"
)
async def update_repository(
    repository_id: int,
    repository_update: RepositoryUpdate,
    db: AsyncSession = Depends(get_db)
) -> RepositoryResponse:
    """
    Update repository information.
    
    Args:
        repository_id: Repository ID
        repository_update: Fields to update
        db: Database session
        
    Returns:
        RepositoryResponse: Updated repository
        
    Raises:
        NotFoundException: If repository not found
    """
    result = await db.execute(
        select(Repository).where(Repository.id == repository_id)
    )
    repository = result.scalar_one_or_none()
    
    if not repository:
        raise NotFoundException("Repository", str(repository_id))
    
    # Update fields
    update_data = repository_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(repository, field, value)
    
    await db.commit()
    await db.refresh(repository)
    
    return RepositoryResponse.model_validate(repository)


@router.delete(
    "/repositories/{repository_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Repository",
    description="Delete a repository and all associated data"
)
async def delete_repository(
    repository_id: int,
    db: AsyncSession = Depends(get_db)
) -> None:
    """
    Delete repository by ID.
    
    Args:
        repository_id: Repository ID
        db: Database session
        
    Raises:
        NotFoundException: If repository not found
    """
    result = await db.execute(
        select(Repository).where(Repository.id == repository_id)
    )
    repository = result.scalar_one_or_none()
    
    if not repository:
        raise NotFoundException("Repository", str(repository_id))
    
    await db.delete(repository)
    await db.commit()


@router.get(
    "/repositories/{repository_id}/issues",
    response_model=List[CodeIssueResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Repository Issues",
    description="Get all code issues for a repository"
)
async def get_repository_issues(
    repository_id: int,
    severity: Optional[str] = Query(None, description="Filter by severity"),
    issue_type: Optional[str] = Query(None, description="Filter by issue type"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of records to return"),
    db: AsyncSession = Depends(get_db)
) -> List[CodeIssueResponse]:
    """
    Get code issues for a repository with optional filtering.
    
    Args:
        repository_id: Repository ID
        severity: Optional severity filter
        issue_type: Optional issue type filter
        skip: Number of records to skip
        limit: Maximum number of records to return
        db: Database session
        
    Returns:
        List[CodeIssueResponse]: List of code issues
        
    Raises:
        NotFoundException: If repository not found
    """
    # Verify repository exists
    repo_result = await db.execute(
        select(Repository).where(Repository.id == repository_id)
    )
    if not repo_result.scalar_one_or_none():
        raise NotFoundException("Repository", str(repository_id))
    
    # Build query
    query = select(CodeIssue).where(CodeIssue.repository_id == repository_id)
    
    if severity:
        query = query.where(CodeIssue.severity == severity)
    
    if issue_type:
        query = query.where(CodeIssue.issue_type == issue_type)
    
    query = query.offset(skip).limit(limit).order_by(CodeIssue.severity, CodeIssue.id)
    
    # Execute query
    result = await db.execute(query)
    issues = result.scalars().all()
    
    return [CodeIssueResponse.model_validate(issue) for issue in issues]
