/**
 * Queue Client
 * 
 * Abstract queue client that works with RabbitMQ or Kafka
 */

import { queueConfig, queueTopics } from '../config/queue';

export interface Message<T = any> {
  id: string;
  topic: string;
  data: T;
  timestamp: number;
  retries?: number;
}

export interface QueueClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(topic: string, data: any): Promise<void>;
  subscribe(topic: string, handler: (message: Message) => Promise<void>): Promise<void>;
}

/**
 * Mock Queue Client for development
 * Replace with actual RabbitMQ/Kafka client in production
 */
class MockQueueClient implements QueueClient {
  private subscribers = new Map<string, Array<(message: Message) => Promise<void>>>();
  private connected = false;

  async connect(): Promise<void> {
    console.log('Queue client connected (mock mode)');
    console.log('Queue config:', {
      type: queueConfig.type,
      url: queueConfig.url,
    });
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    console.log('Queue client disconnected');
    this.connected = false;
  }

  async publish(topic: string, data: any): Promise<void> {
    if (!this.connected) {
      throw new Error('Queue client not connected');
    }

    const message: Message = {
      id: Math.random().toString(36).substring(7),
      topic,
      data,
      timestamp: Date.now(),
      retries: 0,
    };

    console.log('Publishing message:', { topic, messageId: message.id });

    // Simulate async delivery
    setTimeout(async () => {
      const handlers = this.subscribers.get(topic) || [];
      for (const handler of handlers) {
        try {
          await handler(message);
        } catch (error) {
          console.error('Error handling message:', error);
        }
      }
    }, 100);
  }

  async subscribe(topic: string, handler: (message: Message) => Promise<void>): Promise<void> {
    if (!this.connected) {
      throw new Error('Queue client not connected');
    }

    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, []);
    }

    this.subscribers.get(topic)!.push(handler);
    console.log('Subscribed to topic:', topic);
  }
}

// Export singleton instance
export const queueClient: QueueClient = new MockQueueClient();

/**
 * Initialize queue connection
 */
export async function initializeQueue(): Promise<void> {
  await queueClient.connect();
  
  // TODO: In production, replace with actual RabbitMQ/Kafka client:
  // if (queueConfig.type === 'rabbitmq') {
  //   const amqp = require('amqplib');
  //   queueClient = new RabbitMQClient(amqp, queueConfig);
  // } else {
  //   const { Kafka } = require('kafkajs');
  //   queueClient = new KafkaClient(new Kafka(...), queueConfig);
  // }
}

export default queueClient;
