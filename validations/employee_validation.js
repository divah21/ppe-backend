const { body, param } = require('express-validator');

const createEmployeeValidation = [
  body('worksNumber')
    .trim()
    .notEmpty()
    .withMessage('Works number is required')
    .isLength({ max: 50 })
    .withMessage('Works number must not exceed 50 characters'),
  
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required'),
  
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required'),
  
  body('jobType')
    .trim()
    .notEmpty()
    .withMessage('Job type is required'),
  
  body('sectionId')
    .isUUID()
    .withMessage('Invalid section ID'),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),
  
  body('phoneNumber')
    .optional()
    .trim()
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('Invalid phone number format'),
  
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  
  body('dateJoined')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format')
];

const updateEmployeeValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid employee ID'),
  
  body('worksNumber')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Works number cannot be empty'),
  
  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('First name cannot be empty'),
  
  body('lastName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Last name cannot be empty'),
  
  body('jobType')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Job type cannot be empty'),
  
  body('sectionId')
    .optional()
    .isUUID()
    .withMessage('Invalid section ID'),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

module.exports = {
  createEmployeeValidation,
  updateEmployeeValidation
};
