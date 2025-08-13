const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('../utils/logger');

// Create database file in the project root
const dbPath = path.join(__dirname, '..', '..', 'database.sqlite');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    logger.error('Database connection error:', err);
  } else {
    logger.info('Connected to SQLite database');
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Query function
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        logger.error('Database query error:', err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Execute function for INSERT, UPDATE, DELETE
const execute = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        logger.error('Database execute error:', err);
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

// Get single row
const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        logger.error('Database get error:', err);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

module.exports = {
  db,
  query,
  execute,
  get
}; 