"""
Security Utilities

Provides authentication, authorization, and security validation utilities.
"""

import re
from typing import Optional
from urllib.parse import urlparse

import httpx
from fastapi import Depends, Header, status

from app.core.config import settings
from app.core.exceptions import AuthenticationException, ValidationException


class GitHubTokenValidator:
    """
    Validates GitHub personal access tokens.
    
    Uses the GitHub API's /user endpoint to verify token validity.
    """
    
    def __init__(self):
        self.api_url = settings.github_api_url
        self.timeout = settings.github_timeout
    
    async def validate_token(self, token: str) -> dict:
        """
        Validate a GitHub token by calling the GitHub API.
        
        Args:
            token: GitHub personal access token
            
        Returns:
            dict: User information from GitHub API
            
        Raises:
            AuthenticationException: If token is invalid
        """
        if not token:
            raise AuthenticationException("GitHub token is required")
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
        }
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(f"{self.api_url}/user", headers=headers)
                
                if response.status_code == status.HTTP_200_OK:
                    return response.json()
                elif response.status_code == status.HTTP_401_UNAUTHORIZED:
                    raise AuthenticationException(
                        "Invalid GitHub token",
                        details={"reason": "Token authentication failed"}
                    )
                else:
                    raise AuthenticationException(
                        "Failed to validate GitHub token",
                        details={
                            "status_code": response.status_code,
                            "message": response.text
                        }
                    )
            except httpx.RequestError as e:
                raise AuthenticationException(
                    "Failed to connect to GitHub API",
                    details={"error": str(e)}
                )


class RepositoryURLValidator:
    """
    Validates and parses GitHub repository URLs.
    
    Supports various GitHub URL formats and extracts owner/repo information.
    """
    
    # Supported URL patterns
    PATTERNS = [
        # https://github.com/owner/repo
        r"^https?://github\.com/([^/]+)/([^/]+?)(?:\.git)?/?$",
        # git@github.com:owner/repo.git
        r"^git@github\.com:([^/]+)/([^/]+?)(?:\.git)?$",
        # github.com/owner/repo
        r"^(?:https?://)?github\.com/([^/]+)/([^/]+?)(?:\.git)?/?$",
    ]
    
    @classmethod
    def validate(cls, url: str) -> dict:
        """
        Validate and parse a GitHub repository URL.
        
        Args:
            url: Repository URL to validate
            
        Returns:
            dict: Parsed repository information with 'owner' and 'repo' keys
            
        Raises:
            ValidationException: If URL is invalid
        """
        if not url or not isinstance(url, str):
            raise ValidationException("Repository URL is required")
        
        url = url.strip()
        
        for pattern in cls.PATTERNS:
            match = re.match(pattern, url, re.IGNORECASE)
            if match:
                owner, repo = match.groups()
                
                # Remove .git suffix if present
                repo = repo.rstrip(".git")
                
                # Validate owner and repo names
                if not cls._is_valid_github_name(owner):
                    raise ValidationException(
                        f"Invalid GitHub username: {owner}",
                        details={"field": "owner"}
                    )
                
                if not cls._is_valid_github_name(repo):
                    raise ValidationException(
                        f"Invalid GitHub repository name: {repo}",
                        details={"field": "repo"}
                    )
                
                return {
                    "owner": owner,
                    "repo": repo,
                    "full_name": f"{owner}/{repo}",
                    "url": f"https://github.com/{owner}/{repo}"
                }
        
        raise ValidationException(
            "Invalid GitHub repository URL format",
            details={
                "url": url,
                "supported_formats": [
                    "https://github.com/owner/repo",
                    "git@github.com:owner/repo.git",
                    "github.com/owner/repo"
                ]
            }
        )
    
    @staticmethod
    def _is_valid_github_name(name: str) -> bool:
        """
        Check if a name is valid for GitHub usernames/repos.
        
        Args:
            name: Name to validate
            
        Returns:
            bool: True if valid, False otherwise
        """
        if not name or len(name) > 100:
            return False
        
        # GitHub names can contain alphanumeric characters, hyphens, and underscores
        # Must not start or end with a hyphen
        pattern = r"^[a-zA-Z0-9]([a-zA-Z0-9-_]*[a-zA-Z0-9])?$"
        return bool(re.match(pattern, name))


async def get_github_token(
    authorization: Optional[str] = Header(None),
    x_github_token: Optional[str] = Header(None)
) -> Optional[str]:
    """
    Extract GitHub token from request headers.
    
    Supports both Authorization header (Bearer token) and custom X-GitHub-Token header.
    
    Args:
        authorization: Authorization header value
        x_github_token: X-GitHub-Token header value
        
    Returns:
        str: GitHub token or None if not provided
    """
    # Check Authorization header first (Bearer token)
    if authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            return parts[1]
    
    # Check custom header
    if x_github_token:
        return x_github_token
    
    # Fall back to configured token
    return settings.github_token


async def validate_github_token(token: Optional[str] = Depends(get_github_token)) -> dict:
    """
    Dependency to validate GitHub token.
    
    Args:
        token: GitHub token from headers
        
    Returns:
        dict: GitHub user information
        
    Raises:
        AuthenticationException: If token is invalid or missing
    """
    if not token:
        raise AuthenticationException(
            "GitHub token is required",
            details={"hint": "Provide token via Authorization header or X-GitHub-Token"}
        )
    
    validator = GitHubTokenValidator()
    return await validator.validate_token(token)


def validate_repository_url(url: str) -> dict:
    """
    Validate a GitHub repository URL.
    
    Args:
        url: Repository URL to validate
        
    Returns:
        dict: Parsed repository information
        
    Raises:
        ValidationException: If URL is invalid
    """
    return RepositoryURLValidator.validate(url)
