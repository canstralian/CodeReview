# Makefile for CodeReview FastAPI Application
# Common development and deployment tasks

.PHONY: help init dev test lint format clean install migrate docker-build docker-up docker-down

# Default target - show help
help:
	@echo "CodeReview FastAPI Application - Available Commands:"
	@echo ""
	@echo "Development:"
	@echo "  make init          - Initialize development environment"
	@echo "  make install       - Install Python dependencies"
	@echo "  make dev           - Run development server"
	@echo "  make test          - Run tests with coverage"
	@echo "  make lint          - Run linters and type checking"
	@echo "  make format        - Format code with black and isort"
	@echo ""
	@echo "Database:"
	@echo "  make migrate       - Run database migrations"
	@echo "  make migrate-create- Create new migration"
	@echo "  make db-upgrade    - Upgrade database to latest migration"
	@echo "  make db-downgrade  - Downgrade database by one revision"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-build  - Build Docker images"
	@echo "  make docker-up     - Start Docker services"
	@echo "  make docker-down   - Stop Docker services"
	@echo "  make docker-logs   - View Docker logs"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean         - Remove build artifacts and cache"
	@echo ""

# Initialize development environment
init: install
	@echo "Setting up development environment..."
	@cp -n .env.example .env 2>/dev/null || true
	@echo "Installing pre-commit hooks..."
	@pre-commit install
	@echo "Development environment ready!"

# Install Python dependencies
install:
	@echo "Installing Python dependencies..."
	@pip install -r requirements.txt

# Run development server with auto-reload
dev:
	@echo "Starting FastAPI development server..."
	@uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run tests with coverage
test:
	@echo "Running tests with coverage..."
	@pytest app/tests/ -v --cov=app --cov-report=term-missing --cov-report=html

# Run unit tests only
test-unit:
	@echo "Running unit tests..."
	@pytest app/tests/unit/ -v

# Run integration tests only
test-integration:
	@echo "Running integration tests..."
	@pytest app/tests/integration/ -v

# Run linters and type checking
lint:
	@echo "Running linters..."
	@flake8 app/
	@echo "Running type checking..."
	@mypy app/
	@echo "Running security checks..."
	@bandit -r app/
	@echo "Checking import sorting..."
	@isort --check-only app/

# Format code with black and isort
format:
	@echo "Formatting code with black..."
	@black app/
	@echo "Sorting imports with isort..."
	@isort app/
	@echo "Code formatted successfully!"

# Create Alembic migration
migrate-create:
	@echo "Creating new migration..."
	@read -p "Enter migration message: " message; \
	alembic revision --autogenerate -m "$$message"

# Upgrade database to latest migration
db-upgrade:
	@echo "Upgrading database..."
	@alembic upgrade head

# Downgrade database by one revision
db-downgrade:
	@echo "Downgrading database..."
	@alembic downgrade -1

# Initialize Alembic
db-init:
	@echo "Initializing Alembic..."
	@alembic init alembic

# Build Docker images
docker-build:
	@echo "Building Docker images..."
	@docker-compose build

# Start Docker services
docker-up:
	@echo "Starting Docker services..."
	@docker-compose up -d

# Stop Docker services
docker-down:
	@echo "Stopping Docker services..."
	@docker-compose down

# View Docker logs
docker-logs:
	@docker-compose logs -f

# Clean build artifacts and cache
clean:
	@echo "Cleaning build artifacts and cache..."
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete
	@rm -rf htmlcov/
	@rm -rf .coverage
	@echo "Cleanup complete!"

# Generate OpenAPI schema
openapi:
	@echo "Generating OpenAPI schema..."
	@python -c "import json; from app.main import app; print(json.dumps(app.openapi(), indent=2))" > openapi.json
	@echo "OpenAPI schema saved to openapi.json"

# Run pre-commit hooks on all files
pre-commit:
	@echo "Running pre-commit hooks..."
	@pre-commit run --all-files

# Check security vulnerabilities in dependencies
security-check:
	@echo "Checking for security vulnerabilities..."
	@pip install safety
	@safety check

# Production server with gunicorn
prod:
	@echo "Starting production server..."
	@gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
