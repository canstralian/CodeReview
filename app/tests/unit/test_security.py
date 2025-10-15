"""
Unit tests for security module.
"""

import pytest
from app.core.security import (
    validate_github_url,
    extract_repo_info,
    sanitize_input,
    validate_severity,
    validate_issue_type
)
from app.core.exceptions import ValidationException


class TestGitHubURLValidation:
    """Tests for GitHub URL validation."""
    
    def test_valid_github_url(self):
        """Test validation of valid GitHub URLs."""
        valid_urls = [
            "https://github.com/owner/repo",
            "https://www.github.com/owner/repo",
            "https://github.com/user-name/repo-name",
            "https://github.com/org_name/repo.name",
        ]
        
        for url in valid_urls:
            assert validate_github_url(url) is True
    
    def test_invalid_github_url_domain(self):
        """Test validation fails for non-GitHub URLs."""
        with pytest.raises(ValidationException, match="must be a GitHub repository URL"):
            validate_github_url("https://gitlab.com/owner/repo")
    
    def test_invalid_github_url_format(self):
        """Test validation fails for incorrect URL format."""
        with pytest.raises(ValidationException, match="Invalid GitHub repository URL format"):
            validate_github_url("https://github.com/owner")
    
    def test_invalid_owner_name(self):
        """Test validation fails for invalid owner names."""
        with pytest.raises(ValidationException, match="Invalid GitHub owner name"):
            validate_github_url("https://github.com/-invalid/repo")
    
    def test_invalid_repo_name(self):
        """Test validation fails for invalid repository names."""
        with pytest.raises(ValidationException, match="Invalid GitHub repository name"):
            validate_github_url("https://github.com/owner/-invalid")


class TestExtractRepoInfo:
    """Tests for extracting repository information from URL."""
    
    def test_extract_valid_repo_info(self):
        """Test extraction of owner and repo from valid URL."""
        owner, repo = extract_repo_info("https://github.com/owner/repo")
        assert owner == "owner"
        assert repo == "repo"
    
    def test_extract_repo_info_with_trailing_slash(self):
        """Test extraction works with trailing slash."""
        owner, repo = extract_repo_info("https://github.com/owner/repo/")
        assert owner == "owner"
        assert repo == "repo"
    
    def test_extract_repo_info_invalid_url(self):
        """Test extraction fails with invalid URL."""
        with pytest.raises(ValidationException):
            extract_repo_info("https://invalid.com/owner/repo")


class TestSanitizeInput:
    """Tests for input sanitization."""
    
    def test_sanitize_normal_input(self):
        """Test sanitization of normal text."""
        text = "This is normal text"
        assert sanitize_input(text) == text
    
    def test_sanitize_input_removes_control_chars(self):
        """Test that control characters are removed."""
        text = "Hello\x00World"
        sanitized = sanitize_input(text)
        assert "\x00" not in sanitized
    
    def test_sanitize_input_preserves_newlines(self):
        """Test that newlines are preserved."""
        text = "Line 1\nLine 2"
        assert sanitize_input(text) == text
    
    def test_sanitize_input_max_length(self):
        """Test that input exceeding max length raises error."""
        text = "a" * 1001
        with pytest.raises(ValidationException, match="exceeds maximum length"):
            sanitize_input(text, max_length=1000)
    
    def test_sanitize_input_strips_whitespace(self):
        """Test that leading/trailing whitespace is stripped."""
        text = "  Hello World  "
        assert sanitize_input(text) == "Hello World"


class TestValidateSeverity:
    """Tests for severity validation."""
    
    def test_valid_severities(self):
        """Test validation of valid severity levels."""
        valid_severities = ["low", "medium", "high", "critical"]
        for severity in valid_severities:
            assert validate_severity(severity) == severity
    
    def test_severity_case_insensitive(self):
        """Test that severity validation is case-insensitive."""
        assert validate_severity("LOW") == "low"
        assert validate_severity("High") == "high"
    
    def test_invalid_severity(self):
        """Test that invalid severity raises error."""
        with pytest.raises(ValidationException, match="Invalid severity"):
            validate_severity("invalid")


class TestValidateIssueType:
    """Tests for issue type validation."""
    
    def test_valid_issue_types(self):
        """Test validation of valid issue types."""
        valid_types = ["security", "performance", "codeQuality", "accessibility", "bug", "style"]
        for issue_type in valid_types:
            assert validate_issue_type(issue_type) == issue_type
    
    def test_invalid_issue_type(self):
        """Test that invalid issue type raises error."""
        with pytest.raises(ValidationException, match="Invalid issue type"):
            validate_issue_type("invalid")
