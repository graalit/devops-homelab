'use strict';

const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'postgres',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'portfolio_mcarvalho',
  user:     process.env.DB_USER     || 'homelab',
  password: process.env.DB_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

// Test de connexion au démarrage
pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('❌ PostgreSQL connexion échouée:', err.message);
  } else {
    console.log('✅ PostgreSQL connecté');
  }
});

module.exports = pool;
