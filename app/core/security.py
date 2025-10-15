"""
Security Module

This module implements security features including:
- GitHub token validation
- Input sanitization
- Security headers configuration
- Authentication utilities

Follows OWASP security best practices for API security.
"""

from typing import Optional
import re
from urllib.parse import urlparse
import httpx
from fastapi import Header, HTTPException, status
from app.core.config import settings
from app.core.exceptions import AuthenticationException, ValidationException


def validate_github_url(url: str) -> bool:
    """
    Validate GitHub repository URL format.
    
    Ensures the URL is a valid GitHub repository URL and follows
    the expected format: https://github.com/{owner}/{repo}
    
    Args:
        url: GitHub repository URL to validate
        
    Returns:
        bool: True if URL is valid
        
    Raises:
        ValidationException: If URL is invalid
    """
    try:
        parsed = urlparse(url)
        
        # Check if it's a GitHub URL
        if parsed.netloc not in ["github.com", "www.github.com"]:
            raise ValidationException("URL must be a GitHub repository URL")
        
        # Check path format: /{owner}/{repo}
        path_parts = [p for p in parsed.path.split("/") if p]
        if len(path_parts) < 2:
            raise ValidationException("Invalid GitHub repository URL format. Expected: https://github.com/owner/repo")
        
        # Validate owner and repo names (alphanumeric, hyphens, underscores)
        owner_pattern = r"^[a-zA-Z0-9]([a-zA-Z0-9-_]*[a-zA-Z0-9])?$"
        repo_pattern = r"^[a-zA-Z0-9]([a-zA-Z0-9-_\.]*[a-zA-Z0-9])?$"
        
        owner = path_parts[0]
        repo = path_parts[1]
        
        if not re.match(owner_pattern, owner):
            raise ValidationException(f"Invalid GitHub owner name: {owner}")
        
        if not re.match(repo_pattern, repo):
            raise ValidationException(f"Invalid GitHub repository name: {repo}")
        
        return True
        
    except ValidationException:
        raise
    except Exception as e:
        raise ValidationException(f"Invalid URL format: {str(e)}")


def extract_repo_info(url: str) -> tuple[str, str]:
    """
    Extract owner and repository name from GitHub URL.
    
    Args:
        url: GitHub repository URL
        
    Returns:
        tuple: (owner, repo_name)
        
    Raises:
        ValidationException: If URL is invalid
    """
    validate_github_url(url)
    parsed = urlparse(url)
    path_parts = [p for p in parsed.path.split("/") if p]
    return path_parts[0], path_parts[1]


async def validate_github_token(token: str) -> dict:
    """
    Validate GitHub personal access token by calling GitHub API.
    
    Makes a request to GitHub's /user endpoint to verify the token
    is valid and has appropriate permissions.
    
    Args:
        token: GitHub personal access token
        
    Returns:
        dict: User information from GitHub
        
    Raises:
        AuthenticationException: If token is invalid
    """
    if not token:
        raise AuthenticationException("GitHub token is required")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.github_api_url}/user",
                headers={
                    "Authorization": f"token {token}",
                    "Accept": "application/vnd.github.v3+json"
                },
                timeout=10.0
            )
            
            if response.status_code == 401:
                raise AuthenticationException("Invalid GitHub token")
            
            if response.status_code != 200:
                raise AuthenticationException(f"GitHub API error: {response.status_code}")
            
            return response.json()
            
    except httpx.RequestError as e:
        raise AuthenticationException(f"Failed to validate GitHub token: {str(e)}")


async def get_github_token(
    authorization: Optional[str] = Header(None)
) -> Optional[str]:
    """
    Extract and validate GitHub token from Authorization header.
    
    This is a FastAPI dependency that can be used to secure endpoints
    requiring GitHub authentication.
    
    Args:
        authorization: Authorization header value
        
    Returns:
        str: Validated GitHub token
        
    Raises:
        AuthenticationException: If token is missing or invalid
    """
    if not authorization:
        # If no token in header, try to use configured token
        if settings.github_token:
            return settings.github_token
        raise AuthenticationException("GitHub token required")
    
    # Extract token from "Bearer {token}" or "token {token}" format
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() not in ["bearer", "token"]:
        raise AuthenticationException("Invalid authorization header format")
    
    token = parts[1]
    
    # Validate token with GitHub API
    await validate_github_token(token)
    
    return token


def sanitize_input(text: str, max_length: int = 1000) -> str:
    """
    Sanitize user input to prevent injection attacks.
    
    Removes potentially dangerous characters and limits length
    to prevent denial of service attacks.
    
    Args:
        text: Input text to sanitize
        max_length: Maximum allowed length
        
    Returns:
        str: Sanitized text
        
    Raises:
        ValidationException: If input exceeds maximum length
    """
    if len(text) > max_length:
        raise ValidationException(f"Input exceeds maximum length of {max_length} characters")
    
    # Remove control characters except newlines and tabs
    sanitized = "".join(char for char in text if char.isprintable() or char in ["\n", "\t"])
    
    return sanitized.strip()


def validate_severity(severity: str) -> str:
    """
    Validate issue severity level.
    
    Args:
        severity: Severity level to validate
        
    Returns:
        str: Validated severity level
        
    Raises:
        ValidationException: If severity is invalid
    """
    allowed_severities = ["low", "medium", "high", "critical"]
    severity_lower = severity.lower()
    
    if severity_lower not in allowed_severities:
        raise ValidationException(
            f"Invalid severity: {severity}. Must be one of: {', '.join(allowed_severities)}"
        )
    
    return severity_lower


def validate_issue_type(issue_type: str) -> str:
    """
    Validate code issue type/category.
    
    Args:
        issue_type: Issue type to validate
        
    Returns:
        str: Validated issue type
        
    Raises:
        ValidationException: If issue type is invalid
    """
    allowed_types = ["security", "performance", "codeQuality", "accessibility", "bug", "style"]
    
    if issue_type not in allowed_types:
        raise ValidationException(
            f"Invalid issue type: {issue_type}. Must be one of: {', '.join(allowed_types)}"
        )
    
    return issue_type


# Security headers configuration for FastAPI middleware
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
}
