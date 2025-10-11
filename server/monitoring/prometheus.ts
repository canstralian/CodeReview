/**
 * Prometheus Metrics
 * 
 * Performance monitoring and metrics collection
 */

import { prometheusConfig, metricsConfig } from '../config/monitoring';

export interface Metric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  value: number;
  labels?: Record<string, string>;
  timestamp?: number;
}

/**
 * Mock Prometheus client for development
 * In production, use 'prom-client' package
 */
export class PrometheusClient {
  private enabled: boolean;
  private metrics: Map<string, Metric[]> = new Map();

  constructor() {
    this.enabled = prometheusConfig.enabled;
    
    if (this.enabled) {
      this.initialize();
    }
  }

  /**
   * Initialize Prometheus
   */
  private initialize(): void {
    console.log('Prometheus initialized:', {
      enabled: this.enabled,
      path: prometheusConfig.path,
    });

    // TODO: In production, initialize actual Prometheus:
    // const client = require('prom-client');
    // const register = new client.Registry();
    // register.setDefaultLabels(prometheusConfig.defaultLabels);
  }

  /**
   * Record counter metric
   */
  incrementCounter(name: string, labels?: Record<string, string>, value: number = 1): void {
    if (!this.enabled) return;

    const metric: Metric = {
      name,
      type: 'counter',
      value,
      labels,
      timestamp: Date.now(),
    };

    this.recordMetric(metric);

    // TODO: In production, increment counter:
    // counter.inc(labels, value);
  }

  /**
   * Set gauge metric
   */
  setGauge(name: string, labels: Record<string, string> | undefined, value: number): void {
    if (!this.enabled) return;

    const metric: Metric = {
      name,
      type: 'gauge',
      value,
      labels,
      timestamp: Date.now(),
    };

    this.recordMetric(metric);

    // TODO: In production, set gauge:
    // gauge.set(labels, value);
  }

  /**
   * Observe histogram metric
   */
  observeHistogram(name: string, labels: Record<string, string> | undefined, value: number): void {
    if (!this.enabled) return;

    const metric: Metric = {
      name,
      type: 'histogram',
      value,
      labels,
      timestamp: Date.now(),
    };

    this.recordMetric(metric);

    // TODO: In production, observe histogram:
    // histogram.observe(labels, value);
  }

  /**
   * Record generic metric
   */
  private recordMetric(metric: Metric): void {
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }

    this.metrics.get(metric.name)!.push(metric);

    console.log('[Prometheus]', {
      name: metric.name,
      type: metric.type,
      value: metric.value,
      labels: metric.labels,
    });
  }

  /**
   * Get metrics in Prometheus format
   */
  getMetrics(): string {
    let output = '';

    for (const [name, metrics] of this.metrics) {
      const latest = metrics[metrics.length - 1];
      const labelsStr = latest.labels 
        ? Object.entries(latest.labels).map(([k, v]) => `${k}="${v}"`).join(',')
        : '';

      output += `${name}{${labelsStr}} ${latest.value}\n`;
    }

    return output;

    // TODO: In production, return actual Prometheus metrics:
    // const client = require('prom-client');
    // return register.metrics();
  }

  /**
   * Record HTTP request
   */
  recordHttpRequest(method: string, path: string, statusCode: number, duration: number): void {
    this.incrementCounter(metricsConfig.httpRequestsTotal, {
      method,
      path,
      status: statusCode.toString(),
    });

    this.observeHistogram(metricsConfig.httpRequestDuration, {
      method,
      path,
    }, duration / 1000);
  }

  /**
   * Record queue message
   */
  recordQueueMessage(topic: string, status: 'success' | 'failure', duration: number): void {
    this.incrementCounter(metricsConfig.queueMessagesTotal, {
      topic,
      status,
    });

    this.observeHistogram(metricsConfig.queueProcessingDuration, {
      topic,
    }, duration / 1000);
  }

  /**
   * Record worker metrics
   */
  recordWorkerMetrics(poolSize: number, tasksProcessed: number, failures: number): void {
    this.setGauge(metricsConfig.workerPoolSize, undefined, poolSize);
    this.incrementCounter(metricsConfig.workerTasksProcessed, undefined, tasksProcessed);
    this.incrementCounter(metricsConfig.workerTasksFailures, undefined, failures);
  }

  /**
   * Record cache metrics
   */
  recordCacheMetrics(operation: 'hit' | 'miss', key: string): void {
    if (operation === 'hit') {
      this.incrementCounter(metricsConfig.cacheHits, { key });
    } else {
      this.incrementCounter(metricsConfig.cacheMisses, { key });
    }
  }
}

// Export singleton instance
export const prometheusClient = new PrometheusClient();

export default prometheusClient;
