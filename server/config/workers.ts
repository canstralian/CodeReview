/**
 * Worker Pool Configuration
 * 
 * Configuration for Docker-based static analysis workers
 */

import { config } from 'dotenv';
config();

export interface WorkerConfig {
  maxWorkers: number;
  minWorkers: number;
  taskTimeout: number;
  dockerImage: string;
  dockerRegistry?: string;
  memoryLimit: string;
  cpuLimit: string;
  networkMode: string;
  autoScale: boolean;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
}

export const workerConfig: WorkerConfig = {
  // Maximum number of worker instances
  maxWorkers: parseInt(process.env.MAX_WORKERS || '10', 10),
  
  // Minimum number of worker instances
  minWorkers: parseInt(process.env.MIN_WORKERS || '2', 10),
  
  // Task timeout in milliseconds (5 minutes)
  taskTimeout: parseInt(process.env.WORKER_TASK_TIMEOUT || '300000', 10),
  
  // Docker image for analysis workers
  dockerImage: process.env.WORKER_DOCKER_IMAGE || 'code-analysis:latest',
  
  // Docker registry URL (if using private registry)
  dockerRegistry: process.env.DOCKER_REGISTRY,
  
  // Memory limit per container
  memoryLimit: process.env.WORKER_MEMORY_LIMIT || '2g',
  
  // CPU limit per container
  cpuLimit: process.env.WORKER_CPU_LIMIT || '1',
  
  // Docker network mode
  networkMode: process.env.WORKER_NETWORK_MODE || 'bridge',
  
  // Enable auto-scaling
  autoScale: process.env.WORKER_AUTO_SCALE === 'true',
  
  // Queue depth threshold to scale up
  scaleUpThreshold: parseInt(process.env.WORKER_SCALE_UP_THRESHOLD || '10', 10),
  
  // Queue depth threshold to scale down
  scaleDownThreshold: parseInt(process.env.WORKER_SCALE_DOWN_THRESHOLD || '2', 10),
};

// Worker task types
export enum WorkerTaskType {
  SECURITY_SCAN = 'security_scan',
  CODE_QUALITY = 'code_quality',
  PERFORMANCE_ANALYSIS = 'performance_analysis',
  DEPENDENCY_CHECK = 'dependency_check',
  FULL_ANALYSIS = 'full_analysis',
}

// Task priority levels
export enum TaskPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

export default workerConfig;
