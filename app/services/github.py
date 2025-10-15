"""
GitHub Service Module

This module provides services for interacting with the GitHub API
to fetch repository information, files, and metadata.
"""

from typing import Dict, Any, List, Optional
import httpx
from app.core import settings, ExternalServiceException
from app.core.security import validate_github_token


class GitHubService:
    """
    Service for interacting with GitHub API.
    
    Provides methods to fetch repository data, file contents,
    and other GitHub-related information.
    """
    
    def __init__(self, token: Optional[str] = None):
        """
        Initialize GitHub service.
        
        Args:
            token: GitHub personal access token (optional)
        """
        self.token = token or settings.github_token
        self.base_url = settings.github_api_url
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "CodeReview-FastAPI/1.0"
        }
        
        if self.token:
            self.headers["Authorization"] = f"token {self.token}"
    
    async def get_repository(self, owner: str, repo: str) -> Dict[str, Any]:
        """
        Get repository information from GitHub.
        
        Args:
            owner: Repository owner
            repo: Repository name
            
        Returns:
            Dict containing repository information
            
        Raises:
            ExternalServiceException: If GitHub API request fails
        """
        url = f"{self.base_url}/repos/{owner}/{repo}"
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers=self.headers,
                    timeout=30.0
                )
                
                if response.status_code == 404:
                    raise ExternalServiceException("GitHub", "Repository not found")
                
                if response.status_code != 200:
                    raise ExternalServiceException(
                        "GitHub",
                        f"API returned status {response.status_code}"
                    )
                
                return response.json()
                
        except httpx.RequestError as e:
            raise ExternalServiceException("GitHub", f"Request failed: {str(e)}")
    
    async def get_repository_files(
        self,
        owner: str,
        repo: str,
        path: str = "",
        recursive: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Get repository file tree.
        
        Args:
            owner: Repository owner
            repo: Repository name
            path: Path to directory (default: root)
            recursive: Whether to recursively fetch all files
            
        Returns:
            List of file/directory information
            
        Raises:
            ExternalServiceException: If GitHub API request fails
        """
        url = f"{self.base_url}/repos/{owner}/{repo}/contents/{path}"
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers=self.headers,
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    raise ExternalServiceException(
                        "GitHub",
                        f"Failed to fetch files: {response.status_code}"
                    )
                
                data = response.json()
                
                # Handle single file response
                if isinstance(data, dict):
                    return [data]
                
                files = data
                
                # Recursively fetch subdirectories if requested
                if recursive:
                    all_files = []
                    for item in files:
                        if item["type"] == "dir":
                            subfiles = await self.get_repository_files(
                                owner, repo, item["path"], recursive=True
                            )
                            all_files.extend(subfiles)
                        else:
                            all_files.append(item)
                    return all_files
                
                return files
                
        except httpx.RequestError as e:
            raise ExternalServiceException("GitHub", f"Request failed: {str(e)}")
    
    async def get_file_content(
        self,
        owner: str,
        repo: str,
        path: str
    ) -> str:
        """
        Get content of a specific file.
        
        Args:
            owner: Repository owner
            repo: Repository name
            path: File path
            
        Returns:
            File content as string
            
        Raises:
            ExternalServiceException: If GitHub API request fails
        """
        url = f"{self.base_url}/repos/{owner}/{repo}/contents/{path}"
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers=self.headers,
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    raise ExternalServiceException(
                        "GitHub",
                        f"Failed to fetch file: {response.status_code}"
                    )
                
                data = response.json()
                
                # Decode base64 content
                import base64
                content = base64.b64decode(data["content"]).decode("utf-8")
                return content
                
        except httpx.RequestError as e:
            raise ExternalServiceException("GitHub", f"Request failed: {str(e)}")
    
    async def get_repository_languages(
        self,
        owner: str,
        repo: str
    ) -> Dict[str, int]:
        """
        Get programming languages used in repository.
        
        Args:
            owner: Repository owner
            repo: Repository name
            
        Returns:
            Dict mapping language names to bytes of code
            
        Raises:
            ExternalServiceException: If GitHub API request fails
        """
        url = f"{self.base_url}/repos/{owner}/{repo}/languages"
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers=self.headers,
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    raise ExternalServiceException(
                        "GitHub",
                        f"Failed to fetch languages: {response.status_code}"
                    )
                
                return response.json()
                
        except httpx.RequestError as e:
            raise ExternalServiceException("GitHub", f"Request failed: {str(e)}")
    
    async def validate_token(self) -> Dict[str, Any]:
        """
        Validate GitHub token and get user information.
        
        Returns:
            Dict containing user information
            
        Raises:
            ExternalServiceException: If token is invalid
        """
        if not self.token:
            raise ExternalServiceException("GitHub", "No token configured")
        
        return await validate_github_token(self.token)
