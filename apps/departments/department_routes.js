const express = require('express');
const router = express.Router();
const { Department, Section, Employee } = require('../../models');
const { authenticate } = require('../../middlewares/auth_middleware');
const { requireRole } = require('../../middlewares/role_middleware');
const { auditLog } = require('../../middlewares/audit_middleware');
const { body, param } = require('express-validator');
const { validate } = require('../../middlewares/validation_middleware');
const { Op } = require('sequelize');
const { sequelize } = require('../../database/db');

/**
 * @route   GET /api/v1/departments
 * @desc    Get all departments
 * @access  Private
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { includeSections, includeStats } = req.query;

    const include = [];
    
    if (includeSections === 'true') {
      include.push({
        model: Section,
        as: 'sections'
      });
    }

    const departments = await Department.findAll({
      include,
      order: [['name', 'ASC']]
    });

    // Optionally add statistics
    if (includeStats === 'true') {
      for (const dept of departments) {
        const sections = await Section.findAll({ where: { departmentId: dept.id } });
        const sectionIds = sections.map(s => s.id);
        
        const employeeCount = sectionIds.length > 0 ? await Employee.count({
          where: { sectionId: { [Op.in]: sectionIds } }
        }) : 0;

        dept.dataValues.stats = {
          sectionCount: sections.length,
          employeeCount
        };
      }
    }

    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/departments/:id
 * @desc    Get department by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const department = await Department.findByPk(req.params.id, {
      include: [{
        model: Section,
        as: 'sections'
      }]
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    res.json({
      success: true,
      data: department
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/departments
 * @desc    Create new department
 * @access  Private (Admin only)
 */
router.post(
  '/',
  authenticate,
  requireRole('admin'),
  [
    body('name').trim().notEmpty().withMessage('Department name is required'),
    body('code').trim().notEmpty().withMessage('Department code is required'),
    body('description').optional().trim()
  ],
  validate,
  auditLog('CREATE', 'Department'),
  async (req, res, next) => {
    try {
      const { name, code, description } = req.body;

      // Check if code already exists
      const existing = await Department.findOne({ where: { code } });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Department code already exists'
        });
      }

      const department = await Department.create({
        name,
        code,
        description
      });

      res.status(201).json({
        success: true,
        message: 'Department created successfully',
        data: department
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/departments/:id
 * @desc    Update department
 * @access  Private (Admin only)
 */
router.put(
  '/:id',
  authenticate,
  requireRole('admin'),
  [
    param('id').isUUID().withMessage('Invalid department ID'),
    body('name').optional().trim().notEmpty().withMessage('Department name cannot be empty'),
    body('code').optional().trim().notEmpty().withMessage('Department code cannot be empty'),
    body('description').optional().trim()
  ],
  validate,
  auditLog('UPDATE', 'Department'),
  async (req, res, next) => {
    try {
      const department = await Department.findByPk(req.params.id);

      if (!department) {
        return res.status(404).json({
          success: false,
          message: 'Department not found'
        });
      }

      // Check if code is being changed and already exists
      if (req.body.code && req.body.code !== department.code) {
        const existing = await Department.findOne({ where: { code: req.body.code } });
        if (existing) {
          return res.status(409).json({
            success: false,
            message: 'Department code already exists'
          });
        }
      }

      await department.update(req.body);

      res.json({
        success: true,
        message: 'Department updated successfully',
        data: department
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/departments/:id
 * @desc    Delete department
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  auditLog('DELETE', 'Department'),
  async (req, res, next) => {
    try {
      const department = await Department.findByPk(req.params.id);

      if (!department) {
        return res.status(404).json({
          success: false,
          message: 'Department not found'
        });
      }

      // Check if department has sections
      const sections = await Section.count({ where: { departmentId: department.id } });
      if (sections > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete department with existing sections. Delete or reassign sections first.'
        });
      }

      await department.destroy();

      res.json({
        success: true,
        message: 'Department deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/departments/bulk-upload
 * @desc    Bulk upload departments from Excel data
 * @access  Private (Admin only)
 * 
 * Expected Excel columns:
 * - name or Department Name -> name
 * - code or Department Code -> code
 * - description or Description -> description (optional)
 */
router.post(
  '/bulk-upload',
  authenticate,
  requireRole('admin'),
  auditLog('BULK_CREATE', 'Department'),
  async (req, res, next) => {
    const transaction = await sequelize.transaction();
    
    try {
      const { departments, skipDuplicates = true } = req.body;

      if (!Array.isArray(departments) || departments.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Departments array is required and must not be empty'
        });
      }

      const results = {
        created: [],
        skipped: [],
        errors: []
      };

      for (let i = 0; i < departments.length; i++) {
        const row = departments[i];
        const rowNum = i + 2; // Excel row (1-indexed + header)

        try {
          // Map Excel columns to model fields
          const name = row.name || row['Department Name'] || row['Department'] || row['NAME'];
          const code = row.code || row['Department Code'] || row['Code'] || row['CODE'];
          const description = row.description || row['Description'] || row['DESCRIPTION'];

          // Validate required fields
          if (!name) {
            results.errors.push({ row: rowNum, error: 'Department name is required' });
            continue;
          }
          if (!code) {
            results.errors.push({ row: rowNum, name, error: 'Department code is required' });
            continue;
          }

          // Check for duplicate code
          const existingByCode = await Department.findOne({ 
            where: { code: code.toUpperCase() },
            transaction 
          });
          
          if (existingByCode) {
            if (skipDuplicates) {
              results.skipped.push({ row: rowNum, code, name, reason: 'Code already exists' });
              continue;
            } else {
              results.errors.push({ row: rowNum, code, error: 'Department code already exists' });
              continue;
            }
          }

          // Check for duplicate name
          const existingByName = await Department.findOne({ 
            where: { name: { [Op.iLike]: name } },
            transaction 
          });
          
          if (existingByName) {
            if (skipDuplicates) {
              results.skipped.push({ row: rowNum, code, name, reason: 'Name already exists' });
              continue;
            } else {
              results.errors.push({ row: rowNum, name, error: 'Department name already exists' });
              continue;
            }
          }

          // Create department
          const department = await Department.create({
            name: name.trim(),
            code: code.toUpperCase().trim(),
            description: description ? description.trim() : null
          }, { transaction });

          results.created.push({
            row: rowNum,
            id: department.id,
            name: department.name,
            code: department.code
          });

        } catch (err) {
          results.errors.push({ 
            row: rowNum, 
            error: err.message || 'Unknown error'
          });
        }
      }

      // Commit transaction if we created any records
      if (results.created.length > 0) {
        await transaction.commit();
      } else {
        await transaction.rollback();
      }

      res.status(results.created.length > 0 ? 201 : 400).json({
        success: results.created.length > 0,
        message: `Created ${results.created.length} departments, skipped ${results.skipped.length}, ${results.errors.length} errors`,
        data: results
      });
    } catch (error) {
      await transaction.rollback();
      next(error);
    }
  }
);

module.exports = router;
