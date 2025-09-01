const express = require('express');
const { validatePlannerSlot, validateId, validatePagination } = require('../middleware/validation');
const { auth } = require('../middleware/auth');
const db = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

// Runtime schema detection (handles existing DBs missing newer columns)
let schemaChecked = false;
let hasDurationColumn = false;
let hasIsActiveColumn = false;

async function checkSchemaOnce() {
  if (schemaChecked) return;
  try {
    await db.get('SELECT duration_minutes FROM planner_slots LIMIT 1');
    hasDurationColumn = true;
  } catch (_) {
    // Try to add column if missing
    try {
      await db.execute('ALTER TABLE planner_slots ADD COLUMN duration_minutes INTEGER');
      hasDurationColumn = true;
    } catch (_) {
      hasDurationColumn = false;
    }
  }
  try {
    await db.get('SELECT is_active FROM planner_slots LIMIT 1');
    hasIsActiveColumn = true;
  } catch (_) {
    try {
      await db.execute('ALTER TABLE planner_slots ADD COLUMN is_active BOOLEAN DEFAULT 1');
      hasIsActiveColumn = true;
    } catch (_) {
      hasIsActiveColumn = false;
    }
  }
  schemaChecked = true;
}

// Apply auth middleware to all routes
router.use(auth);

// Get all planner slots for the authenticated user
router.get('/', validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 100, day_of_week } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT ps.*, s.name as subject_name, s.color as subject_color
      FROM planner_slots ps
      JOIN subjects s ON ps.subject_id = s.id
      WHERE ps.user_id = ?
    `;
    let params = [req.user.id];
    let paramIndex = 2;

    if (day_of_week !== undefined) {
      query += ` AND ps.day_of_week = ?`;
      params.push(parseInt(day_of_week));
      paramIndex++;
    }

    query += ` ORDER BY ps.day_of_week, ps.start_time LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as count FROM planner_slots WHERE user_id = ?';
    let countParams = [req.user.id];

    if (day_of_week !== undefined) {
      countQuery += ' AND day_of_week = ?';
      countParams.push(parseInt(day_of_week));
    }

    const countResult = await db.get(countQuery, countParams);
    const totalCount = parseInt(countResult?.count || 0);
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      planner_slots: result || [],
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_count: totalCount,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    logger.error('Get planner slots error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get planner slots for a specific day
router.get('/day/:day_of_week', async (req, res) => {
  try {
    const { day_of_week } = req.params;
    const day = parseInt(day_of_week);

    if (day < 0 || day > 6) {
      return res.status(400).json({ error: 'Day of week must be between 0 and 6' });
    }

    const result = await db.query(
      `SELECT ps.*, s.name as subject_name, s.color as subject_color
       FROM planner_slots ps
       JOIN subjects s ON ps.subject_id = s.id
       WHERE ps.user_id = ? AND ps.day_of_week = ?
       ORDER BY ps.start_time`,
      [req.user.id, day]
    );

    res.json({
      planner_slots: result || []
    });

  } catch (error) {
    logger.error('Get planner slots for day error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific planner slot by ID
router.get('/:id', validateId, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.get(
      `SELECT ps.*, s.name as subject_name, s.color as subject_color
       FROM planner_slots ps
       JOIN subjects s ON ps.subject_id = s.id
       WHERE ps.id = ? AND ps.user_id = ?`,
      [id, req.user.id]
    );

    if (!result) {
      return res.status(404).json({ error: 'Planner slot not found' });
    }

    res.json({
      planner_slot: result
    });

  } catch (error) {
    logger.error('Get planner slot error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new planner slot
router.post('/', validatePlannerSlot, async (req, res) => {
  try {
  await checkSchemaOnce();
    const { subject_id, day_of_week, start_time, end_time, duration_minutes } = req.body;

    // Check if subject exists and belongs to user
    const subjectExists = await db.get(
      'SELECT id FROM subjects WHERE id = ? AND user_id = ?',
      [subject_id, req.user.id]
    );

    if (!subjectExists) {
      return res.status(400).json({ error: 'Subject not found' });
    }

    // Check for time conflicts on the same day
    const timeConflict = await db.query(
      `SELECT id FROM planner_slots 
       WHERE user_id = ? AND day_of_week = ? 
       AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?) OR (start_time >= ? AND end_time <= ?))`,
      [req.user.id, day_of_week, start_time, start_time, end_time, end_time, start_time, end_time]
    );

    if (timeConflict && timeConflict.length > 0) {
      return res.status(400).json({ error: 'Time slot conflicts with existing schedule' });
    }

    // Calculate duration if not provided
    let duration = duration_minutes;
    if (!duration && start_time && end_time) {
      const start = new Date(`2000-01-01T${start_time}`);
      const end = new Date(`2000-01-01T${end_time}`);
      duration = Math.round((end - start) / (1000 * 60));
    }

    let insertSql;
    let insertParams;
    if (hasDurationColumn) {
      insertSql = `INSERT INTO planner_slots (user_id, subject_id, day_of_week, start_time, end_time, duration_minutes${hasIsActiveColumn ? ', is_active' : ''}, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?${hasIsActiveColumn ? ', 1' : ''}, datetime('now'), datetime('now'))`;
      insertParams = [req.user.id, subject_id, day_of_week, start_time, end_time, duration];
    } else {
      // Fallback without duration column
      insertSql = `INSERT INTO planner_slots (user_id, subject_id, day_of_week, start_time, end_time${hasIsActiveColumn ? ', is_active' : ''}, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?${hasIsActiveColumn ? ', 1' : ''}, datetime('now'), datetime('now'))`;
      insertParams = [req.user.id, subject_id, day_of_week, start_time, end_time];
    }
    const result = await db.execute(insertSql, insertParams);

    // Get the created planner slot
    const createdSlot = await db.get(
      `SELECT ps.*, s.name as subject_name, s.color as subject_color
       FROM planner_slots ps
       JOIN subjects s ON ps.subject_id = s.id
       WHERE ps.id = ?`,
      [result.id]
    );

    res.status(201).json({
      planner_slot: createdSlot
    });

  } catch (error) {
    logger.error('Create planner slot error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a planner slot
router.put('/:id', validateId, validatePlannerSlot, async (req, res) => {
  try {
  await checkSchemaOnce();
    const { id } = req.params;
    const { subject_id, day_of_week, start_time, end_time, duration_minutes } = req.body;

    // Check if planner slot exists and belongs to user
    const existingSlot = await db.get(
      'SELECT id FROM planner_slots WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!existingSlot) {
      return res.status(404).json({ error: 'Planner slot not found' });
    }

    // Check if subject exists and belongs to user
    const subjectExists = await db.get(
      'SELECT id FROM subjects WHERE id = ? AND user_id = ?',
      [subject_id, req.user.id]
    );

    if (!subjectExists) {
      return res.status(400).json({ error: 'Subject not found' });
    }

    // Check for time conflicts on the same day (excluding current slot)
    const timeConflict = await db.query(
      `SELECT id FROM planner_slots 
       WHERE user_id = ? AND day_of_week = ? AND id != ?
       AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?) OR (start_time >= ? AND end_time <= ?))`,
      [req.user.id, day_of_week, id, start_time, start_time, end_time, end_time, start_time, end_time]
    );

    if (timeConflict && timeConflict.length > 0) {
      return res.status(400).json({ error: 'Time slot conflicts with existing schedule' });
    }

    // Calculate duration if not provided
    let duration = duration_minutes;
    if (!duration && start_time && end_time) {
      const start = new Date(`2000-01-01T${start_time}`);
      const end = new Date(`2000-01-01T${end_time}`);
      duration = Math.round((end - start) / (1000 * 60));
    }

    let updateSql;
    let updateParams;
    if (hasDurationColumn) {
      updateSql = `UPDATE planner_slots 
                   SET subject_id = ?, day_of_week = ?, start_time = ?, end_time = ?, duration_minutes = ?, updated_at = datetime('now')
                   WHERE id = ? AND user_id = ?`;
      updateParams = [subject_id, day_of_week, start_time, end_time, duration, id, req.user.id];
    } else {
      updateSql = `UPDATE planner_slots 
                   SET subject_id = ?, day_of_week = ?, start_time = ?, end_time = ?, updated_at = datetime('now')
                   WHERE id = ? AND user_id = ?`;
      updateParams = [subject_id, day_of_week, start_time, end_time, id, req.user.id];
    }
    await db.execute(updateSql, updateParams);

    // Get the updated planner slot
    const updatedSlot = await db.get(
      `SELECT ps.*, s.name as subject_name, s.color as subject_color
       FROM planner_slots ps
       JOIN subjects s ON ps.subject_id = s.id
       WHERE ps.id = ?`,
      [id]
    );

    res.json({
      planner_slot: updatedSlot
    });

  } catch (error) {
    logger.error('Update planner slot error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a planner slot
router.delete('/:id', validateId, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if planner slot exists and belongs to user
    const existingSlot = await db.get(
      'SELECT id FROM planner_slots WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!existingSlot) {
      return res.status(404).json({ error: 'Planner slot not found' });
    }

    await db.execute(
      'DELETE FROM planner_slots WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    res.json({ message: 'Planner slot deleted successfully' });

  } catch (error) {
    logger.error('Delete planner slot error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk update planner slots (for drag-and-drop functionality)
router.put('/bulk/update', async (req, res) => {
  try {
    const { slots } = req.body;

    if (!Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ error: 'Slots array is required' });
    }

    const results = [];

    for (const slot of slots) {
      const { id, day_of_week, start_time, end_time } = slot;

      // Check if slot exists and belongs to user
      const existingSlot = await db.get(
        'SELECT id FROM planner_slots WHERE id = ? AND user_id = ?',
        [id, req.user.id]
      );

      if (!existingSlot) {
        results.push({ id, success: false, error: 'Slot not found' });
        continue;
      }

      // Check for time conflicts (excluding current slot)
      const timeConflict = await db.query(
        `SELECT id FROM planner_slots 
         WHERE user_id = ? AND day_of_week = ? AND id != ?
         AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?) OR (start_time >= ? AND end_time <= ?))`,
        [req.user.id, day_of_week, id, start_time, start_time, end_time, end_time, start_time, end_time]
      );

      if (timeConflict && timeConflict.length > 0) {
        results.push({ id, success: false, error: 'Time conflict detected' });
        continue;
      }

      // Update slot
      await db.execute(
        `UPDATE planner_slots 
         SET day_of_week = ?, start_time = ?, end_time = ?, updated_at = datetime('now')
         WHERE id = ? AND user_id = ?`,
        [day_of_week, start_time, end_time, id, req.user.id]
      );

      results.push({ id, success: true });
    }

    logger.info(`Bulk update completed for ${slots.length} slots by user ${req.user.email}`);

    res.json({
      message: 'Bulk update completed',
      results
    });

  } catch (error) {
    logger.error('Bulk update planner slots error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get weekly summary
router.get('/weekly/summary', async (req, res) => {
  try {
    await checkSchemaOnce();
    const durationSelect = hasDurationColumn ? 'SUM(ps.duration_minutes) as total_minutes,' : '0 as total_minutes,';
    const isActiveCondition = hasIsActiveColumn ? 'AND ps.is_active = 1' : '';
    const result = await db.query(
      `SELECT 
        ps.day_of_week,
        COUNT(ps.id) as slots_count,
        ${durationSelect}
        s.name as subject_name,
        s.color as subject_color
       FROM planner_slots ps
       JOIN subjects s ON ps.subject_id = s.id
       WHERE ps.user_id = ? ${isActiveCondition}
       GROUP BY ps.day_of_week, s.id, s.name, s.color
       ORDER BY ps.day_of_week, total_minutes DESC`,
      [req.user.id]
    );

    // Group by day
    const weeklySummary = {};
    for (let i = 0; i < 7; i++) {
      weeklySummary[i] = {
        day_of_week: i,
        slots_count: 0,
        total_minutes: 0,
        subjects: []
      };
    }

    result.forEach(row => {
      weeklySummary[row.day_of_week].slots_count += parseInt(row.slots_count);
      weeklySummary[row.day_of_week].total_minutes += parseInt(row.total_minutes);
      weeklySummary[row.day_of_week].subjects.push({
        name: row.subject_name,
        color: row.subject_color,
        slots_count: parseInt(row.slots_count),
        total_minutes: parseInt(row.total_minutes)
      });
    });

    res.json({
      weekly_summary: Object.values(weeklySummary)
    });

  } catch (error) {
    logger.error('Get weekly summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 