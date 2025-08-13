const express = require('express');
const { validateProgress, validateId, validatePagination } = require('../middleware/validation');
const { auth } = require('../middleware/auth');
const { query, execute, get } = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

// Get all progress entries with pagination and filters
router.get('/', auth, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 10, subject_id, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE p.user_id = ?';
    let params = [req.user.id];

    if (subject_id) {
      whereClause += ' AND p.subject_id = ?';
      params.push(subject_id);
    }

    if (start_date) {
      whereClause += ' AND p.date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      whereClause += ' AND p.date <= ?';
      params.push(end_date);
    }

    // Get progress entries with subject info
    const progress = await query(
      `SELECT p.*, s.name as subject_name, s.color as subject_color
       FROM progress p
       LEFT JOIN subjects s ON p.subject_id = s.id
       ${whereClause}
       ORDER BY p.date DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    // Get total count
    const countResult = await get(
      `SELECT COUNT(*) as total FROM progress p ${whereClause}`,
      params
    );

    res.json({
      progress,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    logger.error('Get progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new progress entry
router.post('/', auth, validateProgress, async (req, res) => {
  try {
    const { subject_id, date, hours_studied, notes } = req.body;

    // Verify subject exists and belongs to user (if provided)
    if (subject_id) {
      const subject = await get(
        'SELECT id FROM subjects WHERE id = ? AND user_id = ?',
        [subject_id, req.user.id]
      );

      if (!subject) {
        return res.status(400).json({ error: 'Invalid subject' });
      }
    }

    // Check if progress entry already exists for this date and subject
    const existingProgress = await get(
      'SELECT id FROM progress WHERE user_id = ? AND subject_id = ? AND date = ?',
      [req.user.id, subject_id, date]
    );

    if (existingProgress) {
      return res.status(400).json({ error: 'Progress entry already exists for this date and subject' });
    }

    // Create progress entry
    const result = await execute(
      'INSERT INTO progress (user_id, subject_id, date, hours_studied, notes) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, subject_id, date, hours_studied, notes]
    );

    // Get the created progress entry
    const progress = await get(
      `SELECT p.*, s.name as subject_name, s.color as subject_color
       FROM progress p
       LEFT JOIN subjects s ON p.subject_id = s.id
       WHERE p.id = ?`,
      [result.id]
    );

    logger.info(`Progress entry created: ${hours_studied}h for subject ${progress.subject_name} by user ${req.user.id}`);

    res.status(201).json({
      message: 'Progress entry created successfully',
      progress
    });
  } catch (error) {
    logger.error('Create progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific progress entry
router.get('/:id', auth, validateId, async (req, res) => {
  try {
    const { id } = req.params;

    const progress = await get(
      `SELECT p.*, s.name as subject_name, s.color as subject_color
       FROM progress p
       LEFT JOIN subjects s ON p.subject_id = s.id
       WHERE p.id = ? AND p.user_id = ?`,
      [id, req.user.id]
    );

    if (!progress) {
      return res.status(404).json({ error: 'Progress entry not found' });
    }

    res.json({ progress });
  } catch (error) {
    logger.error('Get progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update progress entry
router.put('/:id', auth, validateId, validateProgress, async (req, res) => {
  try {
    const { id } = req.params;
    const { subject_id, date, hours_studied, notes } = req.body;

    // Check if progress entry exists and belongs to user
    const existingProgress = await get(
      'SELECT id FROM progress WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!existingProgress) {
      return res.status(404).json({ error: 'Progress entry not found' });
    }

    // Verify subject exists and belongs to user (if provided)
    if (subject_id) {
      const subject = await get(
        'SELECT id FROM subjects WHERE id = ? AND user_id = ?',
        [subject_id, req.user.id]
      );

      if (!subject) {
        return res.status(400).json({ error: 'Invalid subject' });
      }
    }

    // Check if new date/subject combination conflicts with existing entry
    if (date && subject_id) {
      const conflict = await get(
        'SELECT id FROM progress WHERE user_id = ? AND subject_id = ? AND date = ? AND id != ?',
        [req.user.id, subject_id, date, id]
      );

      if (conflict) {
        return res.status(400).json({ error: 'Progress entry already exists for this date and subject' });
      }
    }

    // Update progress entry
    await execute(
      'UPDATE progress SET subject_id = ?, date = ?, hours_studied = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [subject_id, date, hours_studied, notes, id]
    );

    // Get updated progress entry
    const progress = await get(
      `SELECT p.*, s.name as subject_name, s.color as subject_color
       FROM progress p
       LEFT JOIN subjects s ON p.subject_id = s.id
       WHERE p.id = ?`,
      [id]
    );

    logger.info(`Progress entry updated: ${progress.hours_studied}h for subject ${progress.subject_name} by user ${req.user.id}`);

    res.json({
      message: 'Progress entry updated successfully',
      progress
    });
  } catch (error) {
    logger.error('Update progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete progress entry
router.delete('/:id', auth, validateId, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if progress entry exists and belongs to user
    const progress = await get(
      'SELECT hours_studied, subject_id FROM progress WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!progress) {
      return res.status(404).json({ error: 'Progress entry not found' });
    }

    // Delete progress entry
    await execute('DELETE FROM progress WHERE id = ?', [id]);

    logger.info(`Progress entry deleted: ${progress.hours_studied}h by user ${req.user.id}`);

    res.json({ message: 'Progress entry deleted successfully' });
  } catch (error) {
    logger.error('Delete progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get progress analytics overview
router.get('/analytics/overview', auth, async (req, res) => {
  try {
    // Get overall stats
    const overallStats = await get(
      `SELECT 
        COALESCE(SUM(hours_studied), 0) as total_hours,
        COUNT(*) as total_sessions,
        COALESCE(AVG(hours_studied), 0) as avg_hours_per_session,
        COUNT(DISTINCT date) as total_days_studied
       FROM progress 
       WHERE user_id = ?`,
      [req.user.id]
    );

    // Get weekly progress for the last 4 weeks
    const weeklyProgress = await query(
      `SELECT 
        strftime('%Y-%W', date) as week,
        SUM(hours_studied) as hours_studied,
        COUNT(DISTINCT date) as days_studied
       FROM progress
       WHERE user_id = ? AND date >= date('now', '-28 days')
       GROUP BY strftime('%Y-%W', date)
       ORDER BY week DESC`,
      [req.user.id]
    );

    // Get progress by subject
    const progressBySubject = await query(
      `SELECT 
        s.name as subject_name,
        s.color as subject_color,
        COALESCE(SUM(p.hours_studied), 0) as total_hours,
        COUNT(p.id) as total_sessions,
        COALESCE(AVG(p.hours_studied), 0) as avg_hours_per_session
       FROM subjects s
       LEFT JOIN progress p ON s.id = p.subject_id AND p.user_id = ?
       WHERE s.user_id = ?
       GROUP BY s.id, s.name, s.color
       ORDER BY total_hours DESC`,
      [req.user.id, req.user.id]
    );

    // Get recent progress entries
    const recentProgress = await query(
      `SELECT p.*, s.name as subject_name, s.color as subject_color
       FROM progress p
       LEFT JOIN subjects s ON p.subject_id = s.id
       WHERE p.user_id = ?
       ORDER BY p.date DESC, p.created_at DESC
       LIMIT 10`,
      [req.user.id]
    );

    res.json({
      overall_stats: overallStats,
      weekly_progress: weeklyProgress,
      progress_by_subject: progressBySubject,
      recent_progress: recentProgress
    });
  } catch (error) {
    logger.error('Get progress analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get progress for specific subject
router.get('/subject/:subject_id', auth, validateId, async (req, res) => {
  try {
    const { subject_id } = req.params;

    // Verify subject exists and belongs to user
    const subject = await get(
      'SELECT id FROM subjects WHERE id = ? AND user_id = ?',
      [subject_id, req.user.id]
    );

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Get progress for this subject
    const progress = await query(
      `SELECT p.*, s.name as subject_name, s.color as subject_color
       FROM progress p
       LEFT JOIN subjects s ON p.subject_id = s.id
       WHERE p.user_id = ? AND p.subject_id = ?
       ORDER BY p.date DESC`,
      [req.user.id, subject_id]
    );

    // Get subject stats
    const subjectStats = await get(
      `SELECT 
        COALESCE(SUM(hours_studied), 0) as total_hours,
        COUNT(*) as total_sessions,
        COALESCE(AVG(hours_studied), 0) as avg_hours_per_session,
        COUNT(DISTINCT date) as total_days_studied
       FROM progress 
       WHERE user_id = ? AND subject_id = ?`,
      [req.user.id, subject_id]
    );

    res.json({
      progress,
      stats: subjectStats
    });
  } catch (error) {
    logger.error('Get subject progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 