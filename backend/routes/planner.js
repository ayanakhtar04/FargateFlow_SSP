const express = require('express');
const { validatePlannerSlot, validateId, validatePagination } = require('../middleware/validation');
const { auth } = require('../middleware/auth');
const db = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

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
      WHERE ps.user_id = $1
    `;
    let params = [req.user.id];
    let paramIndex = 2;

    if (day_of_week !== undefined) {
      query += ` AND ps.day_of_week = $${paramIndex}`;
      params.push(parseInt(day_of_week));
      paramIndex++;
    }

    query += ` ORDER BY ps.day_of_week, ps.start_time LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM planner_slots WHERE user_id = $1';
    let countParams = [req.user.id];

    if (day_of_week !== undefined) {
      countQuery += ' AND day_of_week = $2';
      countParams.push(parseInt(day_of_week));
    }

    const countResult = await db.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      planner_slots: result.rows,
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
       WHERE ps.user_id = $1 AND ps.day_of_week = $2
       ORDER BY ps.start_time`,
      [req.user.id, day]
    );

    res.json({
      planner_slots: result.rows
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

    const result = await db.query(
      `SELECT ps.*, s.name as subject_name, s.color as subject_color
       FROM planner_slots ps
       JOIN subjects s ON ps.subject_id = s.id
       WHERE ps.id = $1 AND ps.user_id = $2`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Planner slot not found' });
    }

    res.json({
      planner_slot: result.rows[0]
    });

  } catch (error) {
    logger.error('Get planner slot error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new planner slot
router.post('/', validatePlannerSlot, async (req, res) => {
  try {
    const { subject_id, day_of_week, start_time, end_time, duration_minutes } = req.body;

    // Check if subject exists and belongs to user
    const subjectExists = await db.query(
      'SELECT id FROM subjects WHERE id = $1 AND user_id = $2',
      [subject_id, req.user.id]
    );

    if (subjectExists.rows.length === 0) {
      return res.status(400).json({ error: 'Subject not found' });
    }

    // Check for time conflicts on the same day
    const timeConflict = await db.query(
      `SELECT id FROM planner_slots 
       WHERE user_id = $1 AND day_of_week = $2 
       AND (
         (start_time <= $3 AND end_time > $3) OR
         (start_time < $4 AND end_time >= $4) OR
         (start_time >= $3 AND end_time <= $4)
       )`,
      [req.user.id, day_of_week, start_time, end_time]
    );

    if (timeConflict.rows.length > 0) {
      return res.status(400).json({ error: 'Time slot conflicts with existing planner slot' });
    }

    // Calculate duration if not provided
    let duration = duration_minutes;
    if (!duration) {
      const start = new Date(`2000-01-01T${start_time}:00`);
      const end = new Date(`2000-01-01T${end_time}:00`);
      duration = Math.round((end - start) / (1000 * 60));
    }

    const result = await db.query(
      'INSERT INTO planner_slots (user_id, subject_id, day_of_week, start_time, end_time, duration_minutes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.id, subject_id, day_of_week, start_time, end_time, duration]
    );

    // Get subject info for response
    const subjectResult = await db.query(
      'SELECT name, color FROM subjects WHERE id = $1',
      [subject_id]
    );

    const plannerSlot = {
      ...result.rows[0],
      subject_name: subjectResult.rows[0].name,
      subject_color: subjectResult.rows[0].color
    };

    logger.info(`New planner slot created for day ${day_of_week} by user ${req.user.email}`);

    res.status(201).json({
      message: 'Planner slot created successfully',
      planner_slot: plannerSlot
    });

  } catch (error) {
    logger.error('Create planner slot error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a planner slot
router.put('/:id', validateId, validatePlannerSlot, async (req, res) => {
  try {
    const { id } = req.params;
    const { subject_id, day_of_week, start_time, end_time, duration_minutes, is_active } = req.body;

    // Check if planner slot exists and belongs to user
    const existingSlot = await db.query(
      'SELECT id FROM planner_slots WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (existingSlot.rows.length === 0) {
      return res.status(404).json({ error: 'Planner slot not found' });
    }

    // Check if subject exists and belongs to user (if subject_id is being updated)
    if (subject_id) {
      const subjectExists = await db.query(
        'SELECT id FROM subjects WHERE id = $1 AND user_id = $2',
        [subject_id, req.user.id]
      );

      if (subjectExists.rows.length === 0) {
        return res.status(400).json({ error: 'Subject not found' });
      }
    }

    // Check for time conflicts (excluding current slot)
    if (day_of_week !== undefined && start_time && end_time) {
      const timeConflict = await db.query(
        `SELECT id FROM planner_slots 
         WHERE user_id = $1 AND day_of_week = $2 AND id != $3
         AND (
           (start_time <= $4 AND end_time > $4) OR
           (start_time < $5 AND end_time >= $5) OR
           (start_time >= $4 AND end_time <= $5)
         )`,
        [req.user.id, day_of_week, id, start_time, end_time]
      );

      if (timeConflict.rows.length > 0) {
        return res.status(400).json({ error: 'Time slot conflicts with existing planner slot' });
      }
    }

    // Calculate duration if not provided but times are updated
    let duration = duration_minutes;
    if (!duration && start_time && end_time) {
      const start = new Date(`2000-01-01T${start_time}:00`);
      const end = new Date(`2000-01-01T${end_time}:00`);
      duration = Math.round((end - start) / (1000 * 60));
    }

    const result = await db.query(
      `UPDATE planner_slots 
       SET subject_id = COALESCE($1, subject_id),
           day_of_week = COALESCE($2, day_of_week),
           start_time = COALESCE($3, start_time),
           end_time = COALESCE($4, end_time),
           duration_minutes = COALESCE($5, duration_minutes),
           is_active = COALESCE($6, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [subject_id, day_of_week, start_time, end_time, duration, is_active, id, req.user.id]
    );

    // Get subject info for response
    const subjectResult = await db.query(
      'SELECT name, color FROM subjects WHERE id = $1',
      [result.rows[0].subject_id]
    );

    const plannerSlot = {
      ...result.rows[0],
      subject_name: subjectResult.rows[0].name,
      subject_color: subjectResult.rows[0].color
    };

    logger.info(`Planner slot updated: ${id} by user ${req.user.email}`);

    res.json({
      message: 'Planner slot updated successfully',
      planner_slot: plannerSlot
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
    const existingSlot = await db.query(
      'SELECT id FROM planner_slots WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (existingSlot.rows.length === 0) {
      return res.status(404).json({ error: 'Planner slot not found' });
    }

    await db.query('DELETE FROM planner_slots WHERE id = $1 AND user_id = $2', [id, req.user.id]);

    logger.info(`Planner slot deleted: ${id} by user ${req.user.email}`);

    res.json({
      message: 'Planner slot deleted successfully'
    });

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
      const existingSlot = await db.query(
        'SELECT id FROM planner_slots WHERE id = $1 AND user_id = $2',
        [id, req.user.id]
      );

      if (existingSlot.rows.length === 0) {
        results.push({ id, success: false, error: 'Slot not found' });
        continue;
      }

      // Check for time conflicts (excluding current slot)
      const timeConflict = await db.query(
        `SELECT id FROM planner_slots 
         WHERE user_id = $1 AND day_of_week = $2 AND id != $3
         AND (
           (start_time <= $4 AND end_time > $4) OR
           (start_time < $5 AND end_time >= $5) OR
           (start_time >= $4 AND end_time <= $5)
         )`,
        [req.user.id, day_of_week, id, start_time, end_time]
      );

      if (timeConflict.rows.length > 0) {
        results.push({ id, success: false, error: 'Time conflict detected' });
        continue;
      }

      // Update slot
      await db.query(
        `UPDATE planner_slots 
         SET day_of_week = $1, start_time = $2, end_time = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 AND user_id = $5`,
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
    const result = await db.query(
      `SELECT 
        ps.day_of_week,
        COUNT(ps.id) as slots_count,
        SUM(ps.duration_minutes) as total_minutes,
        s.name as subject_name,
        s.color as subject_color
       FROM planner_slots ps
       JOIN subjects s ON ps.subject_id = s.id
       WHERE ps.user_id = $1 AND ps.is_active = true
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

    result.rows.forEach(row => {
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