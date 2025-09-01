const express = require('express');
const { validateTodo, validateId, validatePagination } = require('../middleware/validation');
const { auth } = require('../middleware/auth');
const { query, execute, get } = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

// Get all todos with pagination and filters
router.get('/', auth, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, subject_id, priority } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE t.user_id = ?';
    let params = [req.user.id];

    if (status) {
      whereClause += ' AND t.is_completed = ?';
      params.push(status === 'completed' ? 1 : 0);
    }

    if (subject_id) {
      whereClause += ' AND t.subject_id = ?';
      params.push(subject_id);
    }

    if (priority) {
      whereClause += ' AND t.priority = ?';
      params.push(priority);
    }

    // Get todos with subject info
    const todos = await query(
      `SELECT t.*, s.name as subject_name, s.color as subject_color
       FROM todos t
       LEFT JOIN subjects s ON t.subject_id = s.id
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    // Get total count
    const countResult = await get(
      `SELECT COUNT(*) as total FROM todos t ${whereClause}`,
      params
    );

    res.json({
      todos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    logger.error('Get todos error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get today's todos (auto-generated from planner)
router.get('/today', auth, async (req, res) => {
  try {
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Get planner slots for today
    const plannerSlots = await query(
      `SELECT ps.*, s.name as subject_name, s.color as subject_color
       FROM planner_slots ps
       LEFT JOIN subjects s ON ps.subject_id = s.id
       WHERE ps.user_id = ? AND ps.day_of_week = ?`,
      [req.user.id, today]
    );

    // Get existing todos for today
    const existingTodos = await query(
      `SELECT t.*, s.name as subject_name, s.color as subject_color
       FROM todos t
       LEFT JOIN subjects s ON t.subject_id = s.id
       WHERE t.user_id = ? AND DATE(t.created_at) = DATE('now')`,
      [req.user.id]
    );

    // If no todos exist for today, create them from planner slots
    if (existingTodos.length === 0 && plannerSlots.length > 0) {
      const todoPromises = plannerSlots.map(slot => 
        execute(
          'INSERT INTO todos (user_id, subject_id, title, description, priority) VALUES (?, ?, ?, ?, ?)',
          [req.user.id, slot.subject_id, slot.title || `Study ${slot.subject_name}`, slot.description, 'medium']
        )
      );

      await Promise.all(todoPromises);

      // Get the newly created todos
      const newTodos = await query(
        `SELECT t.*, s.name as subject_name, s.color as subject_color
         FROM todos t
         LEFT JOIN subjects s ON t.subject_id = s.id
         WHERE t.user_id = ? AND DATE(t.created_at) = DATE('now')`,
        [req.user.id]
      );

      res.json({ todos: newTodos, auto_generated: true });
    } else {
      res.json({ todos: existingTodos, auto_generated: false });
    }
  } catch (error) {
    logger.error('Get today todos error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new todo
router.post('/', auth, validateTodo, async (req, res) => {
  try {
    const { title, description, subject_id, due_date, priority } = req.body;

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

    // Create todo
    const result = await execute(
      'INSERT INTO todos (user_id, subject_id, title, description, due_date, priority) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, subject_id, title, description, due_date, priority || 'medium']
    );

    // Get the created todo
    const todo = await get(
      `SELECT t.*, s.name as subject_name, s.color as subject_color
       FROM todos t
       LEFT JOIN subjects s ON t.subject_id = s.id
       WHERE t.id = ?`,
      [result.id]
    );

    logger.info(`Todo created: ${todo.title} by user ${req.user.id}`);

    res.status(201).json({
      message: 'Todo created successfully',
      todo
    });
  } catch (error) {
    logger.error('Create todo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific todo
router.get('/:id', auth, validateId, async (req, res) => {
  try {
    const { id } = req.params;

    const todo = await get(
      `SELECT t.*, s.name as subject_name, s.color as subject_color
       FROM todos t
       LEFT JOIN subjects s ON t.subject_id = s.id
       WHERE t.id = ? AND t.user_id = ?`,
      [id, req.user.id]
    );

    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    res.json({ todo });
  } catch (error) {
    logger.error('Get todo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update todo
router.put('/:id', auth, validateId, validateTodo, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, subject_id, due_date, priority } = req.body;

    // Check if todo exists and belongs to user
    const existingTodo = await get(
      'SELECT id FROM todos WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!existingTodo) {
      return res.status(404).json({ error: 'Todo not found' });
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

    // Update todo
    await execute(
      'UPDATE todos SET title = ?, description = ?, subject_id = ?, due_date = ?, priority = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title, description, subject_id, due_date, priority, id]
    );

    // Get updated todo
    const todo = await get(
      `SELECT t.*, s.name as subject_name, s.color as subject_color
       FROM todos t
       LEFT JOIN subjects s ON t.subject_id = s.id
       WHERE t.id = ?`,
      [id]
    );

    logger.info(`Todo updated: ${todo.title} by user ${req.user.id}`);

    res.json({
      message: 'Todo updated successfully',
      todo
    });
  } catch (error) {
    logger.error('Update todo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle todo completion status
router.patch('/:id/toggle', auth, validateId, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if todo exists and belongs to user
    const todo = await get(
      'SELECT id, title, is_completed FROM todos WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    // Toggle completion status
    const newStatus = todo.is_completed ? 0 : 1;
    await execute(
      'UPDATE todos SET is_completed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStatus, id]
    );

    logger.info(`Todo ${newStatus ? 'completed' : 'uncompleted'}: ${todo.title} by user ${req.user.id}`);

    res.json({
      message: `Todo ${newStatus ? 'completed' : 'uncompleted'} successfully`,
      is_completed: newStatus
    });
  } catch (error) {
    logger.error('Toggle todo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete todo
router.delete('/:id', auth, validateId, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if todo exists and belongs to user
    const todo = await get(
      'SELECT title FROM todos WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    // Delete todo
    await execute('DELETE FROM todos WHERE id = ?', [id]);

    logger.info(`Todo deleted: ${todo.title} by user ${req.user.id}`);

    res.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    logger.error('Delete todo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk update todos
router.put('/bulk/update', auth, async (req, res) => {
  try {
    const { todos } = req.body;

    if (!Array.isArray(todos)) {
      return res.status(400).json({ error: 'Todos array is required' });
    }

    const updatePromises = todos.map(todo => 
      execute(
        'UPDATE todos SET title = ?, description = ?, subject_id = ?, due_date = ?, priority = ?, is_completed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
        [todo.title, todo.description, todo.subject_id, todo.due_date, todo.priority, todo.is_completed ? 1 : 0, todo.id, req.user.id]
      )
    );

    await Promise.all(updatePromises);

    res.json({ message: 'Todos updated successfully' });
  } catch (error) {
    logger.error('Bulk update todos error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get todo statistics overview
router.get('/stats/overview', auth, async (req, res) => {
  try {
    // Get overall stats
    const overallStats = await get(
      `SELECT 
        COUNT(*) as total_todos,
        COUNT(CASE WHEN is_completed = 1 THEN 1 END) as completed_todos,
        COUNT(CASE WHEN is_completed = 0 THEN 1 END) as pending_todos,
        COUNT(CASE WHEN due_date < DATE('now') AND is_completed = 0 THEN 1 END) as overdue_todos
       FROM todos 
       WHERE user_id = ?`,
      [req.user.id]
    );

    // Get completion rate by subject
    const completionBySubject = await query(
      `SELECT 
        s.name as subject_name,
        s.color as subject_color,
        COUNT(t.id) as total_todos,
        COUNT(CASE WHEN t.is_completed = 1 THEN 1 END) as completed_todos,
        ROUND(CAST(COUNT(CASE WHEN t.is_completed = 1 THEN 1 END) AS FLOAT) / COUNT(t.id) * 100, 2) as completion_rate
       FROM todos t
       LEFT JOIN subjects s ON t.subject_id = s.id
       WHERE t.user_id = ?
       GROUP BY s.id, s.name, s.color
       ORDER BY completion_rate DESC`,
      [req.user.id]
    );

    // Get priority distribution
    const priorityDistribution = await query(
      `SELECT 
        priority,
        COUNT(*) as count
       FROM todos 
       WHERE user_id = ?
       GROUP BY priority`,
      [req.user.id]
    );

    res.json({
      stats: overallStats,
      completion_by_subject: completionBySubject,
      priority_distribution: priorityDistribution
    });
  } catch (error) {
    logger.error('Get todo stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 