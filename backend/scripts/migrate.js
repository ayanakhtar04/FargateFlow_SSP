const { db, execute } = require('../config/database');
const logger = require('../utils/logger');

const createTables = async () => {
  try {
    logger.info('Starting database migration...');

    // Create users table
    await execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        profile_image TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Attempt to add profile_image column if it doesn't exist (SQLite workaround)
    await execute(`
      ALTER TABLE users ADD COLUMN profile_image TEXT
    `).catch(() => {});

    // Create subjects table
    await execute(`
      CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT DEFAULT '#3B82F6',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(user_id, name)
      )
    `);

    // Create goals table
    await execute(`
      CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        subject_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        target_hours REAL DEFAULT 0,
        completed_hours REAL DEFAULT 0,
        is_completed BOOLEAN DEFAULT 0,
        due_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE SET NULL
      )
    `);

    // Create planner_slots table
    await execute(`
      CREATE TABLE IF NOT EXISTS planner_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        subject_id INTEGER,
        day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        title TEXT,
        description TEXT,
    duration_minutes INTEGER, -- added later, ensure column exists
    is_active BOOLEAN DEFAULT 1, -- soft enable/disable slots
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE SET NULL
      )
    `);

  // Attempt to add missing columns if table pre-existed without them
  await execute(`ALTER TABLE planner_slots ADD COLUMN duration_minutes INTEGER`).catch(() => {});
  await execute(`ALTER TABLE planner_slots ADD COLUMN is_active BOOLEAN DEFAULT 1`).catch(() => {});

    // Create todos table
    await execute(`
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        subject_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        is_completed BOOLEAN DEFAULT 0,
        due_date DATE,
        priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE SET NULL
      )
    `);

    // Create progress table
    await execute(`
      CREATE TABLE IF NOT EXISTS progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        subject_id INTEGER,
        date DATE NOT NULL,
        hours_studied REAL DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE SET NULL,
        UNIQUE(user_id, subject_id, date)
      )
    `);

    // Create email_reminders table
    await execute(`
      CREATE TABLE IF NOT EXISTS email_reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        email TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        reminder_time TIME DEFAULT '08:00:00',
        timezone TEXT DEFAULT 'UTC',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
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