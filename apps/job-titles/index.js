const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { JobTitle, Section, Department, Employee } = require('../../models');
const { authenticate } = require('../../middlewares/auth_middleware');
const { adminOrStoresMiddleware } = require('../../middlewares/role_middleware');

// @route   GET /api/v1/job-titles
// @desc    Get all job titles with optional filtering
// @access  Private
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { sectionId, departmentId, isActive, search, limit, offset } = req.query;

    const where = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }

    const include = [
      {
        model: Section,
        as: 'section',
        attributes: ['id', 'name', 'code', 'departmentId'],
        include: [
          {
            model: Department,
            as: 'department',
            attributes: ['id', 'name', 'code']
          }
        ]
      }
    ];

    // Filter by section
    if (sectionId) {
      where.sectionId = sectionId;
    }

    // Filter by department (through section)
    if (departmentId && !sectionId) {
      include[0].where = { departmentId };
      include[0].required = true;
    }

    const query = {
      where,
      include,
      order: [['name', 'ASC']],
    };

    if (limit) {
      query.limit = parseInt(limit);
      query.offset = parseInt(offset) || 0;
    }

    const jobTitles = await JobTitle.findAndCountAll(query);

    // Add employee count for each job title
    const jobTitlesWithCount = await Promise.all(
      jobTitles.rows.map(async (jobTitle) => {
        const employeeCount = await Employee.count({
          where: { jobTitleId: jobTitle.id }
        });
        return {
          ...jobTitle.toJSON(),
          employeeCount
        };
      })
    );

    res.json({
      success: true,
      data: jobTitlesWithCount,
      total: jobTitles.count,
      limit: limit ? parseInt(limit) : jobTitles.count,
      offset: offset ? parseInt(offset) : 0
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/v1/job-titles/:id
// @desc    Get single job title by ID
// @access  Private
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const jobTitle = await JobTitle.findByPk(req.params.id, {
      include: [
        {
          model: Section,
          as: 'section',
          include: [
            {
              model: Department,
              as: 'department'
            }
          ]
        }
      ]
    });

    if (!jobTitle) {
      return res.status(404).json({
        success: false,
        message: 'Job title not found'
      });
    }

    // Get employee count
    const employeeCount = await Employee.count({
      where: { jobTitleId: jobTitle.id }
    });

    res.json({
      success: true,
      data: {
        ...jobTitle.toJSON(),
        employeeCount
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/v1/job-titles/section/:sectionId
// @desc    Get all job titles for a specific section
// @access  Private
router.get('/section/:sectionId', authenticate, async (req, res, next) => {
  try {
    const jobTitles = await JobTitle.findAll({
      where: { 
        sectionId: req.params.sectionId,
        isActive: true 
      },
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: jobTitles
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/v1/job-titles
// @desc    Create new job title
// @access  Private (Admin only)
router.post('/', authenticate, adminOrStoresMiddleware, async (req, res, next) => {
  try {
    const { name, code, description, sectionId, isActive } = req.body;

    // Validate required fields
    if (!name || !sectionId) {
      return res.status(400).json({
        success: false,
        message: 'Name and sectionId are required'
      });
    }

    // Check if section exists
    const section = await Section.findByPk(sectionId);
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }

    // Check for duplicate job title in the same section
    const existing = await JobTitle.findOne({
      where: { name, sectionId }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Job title with this name already exists in this section'
      });
    }

    const jobTitle = await JobTitle.create({
      name,
      code,
      description,
      sectionId,
      isActive: isActive !== undefined ? isActive : true
    });

    const createdJobTitle = await JobTitle.findByPk(jobTitle.id, {
      include: [
        {
          model: Section,
          as: 'section',
          include: [{ model: Department, as: 'department' }]
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Job title created successfully',
      data: createdJobTitle
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/v1/job-titles/:id
// @desc    Update job title
// @access  Private (Admin only)
router.put('/:id', authenticate, adminOrStoresMiddleware, async (req, res, next) => {
  try {
    const { name, code, description, sectionId, isActive } = req.body;

    const jobTitle = await JobTitle.findByPk(req.params.id);

    if (!jobTitle) {
      return res.status(404).json({
        success: false,
        message: 'Job title not found'
      });
    }

    // Check for duplicate name in section if name or section is being changed
    if ((name && name !== jobTitle.name) || (sectionId && sectionId !== jobTitle.sectionId)) {
      const existing = await JobTitle.findOne({
        where: { 
          name: name || jobTitle.name, 
          sectionId: sectionId || jobTitle.sectionId 
        }
      });

      if (existing && existing.id !== jobTitle.id) {
        return res.status(409).json({
          success: false,
          message: 'Job title with this name already exists in this section'
        });
      }
    }

    await jobTitle.update({
      name: name || jobTitle.name,
      code: code !== undefined ? code : jobTitle.code,
      description: description !== undefined ? description : jobTitle.description,
      sectionId: sectionId || jobTitle.sectionId,
      isActive: isActive !== undefined ? isActive : jobTitle.isActive
    });

    const updatedJobTitle = await JobTitle.findByPk(jobTitle.id, {
      include: [
        {
          model: Section,
          as: 'section',
          include: [{ model: Department, as: 'department' }]
        }
      ]
    });

    res.json({
      success: true,
      message: 'Job title updated successfully',
      data: updatedJobTitle
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/v1/job-titles/:id
// @desc    Delete job title
// @access  Private (Admin only)
router.delete('/:id', authenticate, adminOrStoresMiddleware, async (req, res, next) => {
  try {
    const jobTitle = await JobTitle.findByPk(req.params.id);

    if (!jobTitle) {
      return res.status(404).json({
        success: false,
        message: 'Job title not found'
      });
    }

    // Check if job title is in use
    const employeeCount = await Employee.count({
      where: { jobTitleId: jobTitle.id }
    });

    if (employeeCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete job title. It is assigned to ${employeeCount} employee(s). Consider deactivating it instead.`
      });
    }

    await jobTitle.destroy();

    res.json({
      success: true,
      message: 'Job title deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/v1/job-titles/bulk
// @desc    Bulk create job titles
// @access  Private (Admin only)
router.post('/bulk', authenticate, adminOrStoresMiddleware, async (req, res, next) => {
  try {
    const { jobTitles } = req.body;

    if (!Array.isArray(jobTitles) || jobTitles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'jobTitles array is required'
      });
    }

    const created = await JobTitle.bulkCreate(jobTitles, {
      validate: true,
      ignoreDuplicates: true
    });

    res.status(201).json({
      success: true,
      message: `${created.length} job titles created successfully`,
      data: created
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
