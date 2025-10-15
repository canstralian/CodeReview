/**
 * Monitoring Configuration
 * 
 * Sentry and Prometheus setup for observability
 */

import { config } from 'dotenv';
config();

// Sentry Configuration
export interface SentryConfig {
  dsn: string;
  environment: string;
  tracesSampleRate: number;
  profilesSampleRate: number;
  enabled: boolean;
}

export const sentryConfig: SentryConfig = {
  // Sentry DSN
  dsn: process.env.SENTRY_DSN || '',
  
  // Environment name
  environment: process.env.NODE_ENV || 'development',
  
  // Traces sample rate (0.0 to 1.0)
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '1.0'),
  
  // Profiles sample rate (0.0 to 1.0)
  profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '1.0'),
  
  // Enable/disable Sentry
  enabled: process.env.SENTRY_ENABLED === 'true' && Boolean(process.env.SENTRY_DSN),
};

// Prometheus Configuration
export interface PrometheusConfig {
  enabled: boolean;
  port: number;
  path: string;
  defaultLabels: Record<string, string>;
}

export const prometheusConfig: PrometheusConfig = {
  // Enable/disable Prometheus
  enabled: process.env.PROMETHEUS_ENABLED !== 'false',
  
  // Metrics endpoint port (if separate from main app)
  port: parseInt(process.env.PROMETHEUS_PORT || '9090', 10),
  
  // Metrics endpoint path
  path: process.env.PROMETHEUS_PATH || '/metrics',
  
  // Default labels for all metrics
  defaultLabels: {
    app: 'codereview',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0',
  },
};

// Custom metrics definitions
export const metricsConfig = {
  // HTTP metrics
  httpRequestDuration: 'http_request_duration_seconds',
  httpRequestsTotal: 'http_requests_total',
  httpRequestsInProgress: 'http_requests_in_progress',
  
  // Queue metrics
  queueMessagesTotal: 'queue_messages_total',
  queueMessagesInProgress: 'queue_messages_in_progress',
  queueProcessingDuration: 'queue_processing_duration_seconds',
  
  // Worker metrics
  workerPoolSize: 'worker_pool_size',
  workerTasksProcessed: 'worker_tasks_processed_total',
  workerTasksFailures: 'worker_tasks_failures_total',
  
  // Database metrics
  dbConnectionPoolSize: 'db_connection_pool_size',
  dbConnectionsActive: 'db_connections_active',
  dbQueryDuration: 'db_query_duration_seconds',
  
  // Cache metrics
  cacheHits: 'cache_hits_total',
  cacheMisses: 'cache_misses_total',
  cacheSize: 'cache_size_bytes',
};

export default { sentryConfig, prometheusConfig, metricsConfig };
