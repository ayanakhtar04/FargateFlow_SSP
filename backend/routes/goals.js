const express = require('express');
const { validateGoal, validateId, validatePagination } = require('../middleware/validation');
const { auth } = require('../middleware/auth');
const { query, execute, get } = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

// Get all goals with pagination and filters
router.get('/', auth, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, subject_id } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE g.user_id = ?';
    let params = [req.user.id];

    if (status) {
      whereClause += ' AND g.is_completed = ?';
      params.push(status === 'completed' ? 1 : 0);
    }

    if (subject_id) {
      whereClause += ' AND g.subject_id = ?';
      params.push(subject_id);
    }

    // Get goals with subject info
    const goals = await query(
      `SELECT g.*, s.name as subject_name, s.color as subject_color
       FROM goals g
       LEFT JOIN subjects s ON g.subject_id = s.id
       ${whereClause}
       ORDER BY g.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    // Get total count
    const countResult = await get(
      `SELECT COUNT(*) as total FROM goals g ${whereClause}`,
      params
    );

    res.json({
      goals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    logger.error('Get goals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new goal
router.post('/', auth, validateGoal, async (req, res) => {
  try {
    const { title, description, subject_id, target_hours, due_date } = req.body;

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

    // Create goal
    const result = await execute(
      'INSERT INTO goals (user_id, subject_id, title, description, target_hours, due_date) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, subject_id, title, description, target_hours || 0, due_date]
    );

    // Get the created goal
    const goal = await get(
      `SELECT g.*, s.name as subject_name, s.color as subject_color
       FROM goals g
       LEFT JOIN subjects s ON g.subject_id = s.id
       WHERE g.id = ?`,
      [result.id]
    );

    logger.info(`Goal created: ${goal.title} by user ${req.user.id}`);

    res.status(201).json({
      message: 'Goal created successfully',
      goal
    });
  } catch (error) {
    logger.error('Create goal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific goal
router.get('/:id', auth, validateId, async (req, res) => {
  try {
    const { id } = req.params;

    const goal = await get(
      `SELECT g.*, s.name as subject_name, s.color as subject_color
       FROM goals g
       LEFT JOIN subjects s ON g.subject_id = s.id
       WHERE g.id = ? AND g.user_id = ?`,
      [id, req.user.id]
    );

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json({ goal });
  } catch (error) {
    logger.error('Get goal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update goal
router.put('/:id', auth, validateId, validateGoal, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, subject_id, target_hours, due_date } = req.body;

    // Check if goal exists and belongs to user
    const existingGoal = await get(
      'SELECT id FROM goals WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!existingGoal) {
      return res.status(404).json({ error: 'Goal not found' });
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

    // Update goal
    await execute(
      'UPDATE goals SET title = ?, description = ?, subject_id = ?, target_hours = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title, description, subject_id, target_hours, due_date, id]
    );

    // Get updated goal
    const goal = await get(
      `SELECT g.*, s.name as subject_name, s.color as subject_color
       FROM goals g
       LEFT JOIN subjects s ON g.subject_id = s.id
       WHERE g.id = ?`,
      [id]
    );

    logger.info(`Goal updated: ${goal.title} by user ${req.user.id}`);

    res.json({
      message: 'Goal updated successfully',
      goal
    });
  } catch (error) {
    logger.error('Update goal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update goal progress
router.patch('/:id/progress', auth, validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const { completed_hours } = req.body;

    // Check if goal exists and belongs to user
    const goal = await get(
      'SELECT id, title, target_hours, completed_hours FROM goals WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const newCompletedHours = (goal.completed_hours || 0) + (completed_hours || 0);
    const isCompleted = newCompletedHours >= goal.target_hours;

    // Update goal progress
    await execute(
      'UPDATE goals SET completed_hours = ?, is_completed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newCompletedHours, isCompleted ? 1 : 0, id]
    );

    logger.info(`Goal progress updated: ${goal.title} by user ${req.user.id}`);

    res.json({
      message: 'Goal progress updated successfully',
      completed_hours: newCompletedHours,
      is_completed: isCompleted
    });
  } catch (error) {
    logger.error('Update goal progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete goal
router.delete('/:id', auth, validateId, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if goal exists and belongs to user
    const goal = await get(
      'SELECT title FROM goals WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    // Delete goal
    await execute('DELETE FROM goals WHERE id = ?', [id]);

    logger.info(`Goal deleted: ${goal.title} by user ${req.user.id}`);

    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    logger.error('Delete goal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get goal statistics overview
router.get('/stats/overview', auth, async (req, res) => {
  try {
    // Get overall stats
    const overallStats = await get(
      `SELECT 
        COUNT(*) as total_goals,
        COUNT(CASE WHEN is_completed = 1 THEN 1 END) as completed_goals,
        COUNT(CASE WHEN is_completed = 0 THEN 1 END) as pending_goals,
        COALESCE(SUM(target_hours), 0) as total_target_hours,
        COALESCE(SUM(completed_hours), 0) as total_completed_hours
       FROM goals 
       WHERE user_id = ?`,
      [req.user.id]
    );

    // Get completion rate by subject
    const completionBySubject = await query(
      `SELECT 
        s.name as subject_name,
        s.color as subject_color,
        COUNT(g.id) as total_goals,
        COUNT(CASE WHEN g.is_completed = 1 THEN 1 END) as completed_goals,
        COALESCE(SUM(g.target_hours), 0) as total_target_hours,
        COALESCE(SUM(g.completed_hours), 0) as total_completed_hours,
        ROUND(CAST(COUNT(CASE WHEN g.is_completed = 1 THEN 1 END) AS FLOAT) / COUNT(g.id) * 100, 2) as completion_rate
       FROM goals g
       LEFT JOIN subjects s ON g.subject_id = s.id
       WHERE g.user_id = ?
       GROUP BY s.id, s.name, s.color
       ORDER BY completion_rate DESC`,
      [req.user.id]
    );

    // Get recent goals
    const recentGoals = await query(
      `SELECT g.*, s.name as subject_name, s.color as subject_color
       FROM goals g
       LEFT JOIN subjects s ON g.subject_id = s.id
       WHERE g.user_id = ?
       ORDER BY g.created_at DESC
       LIMIT 5`,
      [req.user.id]
    );

    res.json({
      stats: overallStats,
      completion_by_subject: completionBySubject,
      recent_goals: recentGoals
    });
  } catch (error) {
    logger.error('Get goal stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 