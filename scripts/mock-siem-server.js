#!/usr/bin/env node

/**
 * Mock SIEM Server
 *
 * Simple HTTP server that receives and logs SIEM events.
 * Useful for testing SIEM integration locally.
 *
 * Usage:
 *   node scripts/mock-siem-server.js [port]
 *
 * Example:
 *   node scripts/mock-siem-server.js 3001
 */

const http = require('http');

const PORT = process.argv[2] || 3001;

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/siem') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const timestamp = new Date().toISOString();

        console.log('');
        console.log('─'.repeat(60));
        console.log(`[${timestamp}] SIEM Event Received`);
        console.log('─'.repeat(60));
        console.log(JSON.stringify(data, null, 2));
        console.log('─'.repeat(60));
        console.log('');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, received: true }));
      } catch (error) {
        console.error('Error parsing SIEM event:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`Mock SIEM server listening on http://localhost:${PORT}`);
  console.log('Endpoint: POST http://localhost:' + PORT + '/siem');
  console.log('');
  console.log('Press Ctrl+C to stop');
});

