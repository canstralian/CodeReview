/**
 * Queue Producers
 * 
 * Message producers for enqueueing tasks
 */

import { queueClient, Message } from './queueClient';
import { queueTopics } from '../config/queue';

export interface AnalysisTask {
  repositoryId: number;
  repositoryUrl: string;
  branch?: string;
  files?: string[];
  analysisType: 'full' | 'security' | 'quality' | 'performance';
}

/**
 * Queue Producer class
 */
export class QueueProducer {
  /**
   * Publish a message to a queue topic
   */
  async publish<T>(topic: string, data: T): Promise<void> {
    await queueClient.publish(topic, data);
  }

  /**
   * Enqueue code analysis task
   */
  async enqueueCodeAnalysis(task: AnalysisTask): Promise<void> {
    console.log('Enqueueing code analysis task:', {
      repositoryId: task.repositoryId,
      analysisType: task.analysisType,
    });

    await this.publish(queueTopics.codeAnalysis, task);
  }

  /**
   * Enqueue security scan task
   */
  async enqueueSecurityScan(task: AnalysisTask): Promise<void> {
    console.log('Enqueueing security scan task:', {
      repositoryId: task.repositoryId,
    });

    await this.publish(queueTopics.securityScan, task);
  }

  /**
   * Enqueue quality check task
   */
  async enqueueQualityCheck(task: AnalysisTask): Promise<void> {
    console.log('Enqueueing quality check task:', {
      repositoryId: task.repositoryId,
    });

    await this.publish(queueTopics.qualityCheck, task);
  }

  /**
   * Enqueue dependency check task
   */
  async enqueueDependencyCheck(task: AnalysisTask): Promise<void> {
    console.log('Enqueueing dependency check task:', {
      repositoryId: task.repositoryId,
    });

    await this.publish(queueTopics.dependencyCheck, task);
  }
}

// Export singleton instance
export const queueProducer = new QueueProducer();

export default queueProducer;
