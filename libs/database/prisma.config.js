/* eslint-env node */

const { defineConfig } = require('prisma/config');

module.exports = defineConfig({
  datasource: {
    provider: 'postgresql',
    url: process.env.DATABASE_URL,
  },
});
