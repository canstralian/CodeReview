/**
 * Worker Pool
 * 
 * Manages a pool of Docker-based worker containers for code analysis
 */

import { workerConfig, WorkerTaskType, TaskPriority } from '../config/workers';

export interface WorkerTask {
  id: string;
  type: WorkerTaskType;
  priority: TaskPriority;
  data: any;
  retries: number;
  createdAt: number;
}

export interface Worker {
  id: string;
  containerId?: string;
  status: 'idle' | 'busy' | 'starting' | 'stopping';
  currentTask?: WorkerTask;
  startedAt: number;
  completedTasks: number;
}

/**
 * Worker Pool Manager
 */
export class WorkerPool {
  private workers: Map<string, Worker> = new Map();
  private taskQueue: WorkerTask[] = [];
  private isRunning = false;

  constructor(private config = workerConfig) {}

  /**
   * Start the worker pool
   */
  async start(): Promise<void> {
    console.log('Starting worker pool...');
    this.isRunning = true;

    // Initialize minimum number of workers
    for (let i = 0; i < this.config.minWorkers; i++) {
      await this.createWorker();
    }

    // Start task processing loop
    this.processTaskQueue();

    console.log(`Worker pool started with ${this.config.minWorkers} workers`);
  }

  /**
   * Stop the worker pool
   */
  async stop(): Promise<void> {
    console.log('Stopping worker pool...');
    this.isRunning = false;

    // Stop all workers
    for (const [workerId, worker] of this.workers) {
      await this.stopWorker(workerId);
    }

    console.log('Worker pool stopped');
  }

  /**
   * Create a new worker
   */
  private async createWorker(): Promise<Worker> {
    const workerId = `worker-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const worker: Worker = {
      id: workerId,
      status: 'starting',
      startedAt: Date.now(),
      completedTasks: 0,
    };

    this.workers.set(workerId, worker);

    // TODO: In production, start Docker container
    // const container = await docker.createContainer({
    //   Image: this.config.dockerImage,
    //   Memory: this.parseMemoryLimit(this.config.memoryLimit),
    //   NanoCpus: this.parseCpuLimit(this.config.cpuLimit),
    // });
    // await container.start();
    // worker.containerId = container.id;

    worker.status = 'idle';
    console.log(`Worker ${workerId} created`);

    return worker;
  }

  /**
   * Stop a worker
   */
  private async stopWorker(workerId: string): Promise<void> {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    worker.status = 'stopping';

    // TODO: In production, stop Docker container
    // if (worker.containerId) {
    //   const container = docker.getContainer(worker.containerId);
    //   await container.stop();
    //   await container.remove();
    // }

    this.workers.delete(workerId);
    console.log(`Worker ${workerId} stopped`);
  }

  /**
   * Add task to queue
   */
  async addTask(task: Omit<WorkerTask, 'id' | 'retries' | 'createdAt'>): Promise<string> {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const workerTask: WorkerTask = {
      ...task,
      id: taskId,
      retries: 0,
      createdAt: Date.now(),
    };

    // Insert task based on priority
    const insertIndex = this.taskQueue.findIndex(t => t.priority < workerTask.priority);
    if (insertIndex === -1) {
      this.taskQueue.push(workerTask);
    } else {
      this.taskQueue.splice(insertIndex, 0, workerTask);
    }

    console.log(`Task ${taskId} added to queue (priority: ${task.priority})`);

    // Auto-scale if needed
    await this.autoScale();

    return taskId;
  }

  /**
   * Process task queue
   */
  private async processTaskQueue(): Promise<void> {
    while (this.isRunning) {
      // Find idle worker
      const idleWorker = Array.from(this.workers.values()).find(w => w.status === 'idle');

      if (idleWorker && this.taskQueue.length > 0) {
        const task = this.taskQueue.shift()!;
        await this.assignTask(idleWorker, task);
      }

      // Wait before next iteration
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * Assign task to worker
   */
  private async assignTask(worker: Worker, task: WorkerTask): Promise<void> {
    worker.status = 'busy';
    worker.currentTask = task;

    console.log(`Assigning task ${task.id} to worker ${worker.id}`);

    try {
      // TODO: In production, execute task in Docker container
      await this.executeTask(task);

      worker.completedTasks++;
      console.log(`Task ${task.id} completed by worker ${worker.id}`);
    } catch (error) {
      console.error(`Task ${task.id} failed:`, error);

      // Retry logic
      if (task.retries < this.config.retries) {
        task.retries++;
        this.taskQueue.push(task);
        console.log(`Task ${task.id} requeued (retry ${task.retries})`);
      }
    } finally {
      worker.status = 'idle';
      worker.currentTask = undefined;
    }
  }

  /**
   * Execute task (mock implementation)
   */
  private async executeTask(task: WorkerTask): Promise<void> {
    // Simulate task execution
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  /**
   * Auto-scale workers based on queue depth
   */
  private async autoScale(): Promise<void> {
    if (!this.config.autoScale) return;

    const currentWorkers = this.workers.size;
    const queueDepth = this.taskQueue.length;

    // Scale up
    if (queueDepth > this.config.scaleUpThreshold && currentWorkers < this.config.maxWorkers) {
      console.log(`Auto-scaling up: queue depth ${queueDepth}`);
      await this.createWorker();
    }

    // Scale down
    if (queueDepth < this.config.scaleDownThreshold && currentWorkers > this.config.minWorkers) {
      const idleWorkers = Array.from(this.workers.values()).filter(w => w.status === 'idle');
      if (idleWorkers.length > 0) {
        console.log(`Auto-scaling down: queue depth ${queueDepth}`);
        await this.stopWorker(idleWorkers[0].id);
      }
    }
  }

  /**
   * Get pool status
   */
  getStatus() {
    return {
      workers: this.workers.size,
      queueDepth: this.taskQueue.length,
      workerDetails: Array.from(this.workers.values()).map(w => ({
        id: w.id,
        status: w.status,
        completedTasks: w.completedTasks,
        currentTask: w.currentTask?.id,
      })),
    };
  }
}

export default WorkerPool;
