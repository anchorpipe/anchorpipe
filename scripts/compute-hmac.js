#!/usr/bin/env node

/**
 * Compute HMAC Signature Script
 *
 * Computes HMAC-SHA256 signature for a payload file.
 *
 * Usage:
 *   node scripts/compute-hmac.js <file-path> <secret>
 *
 * Example:
 *   node scripts/compute-hmac.js test-data/ingestion-payload.json my-secret-key
 */

const crypto = require('crypto');
const fs = require('fs');

function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node scripts/compute-hmac.js <file-path> <secret>');
    process.exit(1);
  }

  const [filePath, secret] = args;

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const payload = fs.readFileSync(filePath, 'utf-8');

  // Compute HMAC-SHA256 signature
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  console.log('HMAC Signature:');
  console.log(signature);
  console.log('');
  console.log('Use this in the X-FR-Sig header:');
  console.log(`X-FR-Sig: ${signature}`);
}

main();
