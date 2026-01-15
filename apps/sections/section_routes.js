const express = require('express');
const router = express.Router();
const { Section, Department, Employee } = require('../../models');
const { authenticate } = require('../../middlewares/auth_middleware');
const { requireRole } = require('../../middlewares/role_middleware');
const { auditLog } = require('../../middlewares/audit_middleware');
const { body, param } = require('express-validator');
const { validate } = require('../../middlewares/validation_middleware');
const { sequelize } = require('../../database/db');
const { Op } = require('sequelize');

/**
 * @route   GET /api/v1/sections
 * @desc    Get all sections
 * @access  Private
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { departmentId, includeStats } = req.query;

    const where = {};
    if (departmentId) where.departmentId = departmentId;

    const sections = await Section.findAll({
      where,
      include: [{
        model: Department,
        as: 'department'
      }],
      order: [['name', 'ASC']]
    });

    // Optionally add statistics
    if (includeStats === 'true') {
      for (const section of sections) {
        const employeeCount = await Employee.count({
          where: { sectionId: section.id, isActive: true }
        });

        section.dataValues.stats = { employeeCount };
      }
    }

    res.json({
      success: true,
      data: sections
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/sections/department/:departmentId
 * @desc    Get sections by department ID
 * @access  Private
 */
router.get('/department/:departmentId', authenticate, async (req, res, next) => {
  try {
    const { departmentId } = req.params;

    const sections = await Section.findAll({
      where: { departmentId },
      include: [{
        model: Department,
        as: 'department'
      }],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: sections
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/sections/:id
 * @desc    Get section by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const section = await Section.findByPk(req.params.id, {
      include: [{
        model: Department,
        as: 'department'
      }]
    });

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }

    res.json({
      success: true,
      data: section
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/sections
 * @desc    Create new section
 * @access  Private (Admin, Department Rep)
 */
router.post(
  '/',
  authenticate,
  requireRole('admin', 'department-rep'),
  [
    body('name').trim().notEmpty().withMessage('Section name is required'),
    body('departmentId').isUUID().withMessage('Invalid department ID'),
    body('description').optional().trim()
  ],
  validate,
  auditLog('CREATE', 'Section'),
  async (req, res, next) => {
    try {
      const { name, departmentId, description } = req.body;

      // Verify department exists
      const department = await Department.findByPk(departmentId);
      if (!department) {
        return res.status(404).json({
          success: false,
          message: 'Department not found'
        });
      }

      // Check if section name already exists in this department
      const existing = await Section.findOne({
        where: { name, departmentId }
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Section name already exists in this department'
        });
      }

      const section = await Section.create({
        name,
        departmentId,
        description
      });

      const createdSection = await Section.findByPk(section.id, {
        include: [{ model: Department, as: 'department' }]
      });

      res.status(201).json({
        success: true,
        message: 'Section created successfully',
        data: createdSection
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/sections/:id
 * @desc    Update section
 * @access  Private (Admin, Department Rep)
 */
router.put(
  '/:id',
  authenticate,
  requireRole('admin', 'department-rep'),
  [
    param('id').isUUID().withMessage('Invalid section ID'),
    body('name').optional().trim().notEmpty().withMessage('Section name cannot be empty'),
    body('departmentId').optional().isUUID().withMessage('Invalid department ID'),
    body('description').optional().trim()
  ],
  validate,
  auditLog('UPDATE', 'Section'),
  async (req, res, next) => {
    try {
      const section = await Section.findByPk(req.params.id);

      if (!section) {
        return res.status(404).json({
          success: false,
          message: 'Section not found'
        });
      }

      // If changing department, verify it exists
      if (req.body.departmentId && req.body.departmentId !== section.departmentId) {
        const department = await Department.findByPk(req.body.departmentId);
        if (!department) {
          return res.status(404).json({
            success: false,
            message: 'Department not found'
          });
        }
      }

      await section.update(req.body);

      const updatedSection = await Section.findByPk(section.id, {
        include: [{ model: Department, as: 'department' }]
      });

      res.json({
        success: true,
        message: 'Section updated successfully',
        data: updatedSection
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/sections/:id
 * @desc    Delete section
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  auditLog('DELETE', 'Section'),
  async (req, res, next) => {
    try {
      const section = await Section.findByPk(req.params.id);

      if (!section) {
        return res.status(404).json({
          success: false,
          message: 'Section not found'
        });
      }

      // Check if section has employees
      const employees = await Employee.count({ where: { sectionId: section.id } });
      if (employees > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete section with existing employees. Reassign employees first.'
        });
      }

      await section.destroy();

      res.json({
        success: true,
        message: 'Section deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/sections/bulk-upload
 * @desc    Bulk upload sections from Excel data
 * @access  Private (Admin only)
 * 
 * Expected Excel columns:
 * - name or Section Name -> name
 * - department or Department or Department Code -> matched to departmentId
 * - description or Description -> description (optional)
 */
router.post(
  '/bulk-upload',
  authenticate,
  requireRole('admin'),
  auditLog('BULK_CREATE', 'Section'),
  async (req, res, next) => {
    const transaction = await sequelize.transaction();
    
    try {
      const { sections, skipDuplicates = true } = req.body;

      if (!Array.isArray(sections) || sections.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Sections array is required and must not be empty'
        });
      }

      // Pre-fetch departments for name-to-ID mapping
      const allDepartments = await Department.findAll();
      const departmentMap = {};
      allDepartments.forEach(d => {
        departmentMap[d.name.toUpperCase()] = d.id;
        departmentMap[d.code.toUpperCase()] = d.id;
      });

      const results = {
        created: [],
        skipped: [],
        errors: []
      };

      for (let i = 0; i < sections.length; i++) {
        const row = sections[i];
        const rowNum = i + 2; // Excel row (1-indexed + header)

        try {
          // Map Excel columns to model fields
          const name = row.name || row['Section Name'] || row['Section'] || row['NAME'];
          const deptRef = row.department || row['Department'] || row['Department Code'] || row['DEPARTMENT'] || row.departmentCode;
          const description = row.description || row['Description'] || row['DESCRIPTION'];

          // Validate required fields
          if (!name) {
            results.errors.push({ row: rowNum, error: 'Section name is required' });
            continue;
          }
          if (!deptRef) {
            results.errors.push({ row: rowNum, name, error: 'Department is required' });
            continue;
          }

          // Resolve department ID
          let departmentId = row.departmentId;
          if (!departmentId) {
            departmentId = departmentMap[deptRef.toString().toUpperCase()];
            if (!departmentId) {
              results.errors.push({ 
                row: rowNum, 
                name, 
                error: `Department not found: "${deptRef}"` 
              });
              continue;
            }
          }

          // Check for duplicate section in same department
          const existing = await Section.findOne({ 
            where: { 
              name: { [Op.iLike]: name },
              departmentId 
            },
            transaction 
          });
          
          if (existing) {
            if (skipDuplicates) {
              results.skipped.push({ row: rowNum, name, reason: 'Already exists in department' });
              continue;
            } else {
              results.errors.push({ row: rowNum, name, error: 'Section already exists in department' });
              continue;
            }
          }

          // Create section
          const section = await Section.create({
            name: name.trim(),
            departmentId,
            description: description ? description.trim() : null
          }, { transaction });

          const dept = allDepartments.find(d => d.id === departmentId);
          results.created.push({
            row: rowNum,
            id: section.id,
            name: section.name,
            department: dept ? dept.name : departmentId
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
        message: `Created ${results.created.length} sections, skipped ${results.skipped.length}, ${results.errors.length} errors`,
        data: results
      });
    } catch (error) {
      await transaction.rollback();
      next(error);
    }
  }
);

module.exports = router;
