# Monitoring and Performance Testing Guide

## Overview

This guide covers the production-ready monitoring, health checking, and performance testing features added to the CodeReview application.

## Health Check Endpoints

### Comprehensive Health Check
**Endpoint:** `GET /health`

Returns detailed health status of all system components:

```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2025-10-15T16:39:21.772Z",
  "uptime": 22.247,
  "checks": {
    "api": { "status": "up" },
    "database": { 
      "status": "up", 
      "latency": 12,
      "details": {
        "totalCount": 10,
        "idleCount": 8,
        "waitingCount": 0,
        "active": 2
      }
    },
    "redis": { "status": "up", "latency": 3 },
    "queue": { "status": "up" }
  }
}
```

**Status Codes:**
- `200`: All systems healthy
- `503`: One or more systems unhealthy

### Readiness Check (Kubernetes)
**Endpoint:** `GET /health/ready`

Indicates if the application is ready to serve traffic.

### Liveness Check (Kubernetes)
**Endpoint:** `GET /health/live`

Indicates if the application is alive and responding.

## Database Performance Monitoring

### Get Database Metrics
**Endpoint:** `GET /api/database-metrics`

Returns current database performance metrics:

```json
{
  "queries": {
    "count": 1250,
    "avgDuration": 45.2,
    "slowQueries": 3
  },
  "connectionPool": {
    "total": 10,
    "idle": 7,
    "waiting": 0,
    "active": 3
  }
}
```

**Metrics Tracked:**
- **Query Count**: Total number of queries executed
- **Average Duration**: Mean query execution time (ms)
- **Slow Queries**: Queries taking >1000ms
- **Connection Pool**: Active database connections

### Database Stress Test
**Endpoint:** `POST /api/database-stress-test`

Simulates load on the database to test performance under stress.

**Request Body:**
```json
{
  "concurrentQueries": 10,
  "duration": 10000,
  "queryDelay": 100
}
```

**Parameters:**
- `concurrentQueries` (1-100): Number of simultaneous queries
- `duration` (1000-60000ms): Test duration
- `queryDelay` (0-1000ms): Delay between query batches

**Response:**
```json
{
  "totalQueries": 250,
  "successfulQueries": 250,
  "failedQueries": 0,
  "avgResponseTime": 10.16,
  "maxResponseTime": 12,
  "minResponseTime": 10,
  "queriesPerSecond": 82.67
}
```

## Frontend Session Status

### SessionStatus Component

The `SessionStatus` component provides clear visual feedback for all operation states:

**States:**
- `idle`: No activity (hidden)
- `loading`: Operation in progress (with optional progress bar)
- `success`: Operation completed successfully
- `error`: Operation failed
- `timeout`: Operation timed out

**Usage:**
```tsx
import SessionStatus from '@/components/SessionStatus';

<SessionStatus 
  status="loading" 
  message="Analyzing repository..."
  progress={45}
/>
```

**Features:**
- Color-coded status indicators (blue, green, red, orange)
- Clear icon representations
- Progress bar for loading states
- Default messages for each state
- Smooth transitions

### Enhanced LoadingState

The improved `LoadingState` component now includes:
- Progress tracking (0-100%)
- Automatic progress simulation
- Clear status messages
- User-friendly time estimates

## End-to-End Testing

### Running E2E Tests

```bash
npm test tests/e2e
```

### Test Coverage

The E2E test suite covers:

1. **Health Check Workflow**
   - Health endpoint response validation
   - Database connectivity verification
   - Service status checks

2. **Repository Analysis Workflow**
   - Valid GitHub URL handling
   - Invalid input error handling
   - Session status tracking

3. **Performance Tests**
   - Concurrent request handling
   - Response time verification
   - Load handling capacity

4. **Error Handling**
   - Proper error format validation
   - Timeout handling
   - Recovery mechanisms

### Test Configuration

Test environment variables:
```bash
TEST_API_BASE=http://localhost:5000
```

## Performance Thresholds

### Response Times
- Health check: < 100ms
- API endpoints: < 500ms (95th percentile)
- Repository analysis: < 30s
- Page load: < 2s

### Resource Limits
- CPU usage: < 70% average
- Memory usage: < 80%
- Database connections: < 80% pool size
- Disk usage: < 80%

### Error Rates
- HTTP 5xx errors: < 0.1%
- HTTP 4xx errors: < 5%
- Database errors: < 0.01%

## Monitoring Integration

### Prometheus Metrics

The application exposes Prometheus-compatible metrics at `/metrics` (when enabled).

**Key Metrics:**
- `http_requests_total`: Total HTTP requests
- `http_request_duration_seconds`: Request latency
- `database_query_duration_seconds`: Query execution time
- `database_connections_active`: Active database connections
- `redis_operations_total`: Redis operation count

### Sentry Error Tracking

Configure Sentry for error tracking:

```bash
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
SENTRY_ENABLED=true
```

## Production Deployment

### Pre-Deployment Checklist

Before deploying to production:

1. ✅ Run health check endpoint
2. ✅ Execute database stress test
3. ✅ Verify all E2E tests pass
4. ✅ Check error tracking is configured
5. ✅ Validate monitoring dashboards
6. ✅ Test rollback procedures

### Monitoring During Deployment

Monitor these metrics during deployment:

```bash
# Health check
curl https://your-domain.com/health

# Database metrics
curl https://your-domain.com/api/database-metrics

# Stress test (staging only)
curl -X POST https://staging.your-domain.com/api/database-stress-test \
  -H "Content-Type: application/json" \
  -d '{"concurrentQueries": 5, "duration": 5000}'
```

### Post-Deployment Verification

After deployment:

1. Monitor error rates in Sentry
2. Check response times in Prometheus
3. Verify database performance metrics
4. Test critical user workflows
5. Monitor resource utilization

## Troubleshooting

### Health Check Shows Unhealthy

**Database Down:**
```bash
# Check database connectivity
curl https://your-domain.com/api/db-health

# Check database logs
docker logs <database-container>
```

**Redis Down:**
- Verify Redis is running
- Check Redis connection settings
- Review Redis logs

### High Response Times

1. Check database metrics for slow queries
2. Review connection pool utilization
3. Verify Redis cache hit rates
4. Check server resource usage

### Failed Stress Tests

If stress tests show high failure rates:

1. Review database connection pool size
2. Check for connection leaks
3. Verify database query optimization
4. Consider scaling database resources

## Best Practices

### Health Checks
- Monitor health endpoints continuously
- Set up alerts for unhealthy status
- Check all components, not just API
- Include latency metrics

### Performance Testing
- Run stress tests during off-peak hours
- Start with low load and gradually increase
- Monitor resource usage during tests
- Document baseline metrics

### Session Status
- Always show loading indicators
- Provide clear error messages
- Include progress tracking for long operations
- Implement timeout handling

### Monitoring
- Set up dashboards before deployment
- Configure alerts with appropriate thresholds
- Review metrics regularly
- Document incident response procedures

## Support

For issues or questions:
- Check the release checklist: `RELEASE_CHECKLIST.md`
- Review API documentation: `server/README.md`
- Report issues on GitHub

---

**Last Updated:** 2025-10-15  
**Version:** 1.0.0
