"""
Analysis Model

SQLAlchemy model for storing analysis results and AI responses.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.session import Base


class Analysis(Base):
    """
    Analysis model.
    
    Stores code analysis results, AI responses, and metrics.
    """
    __tablename__ = "analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Repository Reference
    repository_id = Column(Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Analysis Details
    analysis_type = Column(String(100), nullable=False, index=True)  # full, incremental, file-specific
    status = Column(String(50), nullable=False, index=True)  # pending, in_progress, completed, failed
    
    # File Information
    file_path = Column(String(500), nullable=True)
    file_language = Column(String(50), nullable=True)
    
    # AI Response
    ai_model = Column(String(100), nullable=True)
    ai_response = Column(Text, nullable=True)
    
    # Metrics
    issues_found = Column(Integer, default=0)
    critical_issues = Column(Integer, default=0)
    high_issues = Column(Integer, default=0)
    medium_issues = Column(Integer, default=0)
    low_issues = Column(Integer, default=0)
    
    # Performance
    processing_time_ms = Column(Integer, nullable=True)
    
    # Error Information
    error_message = Column(Text, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    repository = relationship("Repository", back_populates="analyses")
    
    def __repr__(self) -> str:
        return f"<Analysis {self.id}: {self.analysis_type} for repo {self.repository_id}>"
