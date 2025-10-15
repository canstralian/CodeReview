"""
Analysis Endpoints

API endpoints for analyzing GitHub repositories and detecting code issues.
"""

from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import ValidationException, NotFoundException
from app.core.security import extract_repo_info, get_github_token
from app.db import get_db
from app.models import Repository, CodeIssue
from app.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    RepositoryCreate,
    RepositoryResponse
)
from app.services import GitHubService


router = APIRouter()


@router.post(
    "/analyze",
    response_model=AnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze Repository",
    description="Analyze a GitHub repository for code issues"
)
async def analyze_repository(
    request: AnalysisRequest,
    db: AsyncSession = Depends(get_db),
    github_token: Optional[str] = Depends(get_github_token)
) -> AnalysisResponse:
    """
    Analyze a GitHub repository.
    
    Fetches repository information from GitHub and performs code analysis
    to detect issues, security vulnerabilities, and code quality problems.
    
    Args:
        request: Analysis request with repository URL
        db: Database session
        github_token: GitHub access token
        
    Returns:
        AnalysisResponse: Analysis results with issue counts
    """
    # Extract owner and repo from URL
    owner, repo_name = extract_repo_info(request.repository_url)
    
    # Initialize GitHub service
    github_service = GitHubService(token=github_token)
    
    # Fetch repository information from GitHub
    try:
        repo_data = await github_service.get_repository(owner, repo_name)
    except Exception as e:
        raise ValidationException(f"Failed to fetch repository from GitHub: {str(e)}")
    
    # Check if repository already exists in database
    result = await db.execute(
        select(Repository).where(Repository.full_name == repo_data["full_name"])
    )
    repository = result.scalar_one_or_none()
    
    # Create or update repository
    if not repository:
        repo_create = RepositoryCreate(
            full_name=repo_data["full_name"],
            name=repo_data["name"],
            owner=repo_data["owner"]["login"],
            description=repo_data.get("description"),
            url=repo_data["html_url"],
            visibility=repo_data.get("visibility", "public"),
            stars=repo_data.get("stargazers_count"),
            forks=repo_data.get("forks_count"),
            watchers=repo_data.get("watchers_count"),
            language=repo_data.get("language"),
        )
        
        repository = Repository(**repo_create.model_dump())
        db.add(repository)
        await db.commit()
        await db.refresh(repository)
    
    # Get issue counts by severity
    severity_counts = {}
    for severity in ["low", "medium", "high", "critical"]:
        result = await db.execute(
            select(func.count(CodeIssue.id))
            .where(CodeIssue.repository_id == repository.id)
            .where(CodeIssue.severity == severity)
        )
        severity_counts[severity] = result.scalar() or 0
    
    # Get issue counts by type
    type_counts = {}
    for issue_type in ["security", "performance", "codeQuality", "accessibility", "bug", "style"]:
        result = await db.execute(
            select(func.count(CodeIssue.id))
            .where(CodeIssue.repository_id == repository.id)
            .where(CodeIssue.issue_type == issue_type)
        )
        type_counts[issue_type] = result.scalar() or 0
    
    # Calculate total issues
    total_issues = sum(severity_counts.values())
    
    # Calculate code quality score (simple algorithm for now)
    # Score decreases based on issue severity
    base_score = 100
    score = base_score - (
        severity_counts["critical"] * 10 +
        severity_counts["high"] * 5 +
        severity_counts["medium"] * 2 +
        severity_counts["low"] * 1
    )
    score = max(0, min(100, score))
    
    # Update repository metrics
    repository.code_quality = score
    repository.issues_count = total_issues
    await db.commit()
    
    return AnalysisResponse(
        repository_id=repository.id,
        total_issues=total_issues,
        issues_by_severity=severity_counts,
        issues_by_type=type_counts,
        code_quality_score=score
    )


@router.post(
    "/analyze-code",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Analyze Code with AI",
    description="Analyze code using AI for advanced suggestions (placeholder)"
)
async def analyze_code_with_ai(
    request: dict,
    github_token: Optional[str] = Depends(get_github_token)
) -> dict:
    """
    Analyze code using AI (Claude).
    
    This is a placeholder endpoint. Full implementation requires
    Anthropic API integration for AI-powered code analysis.
    
    Args:
        request: Analysis request
        github_token: GitHub access token
        
    Returns:
        dict: AI analysis results
    """
    return {
        "status": "not_implemented",
        "message": "AI code analysis endpoint - coming soon",
        "note": "This endpoint will use Anthropic Claude for AI-powered code suggestions"
    }
