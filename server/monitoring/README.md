# Monitoring

This folder contains monitoring and observability integrations.

## Contents

- **sentry.ts**: Sentry error tracking setup
- **prometheus.ts**: Prometheus metrics collection
- **healthCheck.ts**: Health check endpoints
- **metrics.ts**: Custom metrics definitions
- **alerts.ts**: Alert configuration

## Sentry Integration

Sentry is used for error tracking and performance monitoring:

```typescript
import * as Sentry from '@sentry/node';
import { sentryConfig } from './monitoring/sentry';

Sentry.init({
  dsn: sentryConfig.dsn,
  environment: sentryConfig.environment,
  tracesSampleRate: 1.0
});
```

## Prometheus Integration

Prometheus is used for performance metrics and monitoring:

```typescript
import { PrometheusClient } from './monitoring/prometheus';

const prometheus = new PrometheusClient();
prometheus.recordMetric('http_requests_total', { method: 'GET', status: 200 });
```

## Metrics

Custom metrics tracked:

- Request latency
- Error rates
- Queue depth
- Worker utilization
- Database connection pool stats
- Cache hit/miss rates

## Health Checks

Health check endpoints for:

- Database connectivity
- Redis connectivity
- Queue connectivity
- Worker availability
- External API status

## Usage

```typescript
import { setupMonitoring } from './monitoring';

const app = express();
setupMonitoring(app);

// Health check endpoint
app.get('/health', healthCheck);

// Metrics endpoint
app.get('/metrics', prometheusMetrics);
```
