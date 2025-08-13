const express = require('express');
const { auth } = require('../middleware/auth');
const db = require('../config/database');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// Get user's email reminder settings
router.get('/reminders', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM email_reminders WHERE user_id = $1',
      [req.user.id]
    );

    res.json({
      reminders: result.rows
    });

  } catch (error) {
    logger.error('Get email reminders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create or update email reminder
router.post('/reminders', async (req, res) => {
  try {
    const { reminder_type, is_active } = req.body;

    if (!reminder_type) {
      return res.status(400).json({ error: 'Reminder type is required' });
    }

    // Check if reminder already exists
    const existingReminder = await db.query(
      'SELECT id FROM email_reminders WHERE user_id = $1 AND reminder_type = $2',
      [req.user.id, reminder_type]
    );

    let result;
    if (existingReminder.rows.length > 0) {
      // Update existing reminder
      result = await db.query(
        `UPDATE email_reminders 
         SET is_active = $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2 AND reminder_type = $3
         RETURNING *`,
        [is_active, req.user.id, reminder_type]
      );
    } else {
      // Create new reminder
      result = await db.query(
        `INSERT INTO email_reminders (user_id, email, reminder_type, is_active)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [req.user.id, req.user.email, reminder_type, is_active]
      );
    }

    logger.info(`Email reminder ${reminder_type} ${is_active ? 'enabled' : 'disabled'} for user ${req.user.email}`);

    res.json({
      message: 'Email reminder updated successfully',
      reminder: result.rows[0]
    });

  } catch (error) {
    logger.error('Create/update email reminder error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete email reminder
router.delete('/reminders/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM email_reminders WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Email reminder not found' });
    }

    logger.info(`Email reminder deleted: ${id} by user ${req.user.email}`);

    res.json({
      message: 'Email reminder deleted successfully'
    });

  } catch (error) {
    logger.error('Delete email reminder error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send test email
router.post('/test', async (req, res) => {
  try {
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    const emailSent = await emailService.sendEmail({
      to: req.user.email,
      subject: subject,
      html: message
    });

    if (emailSent) {
      logger.info(`Test email sent to ${req.user.email}`);
      res.json({
        message: 'Test email sent successfully'
      });
    } else {
      res.status(500).json({
        error: 'Failed to send test email'
      });
    }

  } catch (error) {
    logger.error('Send test email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send daily reminder email
router.post('/daily-reminder', async (req, res) => {
  try {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const todayDate = today.toISOString().split('T')[0];

    // Get today's planner slots
    const plannerSlots = await db.query(
      `SELECT ps.*, s.name as subject_name, s.color as subject_color
       FROM planner_slots ps
       JOIN subjects s ON ps.subject_id = s.id
       WHERE ps.user_id = $1 AND ps.day_of_week = $2 AND ps.is_active = true
       ORDER BY ps.start_time`,
      [req.user.id, dayOfWeek]
    );

    // Get today's todos
    const todos = await db.query(
      `SELECT t.*, s.name as subject_name
       FROM todos t
       LEFT JOIN subjects s ON t.subject_id = s.id
       WHERE t.user_id = $1 AND DATE(t.due_date) = $2
       ORDER BY t.priority DESC, t.created_at ASC`,
      [req.user.id, todayDate]
    );

    // Get overdue todos
    const overdueTodos = await db.query(
      `SELECT t.*, s.name as subject_name
       FROM todos t
       LEFT JOIN subjects s ON t.subject_id = s.id
       WHERE t.user_id = $1 AND t.due_date < CURRENT_TIMESTAMP AND t.is_completed = false
       ORDER BY t.due_date ASC`,
      [req.user.id]
    );

    // Generate email content
    const emailContent = generateDailyReminderEmail({
      userName: req.user.name,
      plannerSlots: plannerSlots.rows,
      todos: todos.rows,
      overdueTodos: overdueTodos.rows
    });

    const emailSent = await emailService.sendEmail({
      to: req.user.email,
      subject: `Daily Study Reminder - ${todayDate}`,
      html: emailContent
    });

    if (emailSent) {
      // Update reminder last sent time
      await db.query(
        `UPDATE email_reminders 
         SET last_sent = CURRENT_TIMESTAMP, next_send = CURRENT_TIMESTAMP + INTERVAL '1 day'
         WHERE user_id = $1 AND reminder_type = 'daily'`,
        [req.user.id]
      );

      logger.info(`Daily reminder email sent to ${req.user.email}`);
      res.json({
        message: 'Daily reminder email sent successfully'
      });
    } else {
      res.status(500).json({
        error: 'Failed to send daily reminder email'
      });
    }

  } catch (error) {
    logger.error('Send daily reminder error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to generate daily reminder email content
function generateDailyReminderEmail({ userName, plannerSlots, todos, overdueTodos }) {
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Daily Study Reminder</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3B82F6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .section { margin-bottom: 20px; }
        .section h3 { color: #3B82F6; border-bottom: 2px solid #3B82F6; padding-bottom: 5px; }
        .item { background: white; padding: 10px; margin: 5px 0; border-radius: 4px; border-left: 4px solid #3B82F6; }
        .overdue { border-left-color: #EF4444; }
        .time { color: #6B7280; font-size: 0.9em; }
        .subject { font-weight: bold; color: #3B82F6; }
        .footer { text-align: center; margin-top: 20px; color: #6B7280; font-size: 0.9em; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📚 Daily Study Reminder</h1>
          <p>${today}</p>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          <p>Here's your study plan for today:</p>
  `;

  // Today's scheduled sessions
  if (plannerSlots.length > 0) {
    html += `
      <div class="section">
        <h3>📅 Today's Scheduled Sessions</h3>
    `;
    plannerSlots.forEach(slot => {
      html += `
        <div class="item">
          <div class="subject">${slot.subject_name}</div>
          <div class="time">${slot.start_time} - ${slot.end_time}</div>
        </div>
      `;
    });
    html += `</div>`;
  }

  // Today's todos
  if (todos.length > 0) {
    html += `
      <div class="section">
        <h3>✅ Today's Tasks</h3>
    `;
    todos.forEach(todo => {
      const priorityColor = todo.priority === 'high' ? '#EF4444' : todo.priority === 'medium' ? '#F59E0B' : '#10B981';
      html += `
        <div class="item">
          <div style="color: ${priorityColor}; font-weight: bold;">${todo.title}</div>
          ${todo.subject_name ? `<div class="subject">Subject: ${todo.subject_name}</div>` : ''}
        </div>
      `;
    });
    html += `</div>`;
  }

  // Overdue todos
  if (overdueTodos.length > 0) {
    html += `
      <div class="section">
        <h3>⚠️ Overdue Tasks</h3>
    `;
    overdueTodos.forEach(todo => {
      html += `
        <div class="item overdue">
          <div style="color: #EF4444; font-weight: bold;">${todo.title}</div>
          ${todo.subject_name ? `<div class="subject">Subject: ${todo.subject_name}</div>` : ''}
          <div class="time">Due: ${new Date(todo.due_date).toLocaleDateString()}</div>
        </div>
      `;
    });
    html += `</div>`;
  }

  html += `
          <p>Stay focused and keep up the great work! 🚀</p>
        </div>
        <div class="footer">
          <p>This email was sent by Smart Study Planner</p>
          <p>You can manage your email preferences in your account settings.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
}

module.exports = router; 