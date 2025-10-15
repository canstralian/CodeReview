"""
Repository Model

SQLAlchemy model for storing repository information.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.session import Base


class Repository(Base):
    """
    Repository model.
    
    Stores GitHub repository metadata and analysis information.
    """
    __tablename__ = "repositories"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # GitHub Information
    github_id = Column(Integer, unique=True, nullable=True, index=True)
    owner = Column(String(100), nullable=False, index=True)
    name = Column(String(100), nullable=False, index=True)
    full_name = Column(String(200), nullable=False, unique=True, index=True)
    url = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    
    # Repository Details
    default_branch = Column(String(100), default="main")
    language = Column(String(50), nullable=True)
    stars = Column(Integer, default=0)
    forks = Column(Integer, default=0)
    open_issues = Column(Integer, default=0)
    
    # Analysis Status
    is_analyzed = Column(Boolean, default=False)
    last_analyzed_at = Column(DateTime, nullable=True)
    analysis_status = Column(String(50), default="pending")  # pending, in_progress, completed, failed
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    issues = relationship("Issue", back_populates="repository", cascade="all, delete-orphan")
    analyses = relationship("Analysis", back_populates="repository", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f"<Repository {self.full_name}>"
