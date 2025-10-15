"""
Unit Tests for Security

Tests for security utilities and validation functions.
"""

import pytest
from unittest.mock import AsyncMock, patch

from app.core.exceptions import AuthenticationException, ValidationException
from app.core.security import (
    GitHubTokenValidator,
    RepositoryURLValidator,
    validate_repository_url,
)


class TestRepositoryURLValidator:
    """Test cases for RepositoryURLValidator."""
    
    @pytest.mark.parametrize("url,expected_owner,expected_repo", [
        ("https://github.com/octocat/Hello-World", "octocat", "Hello-World"),
        ("http://github.com/python/cpython", "python", "cpython"),
        ("https://github.com/user/repo.git", "user", "repo"),
        ("git@github.com:user/repo.git", "user", "repo"),
        ("github.com/owner/repository", "owner", "repository"),
    ])
    def test_valid_repository_urls(self, url, expected_owner, expected_repo):
        """Test validation of valid GitHub repository URLs."""
        result = RepositoryURLValidator.validate(url)
        
        assert result["owner"] == expected_owner
        assert result["repo"] == expected_repo
        assert result["full_name"] == f"{expected_owner}/{expected_repo}"
        assert "github.com" in result["url"]
    
    @pytest.mark.parametrize("url", [
        "",
        "not-a-url",
        "https://gitlab.com/owner/repo",
        "https://github.com/",
        "https://github.com/owner",
        "ftp://github.com/owner/repo",
    ])
    def test_invalid_repository_urls(self, url):
        """Test validation fails for invalid URLs."""
        with pytest.raises(ValidationException):
            RepositoryURLValidator.validate(url)
    
    def test_validate_with_none(self):
        """Test validation fails when URL is None."""
        with pytest.raises(ValidationException):
            RepositoryURLValidator.validate(None)
    
    def test_validate_with_invalid_owner_name(self):
        """Test validation fails for invalid owner names."""
        with pytest.raises(ValidationException):
            RepositoryURLValidator.validate("https://github.com/-invalid/repo")
    
    def test_validate_with_invalid_repo_name(self):
        """Test validation fails for invalid repository names."""
        with pytest.raises(ValidationException):
            RepositoryURLValidator.validate("https://github.com/owner/-invalid-")
    
    def test_validate_removes_git_suffix(self):
        """Test that .git suffix is removed from repository name."""
        result = RepositoryURLValidator.validate("https://github.com/user/repo.git")
        assert result["repo"] == "repo"
        assert ".git" not in result["full_name"]
    
    def test_github_name_validation(self):
        """Test GitHub name validation logic."""
        # Valid names
        assert RepositoryURLValidator._is_valid_github_name("user") is True
        assert RepositoryURLValidator._is_valid_github_name("user-name") is True
        assert RepositoryURLValidator._is_valid_github_name("user_name") is True
        assert RepositoryURLValidator._is_valid_github_name("User123") is True
        
        # Invalid names
        assert RepositoryURLValidator._is_valid_github_name("") is False
        assert RepositoryURLValidator._is_valid_github_name("-user") is False
        assert RepositoryURLValidator._is_valid_github_name("user-") is False
        assert RepositoryURLValidator._is_valid_github_name("a" * 101) is False


class TestGitHubTokenValidator:
    """Test cases for GitHubTokenValidator."""
    
    @pytest.mark.asyncio
    async def test_validate_token_success(self):
        """Test successful token validation."""
        validator = GitHubTokenValidator()
        
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "login": "octocat",
            "id": 1,
            "name": "The Octocat"
        }
        
        with patch("httpx.AsyncClient.get", return_value=mock_response):
            result = await validator.validate_token("ghp_valid_token")
            
            assert result["login"] == "octocat"
            assert result["id"] == 1
    
    @pytest.mark.asyncio
    async def test_validate_token_invalid(self):
        """Test validation with invalid token."""
        validator = GitHubTokenValidator()
        
        mock_response = AsyncMock()
        mock_response.status_code = 401
        
        with patch("httpx.AsyncClient.get", return_value=mock_response):
            with pytest.raises(AuthenticationException, match="Invalid GitHub token"):
                await validator.validate_token("ghp_invalid_token")
    
    @pytest.mark.asyncio
    async def test_validate_token_empty(self):
        """Test validation with empty token."""
        validator = GitHubTokenValidator()
        
        with pytest.raises(AuthenticationException, match="GitHub token is required"):
            await validator.validate_token("")
    
    @pytest.mark.asyncio
    async def test_validate_token_network_error(self):
        """Test validation with network error."""
        validator = GitHubTokenValidator()
        
        with patch("httpx.AsyncClient.get", side_effect=Exception("Network error")):
            with pytest.raises(AuthenticationException, match="Failed to connect"):
                await validator.validate_token("ghp_token")


class TestValidateRepositoryURL:
    """Test cases for validate_repository_url function."""
    
    def test_validate_repository_url(self):
        """Test the validate_repository_url function."""
        result = validate_repository_url("https://github.com/octocat/Hello-World")
        
        assert result["owner"] == "octocat"
        assert result["repo"] == "Hello-World"
    
    def test_validate_repository_url_invalid(self):
        """Test validate_repository_url with invalid URL."""
        with pytest.raises(ValidationException):
            validate_repository_url("invalid-url")
