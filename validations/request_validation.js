const { body, param } = require('express-validator');

const createRequestValidation = [
  body('employeeId')
    .isUUID()
    .withMessage('Invalid employee ID'),
  
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  
  body('items.*.ppeItemId')
    .isUUID()
    .withMessage('Invalid PPE item ID'),
  
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  
  body('items.*.size')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Size cannot be empty if provided'),
  
  body('items.*.reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters'),
  
  body('requestReason')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Request reason must not exceed 1000 characters')
];

const approveRequestValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid request ID'),
  
  body('approvalComments')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Comments must not exceed 500 characters')
];

const rejectRequestValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid request ID'),
  
  body('rejectionReason')
    .trim()
    .notEmpty()
    .withMessage('Rejection reason is required')
    .isLength({ max: 500 })
    .withMessage('Rejection reason must not exceed 500 characters')
];

const fulfillRequestValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid request ID'),
  
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  
  body('items.*.requestItemId')
    .isUUID()
    .withMessage('Invalid request item ID'),
  
  body('items.*.allocatedQuantity')
    .isInt({ min: 1 })
    .withMessage('Allocated quantity must be at least 1'),
  
  body('items.*.size')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Size cannot be empty if provided')
];

module.exports = {
  createRequestValidation,
  approveRequestValidation,
  rejectRequestValidation,
  fulfillRequestValidation
};
