"""
Database Models Module

This module defines SQLAlchemy ORM models for the application database.
Uses async SQLAlchemy with PostgreSQL for optimal performance.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import (
    Integer,
    String,
    Text,
    DateTime,
    JSON,
    ForeignKey,
    Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db import Base


class Repository(Base):
    """
    Repository model for storing GitHub repository information.
    
    Stores metadata about analyzed repositories including
    code quality metrics and analysis results.
    """
    
    __tablename__ = "repositories"
    
    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    
    # Repository identification
    full_name: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    owner: Mapped[str] = mapped_column(String, nullable=False, index=True)
    url: Mapped[str] = mapped_column(String, nullable=False)
    
    # Repository metadata
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    visibility: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    # Statistics
    stars: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    forks: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    watchers: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    issues: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    pull_requests: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Analysis results
    code_quality: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    test_coverage: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    issues_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Timestamps
    last_updated: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
        onupdate=datetime.utcnow
    )
    
    # JSON fields for flexible data storage
    meta_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    file_structure: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    # Relationships
    code_issues: Mapped[list["CodeIssue"]] = relationship(
        "CodeIssue",
        back_populates="repository",
        cascade="all, delete-orphan"
    )
    
    files: Mapped[list["RepositoryFile"]] = relationship(
        "RepositoryFile",
        back_populates="repository",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self) -> str:
        return f"<Repository(id={self.id}, full_name='{self.full_name}')>"


class CodeIssue(Base):
    """
    Code issue model for storing detected code problems.
    
    Stores information about issues found during code analysis
    including security vulnerabilities, performance problems,
    and code quality issues.
    """
    
    __tablename__ = "code_issues"
    
    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    
    # Foreign key to repository
    repository_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("repositories.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Issue location
    file_path: Mapped[str] = mapped_column(String, nullable=False)
    line_number: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Issue classification
    issue_type: Mapped[str] = mapped_column(String, nullable=False, index=True)
    severity: Mapped[str] = mapped_column(String, nullable=False, index=True)
    category: Mapped[str] = mapped_column(String, nullable=False, default="codeQuality")
    
    # Issue details
    message: Mapped[str] = mapped_column(Text, nullable=False)
    code: Mapped[str] = mapped_column(Text, nullable=False)
    suggestion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Relationship
    repository: Mapped["Repository"] = relationship("Repository", back_populates="code_issues")
    
    # Indexes for efficient queries
    __table_args__ = (
        Index("idx_repo_severity", "repository_id", "severity"),
        Index("idx_repo_type", "repository_id", "issue_type"),
    )
    
    def __repr__(self) -> str:
        return f"<CodeIssue(id={self.id}, type='{self.issue_type}', severity='{self.severity}')>"


class RepositoryFile(Base):
    """
    Repository file model for storing file information.
    
    Stores information about files in analyzed repositories
    including file content and metadata.
    """
    
    __tablename__ = "repository_files"
    
    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    
    # Foreign key to repository
    repository_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("repositories.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # File information
    file_path: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)  # 'file' or 'directory'
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    # Relationship
    repository: Mapped["Repository"] = relationship("Repository", back_populates="files")
    
    # Index for efficient file lookup
    __table_args__ = (
        Index("idx_repo_file_path", "repository_id", "file_path", unique=True),
    )
    
    def __repr__(self) -> str:
        return f"<RepositoryFile(id={self.id}, path='{self.file_path}')>"
