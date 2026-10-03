export const QUEUE_CONFIG = {
  testIngestion: {
    name: 'test.ingestion',
    options: {
      durable: true,
      deadLetterExchange: 'dlx',
      deadLetterRoutingKey: 'test.ingestion.failed',
      arguments: {
        'x-message-ttl': 86400000, // 24h
      },
    },
  },
} as const;
