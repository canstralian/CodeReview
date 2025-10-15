# System Architecture

This document describes the system architecture for CodeReview AI.

## Overview

CodeReview AI is a comprehensive code analysis and review platform built with a modern, scalable architecture that includes:

- **React Frontend**: User-facing interface built with React and Shadcn UI
- **Express Backend**: API Gateway with microservices architecture
- **PostgreSQL Database**: Persistent data storage with Drizzle ORM
- **Redis Cache**: High-performance caching layer
- **Message Queue**: Task orchestration with RabbitMQ/Kafka
- **Worker Pool**: Docker-based code analysis workers
- **Monitoring**: Sentry for error tracking, Prometheus for metrics

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Load Balancer                            │
└─────────────────────────────────────────────────────────────────┘
                                 │
                ┌────────────────┴────────────────┐
                │                                  │
┌───────────────▼──────────────┐   ┌──────────────▼──────────────┐
│      Frontend (React)        │   │   API Gateway (Express)      │
│  - Shadcn UI Components      │   │  - Authentication            │
│  - React Query               │   │  - Rate Limiting             │
│  - Wouter Router             │   │  - Request Validation        │
└──────────────────────────────┘   └──────────────┬───────────────┘
                                                   │
                          ┌────────────────────────┼────────────────────────┐
                          │                        │                        │
              ┌───────────▼──────────┐ ┌──────────▼─────────┐  ┌──────────▼─────────┐
              │   Services Layer     │ │  Cache (Redis)     │  │  Queue (RabbitMQ)  │
              │  - GitHub Client     │ │  - Session Store   │  │  - Task Queue      │
              │  - Security Scanner  │ │  - API Cache       │  │  - Job Scheduling  │
              │  - AI Suggestions    │ │  - Rate Limit      │  │  - Event Stream    │
              │  - Quality Trends    │ └────────────────────┘  └────────────────────┘
              └───────────┬──────────┘                                    │
                          │                                               │
                          │                                    ┌──────────▼─────────┐
                          │                                    │   Worker Pool      │
                          │                                    │  - Docker Runner   │
                          │                                    │  - Task Processor  │
                          │                                    │  - Auto Scaling    │
                          │                                    └────────────────────┘
                          │
              ┌───────────▼──────────┐
              │  Database (Postgres) │
              │  - Drizzle ORM       │
              │  - Migrations        │
              │  - Connection Pool   │
              └──────────────────────┘
```

## Component Details

### 1. Frontend (Client)

**Location**: `/client`

**Technology Stack**:
- React 19 with TypeScript
- Shadcn UI for components
- TailwindCSS for styling
- Wouter for routing
- React Query for data fetching

**Structure**:
```
client/
├── src/
│   ├── components/     # Reusable UI components
│   │   ├── ui/         # Shadcn UI components
│   │   └── ...
│   ├── pages/          # Page components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility functions
│   └── types/          # TypeScript definitions
```

### 2. Backend (Server)

**Location**: `/server`

**Technology Stack**:
- Express.js with TypeScript
- Node.js runtime
- Drizzle ORM for database access
- Docker for worker isolation

**Structure**:
```
server/
├── routes.ts           # API route definitions
├── index.ts            # Server entry point
├── middleware/         # Express middleware
│   ├── logging.ts      # Request logging
│   ├── rateLimit.ts    # Rate limiting
│   └── errorHandler.ts # Error handling
├── services/           # Business logic services
│   ├── githubClient.ts
│   ├── securityScanner.ts
│   ├── aiSuggestions.ts
│   └── qualityTrends.ts
├── workers/            # Worker pool management
│   └── workerPool.ts
├── queue/              # Message queue integration
│   ├── queueClient.ts
│   ├── producers.ts
│   └── consumers.ts
├── cache/              # Redis caching layer
│   ├── redisClient.ts
│   └── cacheService.ts
├── monitoring/         # Observability
│   ├── sentry.ts
│   ├── prometheus.ts
│   └── healthCheck.ts
├── config/             # Configuration
│   ├── database.ts
│   ├── redis.ts
│   ├── queue.ts
│   ├── workers.ts
│   └── monitoring.ts
├── models/             # Data models
├── utils/              # Utility functions
├── db.ts               # Database connection
└── storage.ts          # Data access layer
```

### 3. Database

**Technology**: PostgreSQL with Drizzle ORM

**Location**: `/database`

**Structure**:
```
database/
├── migrations/         # Database migrations
│   └── README.md
└── seeds/              # Seed data
    └── README.md
```

**Schema**: Defined in `/shared/schema.ts`

### 4. Shared Code

**Location**: `/shared`

Contains code shared between client and server:
- Database schema definitions
- Type definitions
- Validation schemas

### 5. Infrastructure Components

#### Message Queue (RabbitMQ/Kafka)

Handles asynchronous task distribution:

- **Purpose**: Decouples API from long-running analysis tasks
- **Topics**:
  - `code.analysis`: Full code analysis
  - `security.scan`: Security vulnerability scanning
  - `quality.check`: Code quality checks
  - `dependency.check`: Dependency vulnerability checks

#### Cache Layer (Redis)

Provides high-performance caching:

- **Session storage**: User sessions
- **API caching**: Frequently accessed data
- **Rate limiting**: Request rate tracking
- **Temporary data**: Short-lived analysis results

#### Worker Pool

Docker-based worker containers for code analysis:

- **Auto-scaling**: Scales based on queue depth
- **Isolation**: Each analysis runs in isolated container
- **Resource limits**: Memory and CPU constraints
- **Task timeout**: Prevents hanging jobs

#### Monitoring & Observability

**Sentry**: Error tracking and performance monitoring
- Exception capture
- Performance traces
- User feedback
- Release tracking

**Prometheus**: Metrics collection
- HTTP request metrics
- Queue depth metrics
- Worker pool metrics
- Database metrics
- Cache metrics

## API Design

### RESTful Endpoints

```
POST   /api/repositories            # Create repository entry
GET    /api/repositories/:id        # Get repository details
POST   /api/repositories/:id/scan   # Trigger code analysis
GET    /api/issues                  # List code issues
GET    /api/issues/:id              # Get issue details
POST   /api/analyze-code            # AI code analysis
POST   /api/team-dashboard          # Team metrics
GET    /health                      # Health check
GET    /metrics                     # Prometheus metrics
```

### Authentication

- Session-based authentication
- OAuth integration (GitHub)
- API key support for integrations

### Rate Limiting

Default: 100 requests per 15 minutes
Strict endpoints: 10 requests per minute

## Deployment Architecture

### Development

```
npm run dev   # Starts both frontend and backend
```

### Production

```
npm run build    # Build frontend and compile backend
npm start        # Start production server
```

### Docker Deployment

```yaml
services:
  app:
    image: codereview-ai:latest
    ports:
      - "5000:5000"
    depends_on:
      - postgres
      - redis
      - rabbitmq
  
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: codereview
  
  redis:
    image: redis:7-alpine
  
  rabbitmq:
    image: rabbitmq:3-management
```

## Scaling Strategy

### Horizontal Scaling

- Multiple API Gateway instances behind load balancer
- Worker pool auto-scales based on queue depth
- Redis cluster for distributed caching
- PostgreSQL read replicas for read-heavy workloads

### Vertical Scaling

- Increase worker container resources
- Optimize database queries and indexes
- Tune Redis memory allocation
- Adjust connection pool sizes

## Security

### Application Security

- Input validation on all endpoints
- SQL injection prevention via ORM
- XSS protection via React
- CSRF tokens for state-changing operations
- Rate limiting to prevent abuse

### Infrastructure Security

- Docker container isolation
- Network segmentation
- Encrypted connections (TLS/SSL)
- Secrets management via environment variables
- Regular security audits

## Monitoring & Alerting

### Key Metrics

- API response time
- Error rates
- Queue depth
- Worker utilization
- Database performance
- Cache hit/miss rates

### Alerts

- High error rate
- Queue backlog
- Worker failures
- Database connection issues
- High memory/CPU usage

## Development Workflow

1. **Local Development**: Run with hot reload
2. **Testing**: Unit and integration tests
3. **Code Review**: Automated code analysis
4. **CI/CD**: Automated builds and deployments
5. **Monitoring**: Real-time error tracking and metrics

## Future Enhancements

- [ ] Kubernetes deployment
- [ ] GraphQL API
- [ ] Real-time notifications (WebSocket)
- [ ] Machine learning models for analysis
- [ ] Plugin system for custom analyzers
- [ ] Multi-region deployment
- [ ] Advanced caching strategies
- [ ] API versioning

## References

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Shadcn UI Components](https://ui.shadcn.com/)
- [Express.js Documentation](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/docs/)
- [RabbitMQ Documentation](https://www.rabbitmq.com/documentation.html)
