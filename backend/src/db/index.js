const { Pool } = require('pg');
const { registerType } = require('pgvector/pg');

const pool = new Pool({
  user: process.env.DB_USER || 'viksityatra',
  password: process.env.DB_PASSWORD || 'password',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'viksityatra_db',
});

pool.on('connect', async (client) => {
  await registerType(client);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
