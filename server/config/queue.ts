/**
 * Message Queue Configuration
 * 
 * Configuration for RabbitMQ/Kafka task orchestration
 */

import { config } from 'dotenv';
config();

export type QueueType = 'rabbitmq' | 'kafka';

export interface QueueConfig {
  type: QueueType;
  url: string;
  prefetch: number;
  retries: number;
  retryDelay: number;
  deadLetterExchange?: string;
}

export interface RabbitMQConfig extends QueueConfig {
  type: 'rabbitmq';
  exchange: string;
  exchangeType: 'direct' | 'topic' | 'fanout';
}

export interface KafkaConfig extends QueueConfig {
  type: 'kafka';
  groupId: string;
  sessionTimeout: number;
  heartbeatInterval: number;
}

// Queue type selection
const queueType = (process.env.QUEUE_TYPE || 'rabbitmq') as QueueType;

// Common queue configuration
const commonConfig = {
  url: process.env.QUEUE_URL || 'amqp://localhost',
  prefetch: parseInt(process.env.QUEUE_PREFETCH || '1', 10),
  retries: parseInt(process.env.QUEUE_RETRIES || '3', 10),
  retryDelay: parseInt(process.env.QUEUE_RETRY_DELAY || '5000', 10),
};

// RabbitMQ specific configuration
export const rabbitmqConfig: RabbitMQConfig = {
  ...commonConfig,
  type: 'rabbitmq',
  exchange: process.env.RABBITMQ_EXCHANGE || 'codereview',
  exchangeType: (process.env.RABBITMQ_EXCHANGE_TYPE as 'direct' | 'topic' | 'fanout') || 'topic',
  deadLetterExchange: process.env.RABBITMQ_DLX || 'codereview.dlx',
};

// Kafka specific configuration
export const kafkaConfig: KafkaConfig = {
  ...commonConfig,
  type: 'kafka',
  groupId: process.env.KAFKA_GROUP_ID || 'codereview-workers',
  sessionTimeout: parseInt(process.env.KAFKA_SESSION_TIMEOUT || '30000', 10),
  heartbeatInterval: parseInt(process.env.KAFKA_HEARTBEAT_INTERVAL || '3000', 10),
};

// Export the active queue configuration
export const queueConfig: QueueConfig = 
  queueType === 'kafka' ? kafkaConfig : rabbitmqConfig;

// Queue topics/routing keys
export const queueTopics = {
  codeAnalysis: 'code.analysis',
  securityScan: 'security.scan',
  qualityCheck: 'quality.check',
  dependencyCheck: 'dependency.check',
};

export default queueConfig;
