# Queue

This folder contains message queue integration for task orchestration.

## Contents

- **queueClient.ts**: Queue client abstraction layer
- **producers.ts**: Message producers for enqueueing tasks
- **consumers.ts**: Message consumers for processing tasks
- **topics.ts**: Queue topic/exchange definitions
- **messageHandlers.ts**: Message handling logic

## Supported Queue Systems

- **RabbitMQ**: For reliable task distribution
- **Kafka**: For high-throughput event streaming

## Architecture

```
Producer → Queue → Consumer → Worker Pool → Results
```

## Usage

### Publishing Messages

```typescript
import { QueueProducer } from './queue/producers';

const producer = new QueueProducer();
await producer.publish('code-analysis', {
  repositoryId: 123,
  branch: 'main',
  files: ['src/index.ts']
});
```

### Consuming Messages

```typescript
import { QueueConsumer } from './queue/consumers';

const consumer = new QueueConsumer('code-analysis');
consumer.on('message', async (msg) => {
  // Process message
  await processAnalysisTask(msg.data);
});
await consumer.start();
```

## Configuration

Configure queue connection in `server/config/queue.ts`:

```typescript
export const queueConfig = {
  type: 'rabbitmq', // or 'kafka'
  url: process.env.QUEUE_URL,
  prefetch: 1,
  retries: 3
};
```
