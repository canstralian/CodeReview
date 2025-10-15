"""
Database Module

This module provides async database session management using SQLAlchemy
with PostgreSQL and asyncpg driver for high-performance async operations.
"""

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
    async_sessionmaker,
    AsyncEngine
)
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool, QueuePool
from app.core.config import settings


# Base class for SQLAlchemy models
Base = declarative_base()


# Create async engine
def create_database_engine() -> AsyncEngine:
    """
    Create async SQLAlchemy engine with connection pooling.
    
    Uses asyncpg driver for PostgreSQL with configurable connection
    pool settings for optimal performance.
    
    Returns:
        AsyncEngine: Configured async database engine
    """
    # Use NullPool for testing/SQLite, QueuePool for PostgreSQL
    is_sqlite = settings.database_url.startswith("sqlite")
    poolclass = NullPool if (settings.environment == "testing" or is_sqlite) else QueuePool
    
    # Configure engine arguments based on database type
    engine_args = {
        "echo": settings.db_echo,
        "poolclass": poolclass,
    }
    
    # Only add pool settings for non-SQLite databases
    if not is_sqlite:
        engine_args.update({
            "pool_size": settings.db_pool_size,
            "max_overflow": settings.db_max_overflow,
            "pool_timeout": settings.db_pool_timeout,
            "pool_pre_ping": True,  # Verify connections before using
        })
    
    engine = create_async_engine(
        settings.database_url,
        **engine_args
    )
    
    return engine


# Create engine instance
engine = create_database_engine()


# Create session maker
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency for getting async database sessions.
    
    This is a FastAPI dependency that provides database sessions
    to route handlers with automatic cleanup and transaction management.
    
    Usage:
        @app.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db)):
            result = await db.execute(select(Item))
            return result.scalars().all()
    
    Yields:
        AsyncSession: Database session
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """
    Initialize database tables.
    
    Creates all tables defined in SQLAlchemy models.
    Should be called on application startup.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """
    Close database connections.
    
    Disposes the engine and closes all connections.
    Should be called on application shutdown.
    """
    await engine.dispose()
