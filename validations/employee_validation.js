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
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Job type cannot be empty if provided'),
  
  body('jobTitleId')
    .optional()
    .isUUID()
    .withMessage('Invalid job title ID'),
  
  body('sectionId')
    .isUUID()
    .withMessage('Invalid section ID'),
  
  body('costCenterId')
    .optional()
    .isUUID()
    .withMessage('Invalid cost center ID'),
  
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
  
  body('gender')
    .optional()
    .trim()
    .isIn(['MALE', 'FEMALE', 'OTHER', 'male', 'female', 'other'])
    .withMessage('Gender must be MALE, FEMALE, or OTHER'),
  
  body('contractType')
    .optional()
    .trim(),
  
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  
  body('dateJoined')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format')
];

// Validation for bulk upload from Excel
const bulkUploadEmployeeValidation = [
  body('employees')
    .isArray({ min: 1 })
    .withMessage('Employees array is required and must not be empty'),
  
  body('employees.*.worksNumber')
    .trim()
    .notEmpty()
    .withMessage('Works number is required for each employee'),
  
  body('employees.*.firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required for each employee'),
  
  body('employees.*.lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required for each employee'),
  
  body('employees.*.sectionId')
    .optional()
    .isUUID()
    .withMessage('Invalid section ID format'),
  
  body('employees.*.gender')
    .optional()
    .trim()
    .isIn(['MALE', 'FEMALE', 'OTHER', 'male', 'female', 'other'])
    .withMessage('Gender must be MALE, FEMALE, or OTHER'),
  
  body('employees.*.contractType')
    .optional()
    .trim(),
  
  body('employees.*.jobType')
    .optional()
    .trim()
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
  
  body('jobTitleId')
    .optional()
    .isUUID()
    .withMessage('Invalid job title ID'),
  
  body('sectionId')
    .optional()
    .isUUID()
    .withMessage('Invalid section ID'),
  
  body('costCenterId')
    .optional()
    .isUUID()
    .withMessage('Invalid cost center ID'),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),
  
  body('gender')
    .optional()
    .trim()
    .isIn(['MALE', 'FEMALE', 'OTHER', 'male', 'female', 'other'])
    .withMessage('Gender must be MALE, FEMALE, or OTHER'),
  
  body('contractType')
    .optional()
    .trim(),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

module.exports = {
  createEmployeeValidation,
  updateEmployeeValidation,
  bulkUploadEmployeeValidation
};
