const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validateRegistration, validateLogin } = require('../middleware/validation');
const { auth } = require('../middleware/auth');
const { query, execute, get } = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

// Multer setup for profile images
const uploadDir = path.join(__dirname, '..', 'uploads', 'profiles');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `user-${req.user.id}-${Date.now()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (/^image\/(png|jpe?g|webp)$/.test(file.mimetype)) cb(null, true);
  else cb(new Error('Only PNG, JPG, and WEBP images allowed'));
};

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter
});

// Register new user
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await get(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await execute(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, passwordHash]
    );

    // Get the created user
    const user = await get(
      'SELECT id, name, email, created_at, profile_image FROM users WHERE id = ?',
      [result.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logger.info(`New user registered: ${user.email}`);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profile_image: user.profile_image,
        created_at: user.created_at
      },
      token
    });

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login user
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await get(
      'SELECT id, name, email, password, created_at, profile_image FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logger.info(`User logged in: ${user.email}`);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profile_image: user.profile_image,
        created_at: user.created_at
      },
      token
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await get(
      'SELECT id, name, email, created_at, profile_image FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/me', auth, async (req, res) => {
  try {
    const { name, email } = req.body;

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await get(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, req.user.id]
      );

      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    // Update user
    await execute(
      'UPDATE users SET name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name || req.user.name, email || req.user.email, req.user.id]
    );

    // Get updated user
    const user = await get(
      'SELECT id, name, email, created_at, profile_image FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get current user with password
    const user = await get(
      'SELECT password FROM users WHERE id = ?',
      [req.user.id]
    );

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await execute(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPasswordHash, req.user.id]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete account
router.delete('/me', auth, async (req, res) => {
  try {
    const { password } = req.body;

    // Get current user with password
    const user = await get(
      'SELECT password FROM users WHERE id = ?',
      [req.user.id]
    );

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Password is incorrect' });
    }

    // Delete user (cascade will handle related data)
    await execute('DELETE FROM users WHERE id = ?', [req.user.id]);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    logger.error('Delete account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload profile image
router.post('/me/profile-image', auth, upload.single('image'), async (req, res) => {
  try {
    // Delete previous image if exists
    const existing = await get('SELECT profile_image FROM users WHERE id = ?', [req.user.id]);
    if (existing?.profile_image) {
      const oldPath = path.join(__dirname, '..', existing.profile_image);
      if (fs.existsSync(oldPath)) fs.unlink(oldPath, () => {});
    }

  let relativePath = path.join('uploads', 'profiles', path.basename(req.file.path));
  relativePath = relativePath.replace(/\\/g, '/');
    await execute('UPDATE users SET profile_image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [relativePath, req.user.id]);
    const updated = await get('SELECT id, name, email, created_at, profile_image FROM users WHERE id = ?', [req.user.id]);
    res.json({ message: 'Profile image updated', user: updated });
  } catch (error) {
    logger.error('Profile image upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Delete profile image
router.delete('/me/profile-image', auth, async (req, res) => {
  try {
    const existing = await get('SELECT profile_image FROM users WHERE id = ?', [req.user.id]);
    if (existing?.profile_image) {
      const imgPath = path.join(__dirname, '..', existing.profile_image);
      if (fs.existsSync(imgPath)) fs.unlink(imgPath, () => {});
      await execute('UPDATE users SET profile_image = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [req.user.id]);
    }
    const updated = await get('SELECT id, name, email, created_at, profile_image FROM users WHERE id = ?', [req.user.id]);
    res.json({ message: 'Profile image removed', user: updated });
  } catch (error) {
    logger.error('Profile image delete error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

module.exports = router;