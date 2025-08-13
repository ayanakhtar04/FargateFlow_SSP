const { body, param, query, validationResult } = require('express-validator');

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array() 
    });
  }
  next();
};

// User registration validation
const validateRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  handleValidationErrors
];

// User login validation
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Subject validation
const validateSubject = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Subject name must be between 1 and 100 characters'),
  body('color')
    .optional()
    .isHexColor()
    .withMessage('Color must be a valid hex color'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  handleValidationErrors
];

// Planner slot validation
const validatePlannerSlot = [
  body('subject_id')
    .isInt({ min: 1 })
    .withMessage('Subject ID must be a positive integer'),
  body('day_of_week')
    .isInt({ min: 0, max: 6 })
    .withMessage('Day of week must be between 0 (Sunday) and 6 (Saturday)'),
  body('start_time')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
  body('end_time')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format'),
  body('duration_minutes')
    .optional()
    .isInt({ min: 15, max: 480 })
    .withMessage('Duration must be between 15 and 480 minutes'),
  handleValidationErrors
];

// Todo validation
const validateTodo = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Todo title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('due_date')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid ISO 8601 date'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  body('subject_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Subject ID must be a positive integer'),
  handleValidationErrors
];

// Goal validation
const validateGoal = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Goal title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('target_date')
    .optional()
    .isISO8601()
    .withMessage('Target date must be a valid ISO 8601 date'),
  body('subject_id')
    .isInt({ min: 1 })
    .withMessage('Subject ID must be a positive integer'),
  body('target_hours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Target hours must be a positive number'),
  handleValidationErrors
];

// Progress validation
const validateProgress = [
  body('subject_id')
    .isInt({ min: 1 })
    .withMessage('Subject ID must be a positive integer'),
  body('hours_studied')
    .isFloat({ min: 0 })
    .withMessage('Hours studied must be a positive number'),
  body('date')
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters'),
  handleValidationErrors
];

// ID parameter validation
const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),
  handleValidationErrors
];

// Query parameter validation for pagination
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateSubject,
  validatePlannerSlot,
  validateTodo,
  validateGoal,
  validateProgress,
  validateId,
  validatePagination,
  handleValidationErrors
}; 