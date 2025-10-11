# Workers

This folder contains worker pool implementations for handling Docker-based static analysis tasks.

## Contents

- **workerPool.ts**: Worker pool manager for distributing tasks
- **dockerRunner.ts**: Docker container orchestration for analysis
- **taskProcessor.ts**: Task processing and result aggregation
- **analysisWorker.ts**: Individual worker implementation for code analysis

## Architecture

Workers are designed to run in isolated Docker containers for security and resource management:

```
API Gateway → Queue → Worker Pool → Docker Containers → Analysis Results
```

## Configuration

Configure worker pool settings in `server/config/workers.ts`:

```typescript
export const workerConfig = {
  maxWorkers: 10,
  taskTimeout: 300000, // 5 minutes
  dockerImage: 'code-analysis:latest',
  memoryLimit: '2g',
  cpuLimit: '1'
};
```

## Usage

Workers automatically pull tasks from the message queue (RabbitMQ/Kafka) and process them:

```typescript
import { WorkerPool } from './workers/workerPool';

const pool = new WorkerPool(workerConfig);
await pool.start();
```
