"""
Pytest Configuration and Fixtures

Provides common fixtures and configuration for all tests.
"""

import asyncio
import os
from typing import AsyncGenerator, Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.db.session import Base, get_db
from app.main import app

# Set test environment
os.environ["ENVIRONMENT"] = "test"
os.environ["DATABASE_URL"] = "postgresql://test:test@localhost:5432/codereview_test"

# Create test database engine
TEST_DATABASE_URL = "postgresql+asyncpg://test:test@localhost:5432/codereview_test"
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """
    Create an event loop for the test session.
    
    Yields:
        Event loop instance
    """
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Create a test database session.
    
    Creates tables before each test and drops them after.
    
    Yields:
        AsyncSession: Test database session
    """
    # Create tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create session
    async with TestSessionLocal() as session:
        yield session
    
    # Drop tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(scope="function")
def client(db_session: AsyncSession) -> Generator:
    """
    Create a test client with database session override.
    
    Args:
        db_session: Test database session
        
    Yields:
        TestClient: FastAPI test client
    """
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


@pytest.fixture
def mock_github_token() -> str:
    """
    Provide a mock GitHub token for testing.
    
    Returns:
        str: Mock GitHub token
    """
    return "ghp_test_token_1234567890"


@pytest.fixture
def mock_anthropic_key() -> str:
    """
    Provide a mock Anthropic API key for testing.
    
    Returns:
        str: Mock Anthropic API key
    """
    return "sk-ant-test-key-1234567890"


@pytest.fixture
def sample_repository_data() -> dict:
    """
    Provide sample repository data for testing.
    
    Returns:
        dict: Sample repository data
    """
    return {
        "url": "https://github.com/octocat/Hello-World",
        "owner": "octocat",
        "name": "Hello-World",
        "description": "My first repository on GitHub!",
        "language": "Python"
    }
