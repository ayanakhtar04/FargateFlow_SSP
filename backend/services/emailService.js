const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Configure AWS SES
const ses = new AWS.SES({
  region: process.env.SES_REGION || process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Configure nodemailer for fallback
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

class EmailService {
  constructor() {
    this.fromEmail = process.env.SES_FROM_EMAIL || process.env.SMTP_USER;
  }

  async sendEmail({ to, subject, html, text }) {
    try {
      // Try AWS SES first
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        return await this.sendViaSES({ to, subject, html, text });
      }
      
      // Fallback to SMTP
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        return await this.sendViaSMTP({ to, subject, html, text });
      }

      logger.error('No email configuration found');
      return false;

    } catch (error) {
      logger.error('Email sending failed:', error);
      return false;
    }
  }

  async sendViaSES({ to, subject, html, text }) {
    const params = {
      Source: this.fromEmail,
      Destination: {
        ToAddresses: Array.isArray(to) ? to : [to]
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: html,
            Charset: 'UTF-8'
          },
          ...(text && {
            Text: {
              Data: text,
              Charset: 'UTF-8'
            }
          })
        }
      }
    };

    try {
      const result = await ses.sendEmail(params).promise();
      logger.info('Email sent via SES:', result.MessageId);
      return true;
    } catch (error) {
      logger.error('SES email sending failed:', error);
      throw error;
    }
  }

  async sendViaSMTP({ to, subject, html, text }) {
    const mailOptions = {
      from: this.fromEmail,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject: subject,
      html: html,
      ...(text && { text: text })
    };

    try {
      const result = await transporter.sendMail(mailOptions);
      logger.info('Email sent via SMTP:', result.messageId);
      return true;
    } catch (error) {
      logger.error('SMTP email sending failed:', error);
      throw error;
    }
  }

  async sendDailyReminders() {
    try {
      const db = require('../config/database');
      
      // Get users with active daily reminders
      const users = await db.query(
        `SELECT u.id, u.name, u.email, er.id as reminder_id
         FROM users u
         JOIN email_reminders er ON u.id = er.user_id
         WHERE er.reminder_type = 'daily' 
         AND er.is_active = true
         AND (er.next_send IS NULL OR er.next_send <= CURRENT_TIMESTAMP)`
      );

      let successCount = 0;
      let failureCount = 0;

      for (const user of users.rows) {
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
            [user.id, dayOfWeek]
          );

          // Get today's todos
          const todos = await db.query(
            `SELECT t.*, s.name as subject_name
             FROM todos t
             LEFT JOIN subjects s ON t.subject_id = s.id
             WHERE t.user_id = $1 AND DATE(t.due_date) = $2
             ORDER BY t.priority DESC, t.created_at ASC`,
            [user.id, todayDate]
          );

          // Get overdue todos
          const overdueTodos = await db.query(
            `SELECT t.*, s.name as subject_name
             FROM todos t
             LEFT JOIN subjects s ON t.subject_id = s.id
             WHERE t.user_id = $1 AND t.due_date < CURRENT_TIMESTAMP AND t.is_completed = false
             ORDER BY t.due_date ASC`,
            [user.id]
          );

          // Generate email content
          const emailContent = this.generateDailyReminderEmail({
            userName: user.name,
            plannerSlots: plannerSlots.rows,
            todos: todos.rows,
            overdueTodos: overdueTodos.rows
          });

          const emailSent = await this.sendEmail({
            to: user.email,
            subject: `Daily Study Reminder - ${todayDate}`,
            html: emailContent
          });

          if (emailSent) {
            // Update reminder last sent time
            await db.query(
              `UPDATE email_reminders 
               SET last_sent = CURRENT_TIMESTAMP, next_send = CURRENT_TIMESTAMP + INTERVAL '1 day'
               WHERE id = $1`,
              [user.reminder_id]
            );

            successCount++;
            logger.info(`Daily reminder sent to ${user.email}`);
          } else {
            failureCount++;
            logger.error(`Failed to send daily reminder to ${user.email}`);
          }

        } catch (error) {
          failureCount++;
          logger.error(`Error sending daily reminder to ${user.email}:`, error);
        }
      }

      logger.info(`Daily reminders completed: ${successCount} successful, ${failureCount} failed`);
      return { successCount, failureCount };

    } catch (error) {
      logger.error('Daily reminders job failed:', error);
      throw error;
    }
  }

  generateDailyReminderEmail({ userName, plannerSlots, todos, overdueTodos }) {
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
}

module.exports = new EmailService(); 