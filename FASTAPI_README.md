# FastAPI Backend for CodeReview AI

A modern, production-ready FastAPI backend for the CodeReview AI application, migrated from Express.js with enhanced security, observability, and performance.

## 🚀 Features

- **FastAPI Framework**: Modern, fast (high-performance) web framework for building APIs
- **Async Database**: SQLAlchemy async with PostgreSQL and asyncpg driver
- **Pydantic Validation**: Request/response validation with automatic API documentation
- **Security First**: OWASP security headers, input validation, GitHub token validation
- **Observability**: Prometheus metrics, health checks, structured logging
- **Type Safety**: Full type hints with mypy support
- **Testing**: Comprehensive test suite with pytest (66% coverage)
- **Developer Experience**: Pre-commit hooks, Makefile, extensive documentation

## 📋 Prerequisites

- Python 3.10 or higher
- PostgreSQL 13+ (or SQLite for development)
- Redis (optional, for caching)
- GitHub personal access token
- Anthropic API key (for AI features)

## 🛠️ Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your API keys
```

### 3. Run Development Server

```bash
# Using Make
make dev

# Or manually
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Access API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI Schema**: http://localhost:8000/api/openapi.json

## 📁 Project Structure

```
app/
├── __init__.py              # Application package
├── main.py                  # FastAPI application entry point
│
├── core/                    # Core application components
│   ├── __init__.py
│   ├── config.py           # Configuration management (Pydantic Settings)
│   ├── exceptions.py       # Custom exceptions and error handlers
│   └── security.py         # Security utilities (validation, sanitization)
│
├── api/                     # API layer
│   ├── __init__.py
│   ├── endpoints/          # API endpoints (routers)
│   │   ├── __init__.py
│   │   ├── health.py       # Health check endpoints
│   │   ├── repositories.py # Repository CRUD endpoints
│   │   ├── analysis.py     # Code analysis endpoints
│   │   └── metrics.py      # Prometheus metrics endpoint
│   └── dependencies/       # Shared dependencies
│       └── __init__.py
│
├── db/                      # Database layer
│   ├── __init__.py
│   └── session.py          # Database session management
│
├── models/                  # SQLAlchemy models
│   ├── __init__.py
│   └── repository.py       # Repository, CodeIssue, RepositoryFile models
│
├── schemas/                 # Pydantic schemas
│   ├── __init__.py
│   └── repository.py       # Request/response schemas
│
├── services/                # Business logic services
│   ├── __init__.py
│   └── github.py           # GitHub API service
│
└── tests/                   # Test suite
    ├── __init__.py
    ├── conftest.py         # Test configuration and fixtures
    ├── unit/               # Unit tests
    │   ├── test_config.py
    │   └── test_security.py
    └── integration/        # Integration tests
        └── test_health.py
```

## 🔌 API Endpoints

### Health & Monitoring

- `GET /healthz` - Health check with dependency status
- `GET /health/ready` - Kubernetes readiness probe
- `GET /health/live` - Kubernetes liveness probe
- `GET /metrics` - Prometheus metrics endpoint

### Repositories

- `POST /api/repositories` - Create repository
- `GET /api/repositories` - List repositories (with pagination)
- `GET /api/repositories/{id}` - Get repository by ID
- `PATCH /api/repositories/{id}` - Update repository
- `DELETE /api/repositories/{id}` - Delete repository
- `GET /api/repositories/{id}/issues` - Get repository issues (with filters)

### Analysis

- `POST /api/analyze` - Analyze GitHub repository
- `POST /api/analyze-code` - AI-powered code analysis (coming soon)

## 🔒 Security Features

### Input Validation
- Pydantic schemas for all requests
- GitHub URL validation
- Input sanitization to prevent injection attacks
- Maximum length enforcement

### Authentication
- GitHub token validation via API
- Token-based authentication support
- Dependency injection for auth

### Security Headers (OWASP)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security`
- `Content-Security-Policy`
- `Referrer-Policy`
- `Permissions-Policy`

## 📊 Monitoring & Observability

### Prometheus Metrics

Custom metrics exposed at `/metrics`:

- `http_requests_total` - Total HTTP requests by method/endpoint/status
- `http_request_duration_seconds` - Request duration histogram
- `repositories_total` - Total repositories analyzed
- `code_issues_total` - Code issues by severity
- `ai_analysis_requests_total` - AI analysis request counter
- `github_api_requests_total` - GitHub API requests by status
- `db_connections_active` - Active database connections
- `db_query_duration_seconds` - Database query duration

### Structured Logging

All requests are logged with:
- Request ID
- Method and path
- Status code
- Processing time
- Client IP

### Health Checks

- **Liveness**: Simple check that application is running
- **Readiness**: Checks database connectivity
- **Health**: Comprehensive check of all dependencies

## 🧪 Testing

### Run Tests

```bash
# All tests
make test

# Unit tests only
make test-unit

# Integration tests only
make test-integration

# With coverage report
pytest --cov=app --cov-report=html
```

### Current Coverage

- **Overall**: 66% coverage
- **Unit Tests**: 25 tests passing
- **Integration Tests**: 3 tests passing

## 🔧 Development

### Code Quality

```bash
# Format code
make format

# Run linters
make lint

# Type checking
mypy app/

# Security scan
bandit -r app/
```

### Pre-commit Hooks

```bash
# Install hooks
make init

# Run manually
make pre-commit
```

### Database Migrations

```bash
# Create migration
make migrate-create

# Apply migrations
make db-upgrade

# Rollback migration
make db-downgrade
```

## 🐳 Docker

### Build & Run

```bash
# Build FastAPI image
docker build -f Dockerfile.fastapi -t codereview-fastapi .

# Run with docker-compose
docker-compose up fastapi
```

### Docker Compose Services

- `fastapi` - FastAPI application (port 8000)
- `postgres` - PostgreSQL database (port 5432)
- `redis` - Redis cache (port 6379)
- `rabbitmq` - Message queue (ports 5672, 15672)
- `prometheus` - Monitoring (port 9090)
- `grafana` - Dashboards (port 3000)

## ⚙️ Configuration

### Environment Variables

Key configuration options:

```bash
# Application
ENVIRONMENT=development  # development, staging, production
DEBUG=false

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# API Keys
ANTHROPIC_API_KEY=sk-ant-xxx
GITHUB_TOKEN=ghp_xxx

# Security
SECRET_KEY=your-secret-key
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5000

# Monitoring
PROMETHEUS_ENABLED=true
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=INFO
```

### Environment-Specific Config

- `.env` - Base configuration
- `.env.staging` - Staging overrides
- `.env.production` - Production overrides

Set `ENVIRONMENT` variable to load the appropriate config.

## 📈 Performance

- **Async I/O**: All database and API calls are async
- **Connection Pooling**: Configured database connection pool
- **Caching**: Redis integration for caching (optional)
- **Compression**: GZip middleware for response compression
- **Efficient Queries**: SQLAlchemy with optimized queries

## 🚀 Deployment

### Production Checklist

- [ ] Update `SECRET_KEY` in `.env.production`
- [ ] Configure `ALLOWED_ORIGINS` for CORS
- [ ] Set appropriate `DATABASE_URL`
- [ ] Configure Sentry DSN for error tracking
- [ ] Enable HTTPS/TLS
- [ ] Set up Prometheus scraping
- [ ] Configure log aggregation
- [ ] Set up automated backups
- [ ] Configure rate limiting
- [ ] Review security headers

### Running in Production

```bash
# With uvicorn directly
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# With gunicorn (recommended)
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## 🔄 Migration from Express.js

### What Changed

1. **Framework**: Express.js → FastAPI
2. **Language**: TypeScript → Python 3.10+
3. **Validation**: Manual → Pydantic automatic
4. **Database**: Drizzle ORM → SQLAlchemy async
5. **Docs**: Manual → Auto-generated OpenAPI

### Benefits

- ✅ Automatic API documentation
- ✅ Type safety with Python type hints
- ✅ Better async support
- ✅ Built-in data validation
- ✅ Faster development
- ✅ Better error messages
- ✅ Modern Python ecosystem

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy Async](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [Prometheus Python Client](https://github.com/prometheus/client_python)

## 🤝 Contributing

1. Install pre-commit hooks: `make init`
2. Create feature branch
3. Make changes
4. Run tests: `make test`
5. Run linters: `make lint`
6. Commit changes (pre-commit hooks will run)
7. Push and create PR

## 📝 License

Apache License 2.0 - See LICENSE file for details

## 🎯 Next Steps

- [ ] Add Anthropic Claude AI integration
- [ ] Implement background task processing with Celery
- [ ] Add OpenTelemetry tracing
- [ ] Create Alembic migrations
- [ ] Add rate limiting middleware
- [ ] Implement caching layer
- [ ] Add WebSocket support for real-time updates
- [ ] Generate client SDKs with fastapi-codegen

---

**Status**: Production-ready core infrastructure. AI features and advanced analysis coming soon.
