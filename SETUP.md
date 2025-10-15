# FastAPI Backend Setup Guide

This guide will help you set up the CodeReview FastAPI backend for local development.

## Prerequisites

- Python 3.10 or higher
- PostgreSQL 13 or higher
- Redis (optional, for caching)
- Git
- Make (optional, but recommended)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/canstralian/CodeReview.git
cd CodeReview
```

### 2. Set Up Python Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Linux/macOS:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

### 3. Install Dependencies

```bash
# Using Make (recommended)
make install

# Or manually
pip install -r requirements.txt
```

### 4. Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and fill in your values
nano .env  # or use your preferred editor
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `ANTHROPIC_API_KEY` - Claude AI API key (get from https://console.anthropic.com/)
- `GITHUB_TOKEN` - GitHub personal access token (optional)

### 5. Set Up Database

```bash
# Create PostgreSQL database
createdb codereview

# Run migrations (if using Alembic)
make db-upgrade

# Or let the application create tables on startup
```

### 6. Run Development Server

```bash
# Using Make
make dev

# Or manually
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API**: http://localhost:8000
- **Interactive API Docs**: http://localhost:8000/docs
- **Alternative API Docs**: http://localhost:8000/redoc

## Project Structure

```
app/
├── __init__.py              # Application package
├── main.py                  # FastAPI application entry point
├── core/                    # Core application components
│   ├── __init__.py
│   ├── config.py           # Configuration management
│   ├── exceptions.py       # Custom exceptions
│   └── security.py         # Security utilities
├── api/                     # API layer
│   ├── __init__.py
│   ├── endpoints/          # API endpoints
│   │   ├── __init__.py
│   │   ├── health.py       # Health check endpoints
│   │   └── repositories.py # Repository endpoints
│   └── dependencies/       # API dependencies
├── db/                      # Database layer
│   ├── __init__.py
│   └── session.py          # Database session management
├── models/                  # SQLAlchemy models
│   ├── __init__.py
│   └── repository.py       # Repository models
├── schemas/                 # Pydantic schemas
│   ├── __init__.py
│   └── repository.py       # Repository schemas
├── services/                # Business logic services
│   └── __init__.py
└── tests/                   # Test suite
    ├── unit/               # Unit tests
    └── integration/        # Integration tests
```

## Development Workflow

### Running Tests

```bash
# Run all tests
make test

# Run only unit tests
make test-unit

# Run only integration tests
make test-integration

# Run tests with coverage report
pytest --cov=app --cov-report=html
```

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

### Database Migrations

```bash
# Create a new migration
make migrate-create

# Apply migrations
make db-upgrade

# Rollback one migration
make db-downgrade
```

### Pre-commit Hooks

```bash
# Install pre-commit hooks
pre-commit install

# Run hooks manually
make pre-commit
```

## Docker Setup

### Using Docker Compose

```bash
# Build and start all services
make docker-up

# View logs
make docker-logs

# Stop services
make docker-down
```

Services included:
- FastAPI application (port 8000)
- PostgreSQL database (port 5432)
- Redis cache (port 6379)
- RabbitMQ message queue (ports 5672, 15672)
- Prometheus (port 9090)
- Grafana (port 3000)

### Docker Commands

```bash
# Build images
docker-compose build

# Start services in background
docker-compose up -d

# View service logs
docker-compose logs -f app

# Execute commands in container
docker-compose exec app bash

# Stop and remove containers
docker-compose down -v
```

## Environment-Specific Configuration

### Development

```bash
ENVIRONMENT=development
```

Uses `.env` file with development settings.

### Staging

```bash
ENVIRONMENT=staging
```

Uses `.env.staging` file with staging-specific settings.

### Production

```bash
ENVIRONMENT=production
```

Uses `.env.production` file with production settings.

## API Documentation

### Interactive Documentation

Once the server is running, access the interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Generate OpenAPI Schema

```bash
make openapi
```

This generates an `openapi.json` file with the complete API schema.

## Common Tasks

### Add a New Endpoint

1. Create endpoint in `app/api/endpoints/`
2. Add schemas in `app/schemas/`
3. Add models in `app/models/` (if needed)
4. Register router in `app/main.py`
5. Write tests in `app/tests/`

### Add a New Service

1. Create service in `app/services/`
2. Add business logic methods
3. Use dependency injection in endpoints
4. Write unit tests

### Update Dependencies

```bash
# Update requirements.txt
pip freeze > requirements.txt

# Or update specific packages
pip install --upgrade fastapi uvicorn

# Reinstall all dependencies
make install
```

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql -U username -d codereview

# Check DATABASE_URL format
postgresql+asyncpg://user:password@localhost:5432/database
```

### Import Errors

```bash
# Ensure virtual environment is activated
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

### Port Already in Use

```bash
# Find process using port 8000
lsof -i :8000

# Kill process
kill -9 <PID>
```

## Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Uvicorn Documentation](https://www.uvicorn.org/)

## Getting Help

- Check the [API Documentation](http://localhost:8000/docs)
- Review the [Architecture Documentation](docs/ARCHITECTURE.md)
- Open an issue on GitHub
- Contact the development team

## Next Steps

After completing the setup:

1. Explore the API documentation at http://localhost:8000/docs
2. Review the code structure in the `app/` directory
3. Run the test suite to ensure everything works
4. Read the architecture documentation
5. Start contributing!
