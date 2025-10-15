"""
Issue Model

SQLAlchemy model for storing code issues and problems.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.session import Base


class Issue(Base):
    """
    Issue model.
    
    Stores code issues, bugs, and potential problems identified in repositories.
    """
    __tablename__ = "issues"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Repository Reference
    repository_id = Column(Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Issue Details
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False, index=True)  # security, performance, quality, accessibility
    severity = Column(String(50), nullable=False, index=True)  # critical, high, medium, low
    
    # Location
    file_path = Column(String(500), nullable=True)
    line_number = Column(Integer, nullable=True)
    
    # AI Suggestion
    suggestion = Column(Text, nullable=True)
    fixed_code = Column(Text, nullable=True)
    
    # Status
    status = Column(String(50), default="open", index=True)  # open, in_progress, resolved, closed
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    repository = relationship("Repository", back_populates="issues")
    
    def __repr__(self) -> str:
        return f"<Issue {self.id}: {self.title[:50]}>"
