.PHONY: help init install dev test lint format check clean docker-build docker-up docker-down migrate upgrade downgrade

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(BLUE)CodeReview FastAPI - Available Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

init: ## Initialize development environment
	@echo "$(BLUE)Initializing development environment...$(NC)"
	@command -v python3 >/dev/null 2>&1 || { echo "$(RED)Python 3 is required but not installed.$(NC)" >&2; exit 1; }
	@python3 -m venv venv || { echo "$(RED)Failed to create virtual environment$(NC)"; exit 1; }
	@echo "$(GREEN)Virtual environment created$(NC)"
	@echo "$(YELLOW)Activate it with: source venv/bin/activate$(NC)"
	@echo "$(YELLOW)Then run: make install$(NC)"

install: ## Install Python dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	@pip install --upgrade pip
	@pip install -r requirements.txt
	@echo "$(GREEN)Dependencies installed$(NC)"

dev: ## Run development server with auto-reload
	@echo "$(BLUE)Starting development server...$(NC)"
	@uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-debug: ## Run development server with debug logging
	@echo "$(BLUE)Starting development server with debug logging...$(NC)"
	@LOG_LEVEL=DEBUG uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --log-level debug

test: ## Run tests with coverage
	@echo "$(BLUE)Running tests...$(NC)"
	@pytest tests/ -v --cov=app --cov-report=html --cov-report=term-missing
	@echo "$(GREEN)Tests completed. Coverage report: htmlcov/index.html$(NC)"

test-unit: ## Run unit tests only
	@echo "$(BLUE)Running unit tests...$(NC)"
	@pytest tests/unit/ -v

test-integration: ## Run integration tests only
	@echo "$(BLUE)Running integration tests...$(NC)"
	@pytest tests/integration/ -v

test-watch: ## Run tests in watch mode
	@echo "$(BLUE)Running tests in watch mode...$(NC)"
	@pytest-watch tests/ -v

lint: ## Run linters (flake8, mypy, bandit)
	@echo "$(BLUE)Running linters...$(NC)"
	@flake8 app tests --count --select=E9,F63,F7,F82 --show-source --statistics
	@flake8 app tests --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics
	@mypy app --ignore-missing-imports
	@bandit -r app -f json -o bandit-report.json || true
	@echo "$(GREEN)Linting completed$(NC)"

format: ## Format code with black and isort
	@echo "$(BLUE)Formatting code...$(NC)"
	@black app tests
	@isort app tests
	@echo "$(GREEN)Code formatted$(NC)"

check: ## Run type checking
	@echo "$(BLUE)Running type checks...$(NC)"
	@mypy app --ignore-missing-imports
	@echo "$(GREEN)Type checking completed$(NC)"

pre-commit-install: ## Install pre-commit hooks
	@echo "$(BLUE)Installing pre-commit hooks...$(NC)"
	@pre-commit install
	@echo "$(GREEN)Pre-commit hooks installed$(NC)"

pre-commit-run: ## Run pre-commit hooks on all files
	@echo "$(BLUE)Running pre-commit hooks...$(NC)"
	@pre-commit run --all-files

clean: ## Clean temporary files and caches
	@echo "$(BLUE)Cleaning temporary files...$(NC)"
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@find . -type f -name "*.pyo" -delete 2>/dev/null || true
	@find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	@rm -rf htmlcov/ .coverage 2>/dev/null || true
	@rm -rf dist/ build/ 2>/dev/null || true
	@echo "$(GREEN)Cleaned temporary files$(NC)"

docker-build: ## Build Docker image
	@echo "$(BLUE)Building Docker image...$(NC)"
	@docker build -t codereview-api:latest -f Dockerfile.fastapi .
	@echo "$(GREEN)Docker image built$(NC)"

docker-up: ## Start services with Docker Compose
	@echo "$(BLUE)Starting services...$(NC)"
	@docker-compose up -d
	@echo "$(GREEN)Services started$(NC)"

docker-down: ## Stop services with Docker Compose
	@echo "$(BLUE)Stopping services...$(NC)"
	@docker-compose down
	@echo "$(GREEN)Services stopped$(NC)"

docker-logs: ## View Docker Compose logs
	@docker-compose logs -f

migrate: ## Create new database migration
	@echo "$(BLUE)Creating new migration...$(NC)"
	@alembic revision --autogenerate -m "$(message)"
	@echo "$(GREEN)Migration created$(NC)"

upgrade: ## Apply database migrations
	@echo "$(BLUE)Applying database migrations...$(NC)"
	@alembic upgrade head
	@echo "$(GREEN)Migrations applied$(NC)"

downgrade: ## Rollback last database migration
	@echo "$(BLUE)Rolling back last migration...$(NC)"
	@alembic downgrade -1
	@echo "$(GREEN)Migration rolled back$(NC)"

db-reset: ## Reset database (WARNING: destructive)
	@echo "$(RED)WARNING: This will delete all data!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "$(BLUE)Resetting database...$(NC)"; \
		alembic downgrade base; \
		alembic upgrade head; \
		echo "$(GREEN)Database reset$(NC)"; \
	else \
		echo "$(YELLOW)Cancelled$(NC)"; \
	fi

sbom: ## Generate Software Bill of Materials
	@echo "$(BLUE)Generating SBOM...$(NC)"
	@pip install cyclonedx-bom
	@cyclonedx-py -r -i requirements.txt -o sbom.json
	@echo "$(GREEN)SBOM generated: sbom.json$(NC)"

security-check: ## Run security vulnerability scan
	@echo "$(BLUE)Running security checks...$(NC)"
	@pip install safety
	@safety check --json
	@bandit -r app -f screen
	@echo "$(GREEN)Security check completed$(NC)"

api-docs: ## Generate API client SDK
	@echo "$(BLUE)Generating API client SDK...$(NC)"
	@pip install fastapi-codegen
	@fastapi-codegen --input http://localhost:8000/openapi.json --output ./client-sdk
	@echo "$(GREEN)Client SDK generated in ./client-sdk$(NC)"

run-prod: ## Run production server with Gunicorn
	@echo "$(BLUE)Starting production server...$(NC)"
	@gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

stats: ## Show project statistics
	@echo "$(BLUE)Project Statistics$(NC)"
	@echo ""
	@echo "$(GREEN)Python Files:$(NC)"
	@find app -name "*.py" | wc -l
	@echo "$(GREEN)Test Files:$(NC)"
	@find tests -name "*.py" 2>/dev/null | wc -l || echo "0"
	@echo "$(GREEN)Lines of Code:$(NC)"
	@find app -name "*.py" -exec wc -l {} + | tail -1 | awk '{print $$1}'
	@echo "$(GREEN)Test Coverage:$(NC)"
	@pytest tests/ --cov=app --cov-report=term-missing | grep TOTAL || echo "Run 'make test' first"
