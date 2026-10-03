import { disconnect } from '@anchorpipe/database';
import { runWorker } from './worker';

const once = process.env.WORKER_ONCE === 'true';

runWorker({
  once,
  intervalMs: Number(process.env.WORKER_POLL_INTERVAL_MS || 1000),
})
  .catch((error) => {
    console.error('Ingestion worker stopped with an error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (once) {
      await disconnect();
    }
  });
