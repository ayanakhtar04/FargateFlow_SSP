

const { Pool } = require('pg');
const logger = require('../utils/logger');

// Debug: log env variables used for PostgreSQL connection
logger.info('PGUSER:', process.env.PGUSER);
logger.info('PGPASSWORD:', process.env.PGPASSWORD);
logger.info('PGHOST:', process.env.PGHOST);
logger.info('PGPORT:', process.env.PGPORT);
logger.info('PGDATABASE:', process.env.PGDATABASE);

// PostgreSQL connection config
const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'smart_study_planner',
  password: process.env.PGPASSWORD || 'postgres',
  port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
});

pool.on('connect', () => {
  logger.info('Connected to PostgreSQL database');
});
pool.on('error', (err) => {
  logger.error('PostgreSQL error:', err);
});

// Query function (returns all rows)
const query = (sql, params = []) => {
  return pool.query(sql, params)
    .then(res => res.rows)
    .catch(err => {
      logger.error('Database query error:', err);
      throw err;
    });
};

// Execute function for INSERT, UPDATE, DELETE (returns rowCount and optionally id)
const execute = (sql, params = []) => {
  return pool.query(sql, params)
    .then(res => ({ rowCount: res.rowCount, id: res.rows[0]?.id }))
    .catch(err => {
      logger.error('Database execute error:', err);
      throw err;
    });
};

// Get single row
const get = (sql, params = []) => {
  return pool.query(sql, params)
    .then(res => res.rows[0])
    .catch(err => {
      logger.error('Database get error:', err);
      throw err;
    });
};

module.exports = {
  pool,
  query,
  execute,
  get
};