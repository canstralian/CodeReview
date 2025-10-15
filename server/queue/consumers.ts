/**
 * Queue Consumers
 * 
 * Message consumers for processing tasks
 */

import { queueClient, Message } from './queueClient';
import { queueTopics } from '../config/queue';
import type { AnalysisTask } from './producers';

export type MessageHandler<T = any> = (message: Message<T>) => Promise<void>;

/**
 * Queue Consumer class
 */
export class QueueConsumer {
  private topic: string;
  private handler: MessageHandler;

  constructor(topic: string, handler: MessageHandler) {
    this.topic = topic;
    this.handler = handler;
  }

  /**
   * Start consuming messages
   */
  async start(): Promise<void> {
    console.log('Starting consumer for topic:', this.topic);
    await queueClient.subscribe(this.topic, this.handler);
  }

  /**
   * Stop consuming messages
   */
  async stop(): Promise<void> {
    console.log('Stopping consumer for topic:', this.topic);
    // Implement stop logic
  }
}

/**
 * Create analysis task consumer
 */
export function createAnalysisConsumer(
  handler: (task: AnalysisTask) => Promise<void>
): QueueConsumer {
  return new QueueConsumer(
    queueTopics.codeAnalysis,
    async (message: Message<AnalysisTask>) => {
      console.log('Processing analysis task:', message.id);
      await handler(message.data);
    }
  );
}

/**
 * Create security scan consumer
 */
export function createSecurityConsumer(
  handler: (task: AnalysisTask) => Promise<void>
): QueueConsumer {
  return new QueueConsumer(
    queueTopics.securityScan,
    async (message: Message<AnalysisTask>) => {
      console.log('Processing security scan:', message.id);
      await handler(message.data);
    }
  );
}

/**
 * Create quality check consumer
 */
export function createQualityConsumer(
  handler: (task: AnalysisTask) => Promise<void>
): QueueConsumer {
  return new QueueConsumer(
    queueTopics.qualityCheck,
    async (message: Message<AnalysisTask>) => {
      console.log('Processing quality check:', message.id);
      await handler(message.data);
    }
  );
}

/**
 * Create dependency check consumer
 */
export function createDependencyConsumer(
  handler: (task: AnalysisTask) => Promise<void>
): QueueConsumer {
  return new QueueConsumer(
    queueTopics.dependencyCheck,
    async (message: Message<AnalysisTask>) => {
      console.log('Processing dependency check:', message.id);
      await handler(message.data);
    }
  );
}

export default QueueConsumer;
