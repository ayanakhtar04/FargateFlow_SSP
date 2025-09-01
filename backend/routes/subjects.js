const express = require('express');
const { validateSubject, validateId, validatePagination } = require('../middleware/validation');
const { auth } = require('../middleware/auth');
const { query, execute, get } = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

// Get all subjects with pagination and stats
router.get('/', auth, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Get subjects with pagination
    const subjects = await query(
      `SELECT s.*, 
        COUNT(DISTINCT t.id) as total_todos,
        COUNT(DISTINCT CASE WHEN t.is_completed = 1 THEN t.id END) as completed_todos,
        COUNT(DISTINCT g.id) as total_goals,
        COUNT(DISTINCT CASE WHEN g.is_completed = 1 THEN g.id END) as completed_goals,
        COALESCE(SUM(p.hours_studied), 0) as total_hours
       FROM subjects s
       LEFT JOIN todos t ON s.id = t.subject_id
       LEFT JOIN goals g ON s.id = g.subject_id
       LEFT JOIN progress p ON s.id = p.subject_id
       WHERE s.user_id = ?
       GROUP BY s.id
       ORDER BY s.created_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, parseInt(limit), offset]
    );

    // Get total count
    const countResult = await get(
      'SELECT COUNT(*) as total FROM subjects WHERE user_id = ?',
      [req.user.id]
    );

    res.json({
      subjects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    logger.error('Get subjects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new subject
router.post('/', auth, validateSubject, async (req, res) => {
  try {
    const { name, description, color } = req.body;

    // Check if subject name already exists for this user
    const existingSubject = await get(
      'SELECT id FROM subjects WHERE user_id = ? AND name = ?',
      [req.user.id, name]
    );

    if (existingSubject) {
      return res.status(400).json({ error: 'Subject with this name already exists' });
    }

    // Create subject
    const result = await execute(
      'INSERT INTO subjects (user_id, name, description, color) VALUES (?, ?, ?, ?)',
      [req.user.id, name, description, color || '#3B82F6']
    );

    // Get the created subject
    const subject = await get(
      'SELECT * FROM subjects WHERE id = ?',
      [result.id]
    );

    logger.info(`Subject created: ${subject.name} by user ${req.user.id}`);

    res.status(201).json({
      message: 'Subject created successfully',
      subject
    });
  } catch (error) {
    logger.error('Create subject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific subject with stats
router.get('/:id', auth, validateId, async (req, res) => {
  try {
    const { id } = req.params;

    // Get subject with stats
    const subject = await get(
      `SELECT s.*, 
        COUNT(DISTINCT t.id) as total_todos,
        COUNT(DISTINCT CASE WHEN t.is_completed = 1 THEN t.id END) as completed_todos,
        COUNT(DISTINCT g.id) as total_goals,
        COUNT(DISTINCT CASE WHEN g.is_completed = 1 THEN g.id END) as completed_goals,
        COALESCE(SUM(p.hours_studied), 0) as total_hours
       FROM subjects s
       LEFT JOIN todos t ON s.id = t.subject_id
       LEFT JOIN goals g ON s.id = g.subject_id
       LEFT JOIN progress p ON s.id = p.subject_id
       WHERE s.id = ? AND s.user_id = ?
       GROUP BY s.id`,
      [id, req.user.id]
    );

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json({ subject });
  } catch (error) {
    logger.error('Get subject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update subject
router.put('/:id', auth, validateId, validateSubject, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color } = req.body;

    // Check if subject exists and belongs to user
    const existingSubject = await get(
      'SELECT id FROM subjects WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!existingSubject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Check if new name conflicts with existing subject
    if (name) {
      const nameConflict = await get(
        'SELECT id FROM subjects WHERE user_id = ? AND name = ? AND id != ?',
        [req.user.id, name, id]
      );

      if (nameConflict) {
        return res.status(400).json({ error: 'Subject with this name already exists' });
      }
    }

    // Update subject
    await execute(
      'UPDATE subjects SET name = ?, description = ?, color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, description, color, id]
    );

    // Get updated subject
    const subject = await get(
      'SELECT * FROM subjects WHERE id = ?',
      [id]
    );

    logger.info(`Subject updated: ${subject.name} by user ${req.user.id}`);

    res.json({
      message: 'Subject updated successfully',
      subject
    });
  } catch (error) {
    logger.error('Update subject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete subject
router.delete('/:id', auth, validateId, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if subject exists and belongs to user
    const subject = await get(
      'SELECT name FROM subjects WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Delete subject (cascade will handle related data)
    await execute('DELETE FROM subjects WHERE id = ?', [id]);

    logger.info(`Subject deleted: ${subject.name} by user ${req.user.id}`);

    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    logger.error('Delete subject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get subject statistics
router.get('/:id/stats', auth, validateId, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if subject exists and belongs to user
    const subject = await get(
      'SELECT id FROM subjects WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Get weekly progress for the last 4 weeks
    const weeklyProgress = await query(
      `SELECT 
        strftime('%Y-%W', p.date) as week,
        SUM(p.hours_studied) as hours_studied,
        COUNT(DISTINCT p.date) as days_studied
       FROM progress p
       WHERE p.subject_id = ? AND p.date >= date('now', '-28 days')
       GROUP BY strftime('%Y-%W', p.date)
       ORDER BY week DESC`,
      [id]
    );

    // Get recent todos
    const recentTodos = await query(
      `SELECT t.*, s.name as subject_name
       FROM todos t
       LEFT JOIN subjects s ON t.subject_id = s.id
       WHERE t.subject_id = ?
       ORDER BY t.created_at DESC
       LIMIT 5`,
      [id]
    );

    // Get recent goals
    const recentGoals = await query(
      `SELECT g.*, s.name as subject_name
       FROM goals g
       LEFT JOIN subjects s ON g.subject_id = s.id
       WHERE g.subject_id = ?
       ORDER BY g.created_at DESC
       LIMIT 5`,
      [id]
    );

    res.json({
      weekly_progress: weeklyProgress,
      recent_todos: recentTodos,
      recent_goals: recentGoals
    });
  } catch (error) {
    logger.error('Get subject stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 