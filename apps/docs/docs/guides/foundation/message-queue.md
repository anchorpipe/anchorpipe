# Message Queue (RabbitMQ) (ST-106)

## Overview

Sets up RabbitMQ as the message queue system for asynchronous processing. Decouples ingestion from scoring and notification services, enabling scalable and reliable message processing.

## Architecture

Following ADR-0002, RabbitMQ is chosen for MVP:

- **MVP**: RabbitMQ on Render
- **Future**: Revisit Kafka/Redpanda at ≥100k runs/hour
- **Adapter Pattern**: Thin abstraction layer for future migration

## Configuration

### Local Development

RabbitMQ runs via Docker Compose:

```yaml
mq:
  image: rabbitmq:3-management
  ports:
    - '5672:5672' # AMQP
    - '15672:15672' # Management UI
```

### Connection

```bash
RABBIT_URL=amqp://guest:guest@localhost:5672
```

### Management UI

Access at: `http://localhost:15672`

- Username: `guest`
- Password: `guest`

## Usage

### Library

Location: `libs/mq/`

```typescript
import { connectRabbit, assertQueue, publishJson, consumeJson } from '@anchorpipe/mq';
```

### Connect

```typescript
const { connection, channel } = await connectRabbit(process.env.RABBIT_URL!);
```

### Create Queue

```typescript
await assertQueue(channel, 'test.ingestion', {
  durable: true,
  deadLetterExchange: 'dlx',
  deadLetterRoutingKey: 'test.ingestion.failed',
});
```

### Publish Message

```typescript
await publishJson(channel, 'test.ingestion', {
  type: 'test.run.completed',
  payload: {
    repoId: 'repo-123',
    runId: 'run-456',
    commitSha: 'abc123',
  },
});
```

### Consume Messages

```typescript
await consumeJson(channel, 'test.ingestion', async (message) => {
  console.log('Received:', message);
  // Process message...
  // Auto-ack on success, nack on error
});
```

## Queue Configuration

### Test Ingestion Queue

Location: `libs/mq/src/queue-config.ts`

```typescript
{
  name: 'test.ingestion',
  options: {
    durable: true,
    deadLetterExchange: 'dlx',
    deadLetterRoutingKey: 'test.ingestion.failed',
    arguments: {
      'x-message-ttl': 86400000, // 24h
    },
  },
}
```

## Conventions

- **Durable Queues**: All queues are durable (survive broker restart)
- **JSON Encoding**: Messages are JSON with `contentType: application/json`
- **Persistent Delivery**: Messages are marked persistent
- **Dead Letter Exchange**: Failed messages go to DLX
- **No Requeue**: Failed handlers nack without requeue (prevents poison loops)

## Health Check

Endpoint: `GET /api/health/mq`

Checks RabbitMQ connectivity and returns status.

## Production Considerations

### Scaling

- RabbitMQ handles moderate throughput well
- Consider Kafka/Redpanda at ≥100k runs/hour
- Monitor queue depth and consumer lag

### Reliability

- Durable queues ensure message persistence
- Dead letter queues capture failed messages
- Message TTL prevents infinite retention

### Monitoring

- Use RabbitMQ Management UI
- Monitor queue depth
- Track consumer processing time
- Alert on dead letter queue growth

## Future Enhancements

- Kafka/Redpanda migration (when needed)
- Message priority queues
- Delayed message delivery
- Message routing with exchanges
- Consumer prefetch limits
- Connection pooling

## Related Documentation

- [ADR-0002](../../reference/adr/messaging-selection) - Messaging selection
- [Ingestion Worker](../services/ingestion-worker) - Message producer
