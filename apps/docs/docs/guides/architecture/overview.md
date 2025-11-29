---
sidebar_position: 1
---

# Architecture Overview

Learn about anchorpipe's architecture and design decisions.

## System Architecture

[Architecture overview coming soon]

## Key Components

- **Ingestion Service** - Receives and processes test results
- **Scoring Service** - Analyzes test patterns and detects flakiness
- **Web Application** - User interface and API
- **Database** - PostgreSQL for persistent storage
- **Message Queue** - RabbitMQ for async processing
- **Redis** - Rate limiting and caching

## Related Guides

- [Rate Limiting](/docs/guides/architecture/rate-limiting)
- [Idempotency](/docs/guides/architecture/idempotency)
- [Testing](/docs/guides/architecture/testing)
