# FastAPI Backend Migration

## Overview

This directory contains the new FastAPI-based backend for CodeReview AI, replacing the previous Express.js implementation. The migration follows modern Python best practices and provides improved performance, scalability, and developer experience.

## Key Features

✅ **Modern FastAPI Framework**
- Async/await support throughout
- Automatic OpenAPI documentation
- Type safety with Pydantic
- High performance with ASGI

✅ **Robust Configuration Management**
- Environment-specific settings (.env, .env.staging, .env.production)
- Pydantic BaseSettings for validation
- Type-safe configuration with validation

✅ **Centralized Error Handling**
- Consistent error response model
- Custom exception hierarchy
- Global exception handlers

✅ **Security Best Practices**
- GitHub token validation via API
- Repository URL validation
- Input sanitization with Pydantic
- CORS middleware configured

✅ **Observability & Monitoring**
- `/healthz` - Health check endpoint
- `/readyz` - Readiness check endpoint
- `/metrics` - Prometheus metrics
- Request ID tracking
- Structured logging support

✅ **Database**
- Async SQLAlchemy with asyncpg
- Connection pooling
- Database migrations with Alembic
- PostgreSQL optimized

✅ **Testing Infrastructure**
- pytest with async support
- Unit tests with 70%+ coverage target
- Integration tests
- Test fixtures for database

✅ **Developer Experience**
- Makefile with 25+ commands
- Pre-commit hooks (black, isort, flake8, mypy, bandit)
- Comprehensive SETUP.md
- Docker Compose for local development

✅ **CI/CD Pipeline**
- GitHub Actions workflow
- Automated linting and testing
- Security scanning with Bandit & Trivy
- Docker image building
- SBOM generation

## Quick Start

```bash
# Install dependencies
make install

# Run development server
make dev

# Run tests
make test

# Format code
make format

# Run linters
make lint
```

Visit http://localhost:8000/docs for interactive API documentation.

## Project Structure

```
app/
├── core/               # Core functionality
│   ├── config.py      # Configuration management
│   ├── exceptions.py  # Custom exceptions
│   └── security.py    # Security utilities
├── api/               # API endpoints (to be added)
├── models/            # SQLAlchemy models
│   ├── repository.py
│   ├── issue.py
│   └── analysis.py
├── schemas/           # Pydantic schemas
│   └── repository.py
├── services/          # Business logic (to be added)
├── db/                # Database management
│   └── session.py
└── main.py            # Application entry point

tests/
├── unit/              # Unit tests
│   ├── test_config.py
│   └── test_security.py
└── integration/       # Integration tests
    └── test_health.py
```

## Architecture Improvements

### Configuration
- **Before**: Environment variables read directly with `process.env`
- **After**: Layered configuration with validation via Pydantic BaseSettings

### Error Handling
- **Before**: Scattered error handling across routes
- **After**: Centralized exception hierarchy with consistent error responses

### Database
- **Before**: Synchronous Drizzle ORM
- **After**: Async SQLAlchemy with connection pooling and migrations

### Security
- **Before**: Basic validation
- **After**: Strict input validation, GitHub token verification via API

### Testing
- **Before**: Limited test coverage
- **After**: Comprehensive test suite with fixtures and CI/CD

### Documentation
- **Before**: Manual documentation updates
- **After**: Auto-generated OpenAPI docs, interactive Swagger UI

## Migration Status

### ✅ Completed
- Core application structure
- Configuration management
- Exception handling
- Security utilities
- Database models and session
- Observability endpoints
- Testing infrastructure
- Developer tooling
- CI/CD pipeline
- Docker configuration

### 🚧 In Progress
- API endpoint implementation
- AI analysis service
- Celery task queue
- Service layer implementation

### 📋 Planned
- Complete API endpoints migration
- OpenTelemetry integration
- Microservice architecture for AI
- Performance benchmarking

## Performance Benefits

- **Async I/O**: Non-blocking operations for better concurrency
- **Type Safety**: Catch errors at development time
- **Connection Pooling**: Efficient database connections
- **Caching**: Redis integration for frequently accessed data
- **ASGI**: Modern async server interface

## Security Enhancements

- **Input Validation**: Strict validation with Pydantic
- **GitHub Token Verification**: Token validated via GitHub API
- **SQL Injection Prevention**: SQLAlchemy ORM parameterization
- **Dependency Scanning**: Automated security checks in CI/CD
- **SBOM Generation**: Software bill of materials for supply chain security

## Documentation

- [SETUP.md](../SETUP.md) - Developer setup guide
- [API Documentation](http://localhost:8000/docs) - Interactive API docs
- [Makefile](../Makefile) - Available commands
- [pytest.ini](../pytest.ini) - Test configuration

## Support

For questions or issues:
- Check [SETUP.md](../SETUP.md) for common problems
- Review tests in `tests/` for usage examples
- Open an issue on GitHub

## License

Apache 2.0 - See [LICENSE](../LICENSE) for details
