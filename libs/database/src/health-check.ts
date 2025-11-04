import { healthCheck } from './index';

async function main() {
  const ok = await healthCheck();
  if (!ok) {
    console.error('❌ DB health check failed');
    process.exit(1);
  }
  console.log('✅ DB health check passed');
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
