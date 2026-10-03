# @anchorpipe/mq

Utility helpers for interacting with RabbitMQ-compatible brokers via `amqplib`. Provides lightweight wrappers for establishing connections, asserting queues, and publishing/consuming JSON payloads.

## Installation

This package is published within the monorepo and consumed via the workspace alias `@anchorpipe/mq`.

```ts
import { connectRabbit, assertQueue, publishJson, consumeJson } from '@anchorpipe/mq';
```

## Usage

```ts
const { connection, channel } = await connectRabbit(process.env.RABBIT_URL!);
await assertQueue(channel, 'events');

await publishJson(channel, 'events', { type: 'repo.created', payload: { repoId } });

await consumeJson(channel, 'events', async (message) => {
  console.log('received', message);
});
```

## Exposed Helpers

| Function                                | Description                                                        |
| --------------------------------------- | ------------------------------------------------------------------ |
| `connectRabbit(url, socketOptions?)`    | Establish connection + channel using `amqplib`.                    |
| `assertQueue(channel, queue, options?)` | Creates a durable queue with optional overrides.                   |
| `publishJson(channel, queue, message)`  | Serializes payload to JSON and publishes with persistent delivery. |
| `consumeJson(channel, queue, handler)`  | Consumes messages, parses JSON, and acks/nacks automatically.      |

## Conventions

- Queues are declared durable by default.
- Messages are JSON encoded with `contentType: application/json`.
- Failed handlers `nack` without requeue to avoid infinite poison loops—adjust as needed per queue.

## Local Development

1. Ensure RabbitMQ is running (see `infra/docker-compose.yml`).
2. Set `RABBIT_URL=amqp://guest:guest@localhost:5672`.
3. Run unit/integration tests once added (TODO: add coverage per ST-402).
