require('dotenv').config({ path: __dirname + '/../.env' });
const { db, execute } = require('../config/database');
const logger = require('../utils/logger');

const createTables = async () => {
  try {
    logger.info('Starting database migration...');

    // Create users table
    await execute(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        profile_image VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

  // No need for SQLite workaround in PostgreSQL

    // Create subjects table
    await execute(`
      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        color VARCHAR(16) DEFAULT '#3B82F6',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, name)
      )
    `);

    // Create goals table
    await execute(`
      CREATE TABLE IF NOT EXISTS goals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        target_hours REAL DEFAULT 0,
        completed_hours REAL DEFAULT 0,
        is_completed BOOLEAN DEFAULT FALSE,
        due_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create planner_slots table
    await execute(`
      CREATE TABLE IF NOT EXISTS planner_slots (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
        day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
        start_time VARCHAR(16) NOT NULL,
        end_time VARCHAR(16) NOT NULL,
        title VARCHAR(255),
        description TEXT,
        duration_minutes INTEGER,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create todos table
    await execute(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        is_completed BOOLEAN DEFAULT FALSE,
        due_date DATE,
        priority VARCHAR(16) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create progress table
    await execute(`
      CREATE TABLE IF NOT EXISTS progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
        date DATE NOT NULL,
        hours_studied REAL DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, subject_id, date)
      )
    `);

    // Create email_reminders table
    await execute(`
      CREATE TABLE IF NOT EXISTS email_reminders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        reminder_time TIME DEFAULT '08:00:00',
        timezone VARCHAR(64) DEFAULT 'UTC',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

  // Create indexes for better performance
  await execute('CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)');
  await execute('CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects (user_id)');
  await execute('CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals (user_id)');
  await execute('CREATE INDEX IF NOT EXISTS idx_goals_subject_id ON goals (subject_id)');
  await execute('CREATE INDEX IF NOT EXISTS idx_planner_slots_user_id ON planner_slots (user_id)');
  await execute('CREATE INDEX IF NOT EXISTS idx_planner_slots_day ON planner_slots (day_of_week)');
  await execute('CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos (user_id)');
  await execute('CREATE INDEX IF NOT EXISTS idx_todos_subject_id ON todos (subject_id)');
  await execute('CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos (due_date)');
  await execute('CREATE INDEX IF NOT EXISTS idx_progress_user_id ON progress (user_id)');
  await execute('CREATE INDEX IF NOT EXISTS idx_progress_subject_id ON progress (subject_id)');
  await execute('CREATE INDEX IF NOT EXISTS idx_progress_date ON progress (date)');
  await execute('CREATE INDEX IF NOT EXISTS idx_email_reminders_user_id ON email_reminders (user_id)');

    logger.info('Database migration completed successfully!');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  createTables()
    .then(() => {
      logger.info('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { createTables }; 