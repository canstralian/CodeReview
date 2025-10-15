# Developer Setup Guide

This guide provides step-by-step instructions to set up the CodeReview FastAPI development environment.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.11+**: [Download Python](https://www.python.org/downloads/)
- **PostgreSQL 14+**: [Download PostgreSQL](https://www.postgresql.org/download/)
- **Redis 7+**: [Download Redis](https://redis.io/download)
- **Git**: [Download Git](https://git-scm.com/downloads)
- **Docker** (optional): [Download Docker](https://www.docker.com/get-started)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/canstralian/CodeReview.git
cd CodeReview
```

### 2. Initialize Development Environment

```bash
# Create and activate virtual environment
make init
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
make install
```

### 3. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and set your configuration
# Required variables:
# - DATABASE_URL: PostgreSQL connection string
# - ANTHROPIC_API_KEY: Get from https://console.anthropic.com/
# - GITHUB_TOKEN: Generate from https://github.com/settings/tokens
```

### 4. Set Up Database

```bash
# Create database
createdb codereview

# Run migrations
make upgrade
```

### 5. Start Development Server

```bash
# Start the FastAPI server with auto-reload
make dev
```

The API will be available at:
- **API**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Detailed Setup Instructions

### Python Virtual Environment

It's recommended to use a virtual environment to isolate dependencies:

```bash
# Create virtual environment
python3 -m venv venv

# Activate on Unix/macOS
source venv/bin/activate

# Activate on Windows
venv\Scripts\activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt
```

### Database Setup

#### Using PostgreSQL Locally

1. **Install PostgreSQL**:
   - macOS: `brew install postgresql@14`
   - Ubuntu: `sudo apt-get install postgresql-14`
   - Windows: Download installer from postgresql.org

2. **Start PostgreSQL**:
   ```bash
   # macOS
   brew services start postgresql@14
   
   # Ubuntu
   sudo systemctl start postgresql
   ```

3. **Create Database**:
   ```bash
   # Connect to PostgreSQL
   psql postgres
   
   # Create database and user
   CREATE DATABASE codereview;
   CREATE USER codereview_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE codereview TO codereview_user;
   ```

4. **Update DATABASE_URL in .env**:
   ```
   DATABASE_URL=postgresql://codereview_user:your_password@localhost:5432/codereview
   ```

#### Using Docker for PostgreSQL

```bash
# Start PostgreSQL in Docker
docker run -d \
  --name codereview-postgres \
  -e POSTGRES_DB=codereview \
  -e POSTGRES_USER=codereview_user \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  postgres:14-alpine
```

### Redis Setup

#### Using Redis Locally

1. **Install Redis**:
   - macOS: `brew install redis`
   - Ubuntu: `sudo apt-get install redis-server`
   - Windows: Use WSL or Docker

2. **Start Redis**:
   ```bash
   # macOS
   brew services start redis
   
   # Ubuntu
   sudo systemctl start redis
   ```

#### Using Docker for Redis

```bash
# Start Redis in Docker
docker run -d \
  --name codereview-redis \
  -p 6379:6379 \
  redis:7-alpine
```

### Environment Configuration

Create a `.env` file with the following configuration:

```bash
# Application
ENVIRONMENT=development
DEBUG=True
PORT=8000

# Database
DATABASE_URL=postgresql://codereview_user:password@localhost:5432/codereview
DB_POOL_SIZE=10

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# AI Services
ANTHROPIC_API_KEY=sk-ant-your-key-here

# GitHub
GITHUB_TOKEN=ghp_your_token_here

# Security
SECRET_KEY=your-secret-key-at-least-32-characters-long

# Monitoring
PROMETHEUS_ENABLED=True
LOG_LEVEL=DEBUG
```

## Running Tests

```bash
# Run all tests with coverage
make test

# Run unit tests only
make test-unit

# Run integration tests only
make test-integration

# Run tests in watch mode
make test-watch
```

## Code Quality

### Linting

```bash
# Run all linters
make lint

# Format code
make format

# Type checking
make check
```

### Pre-commit Hooks

Install pre-commit hooks to automatically check code before commits:

```bash
# Install hooks
make pre-commit-install

# Run hooks manually
make pre-commit-run
```

## Docker Setup

### Using Docker Compose

Start all services (PostgreSQL, Redis, API) with one command:

```bash
# Start services
make docker-up

# View logs
make docker-logs

# Stop services
make docker-down
```

### Building Docker Image

```bash
# Build the FastAPI Docker image
make docker-build

# Run the container
docker run -p 8000:8000 --env-file .env codereview-api:latest
```

## Database Migrations

### Creating Migrations

```bash
# Create a new migration
make migrate message="add new table"
```

### Applying Migrations

```bash
# Apply all pending migrations
make upgrade

# Rollback last migration
make downgrade
```

### Reset Database

⚠️ **Warning**: This will delete all data!

```bash
# Reset database to initial state
make db-reset
```

## Development Workflow

### 1. Start Development Server

```bash
# Start server with auto-reload
make dev

# Or with debug logging
make dev-debug
```

### 2. Make Changes

- Edit code in `app/` directory
- Server will automatically reload on changes
- View API docs at http://localhost:8000/docs

### 3. Write Tests

- Add tests in `tests/` directory
- Follow existing test patterns
- Run tests: `make test`

### 4. Format and Lint

```bash
# Format code
make format

# Run linters
make lint
```

### 5. Commit Changes

```bash
git add .
git commit -m "Description of changes"
# Pre-commit hooks will run automatically
```

## API Documentation

### Interactive API Docs

Visit http://localhost:8000/docs for interactive API documentation with Swagger UI.

### Generate Client SDK

```bash
# Generate typed client SDK
make api-docs
```

The generated SDK will be in `./client-sdk` directory.

## Monitoring and Observability

### Health Checks

- **Health**: http://localhost:8000/healthz
- **Readiness**: http://localhost:8000/readyz
- **Metrics**: http://localhost:8000/metrics

### Prometheus Metrics

Metrics are exposed at `/metrics` endpoint in Prometheus format.

## Troubleshooting

### Common Issues

#### Database Connection Error

```bash
# Check if PostgreSQL is running
pg_isready

# Check connection
psql -U codereview_user -d codereview
```

#### Redis Connection Error

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG
```

#### Import Errors

```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

#### Port Already in Use

```bash
# Find process using port 8000
lsof -i :8000

# Kill the process
kill -9 <PID>
```

### Getting Help

- **Documentation**: Check `docs/` directory
- **Issues**: https://github.com/canstralian/CodeReview/issues
- **Discussions**: https://github.com/canstralian/CodeReview/discussions

## Next Steps

- Read [ARCHITECTURE.md](docs/ARCHITECTURE.md) for system design
- Read [CONTRIBUTING.md](docs/CONTRIBUTING.md) for contribution guidelines
- Check [API Documentation](http://localhost:8000/docs) for available endpoints
- Review test examples in `tests/` directory

## Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [Pytest Documentation](https://docs.pytest.org/)
