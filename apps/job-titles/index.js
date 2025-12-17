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
// @desc    Bulk create job titles from Excel upload
// @access  Private (Admin only)
router.post('/bulk', authenticate, adminOrStoresMiddleware, async (req, res, next) => {
  try {
    const { jobTitles, skipDuplicates = true } = req.body;

    if (!Array.isArray(jobTitles) || jobTitles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'jobTitles array is required'
      });
    }

    // Get all sections for name matching
    const allSections = await Section.findAll({
      include: [{ model: Department, as: 'department' }]
    });

    const results = {
      created: [],
      skipped: [],
      errors: []
    };

    for (const item of jobTitles) {
      try {
        const name = (item.name || item.Name || item['Job Title'] || '').toString().trim();
        const code = (item.code || item.Code || '').toString().trim();
        const description = (item.description || item.Description || '').toString().trim();
        const sectionName = (item.section || item.Section || item.SECTION || '').toString().trim();
        const departmentName = (item.department || item.Department || item['Cost centre'] || '').toString().trim();

        if (!name) {
          results.errors.push({
            data: item,
            error: 'Job title name is required'
          });
          continue;
        }

        if (!sectionName) {
          results.errors.push({
            data: item,
            error: 'Section name is required'
          });
          continue;
        }

        // Find section by name (and optionally by department)
        let section = null;
        if (departmentName) {
          // Try to match by both section name and department name
          section = allSections.find(s => 
            s.name.toLowerCase() === sectionName.toLowerCase() &&
            s.department?.name.toLowerCase() === departmentName.toLowerCase()
          );
        }
        
        // If not found with department, try just section name
        if (!section) {
          section = allSections.find(s => 
            s.name.toLowerCase() === sectionName.toLowerCase()
          );
        }

        if (!section) {
          results.errors.push({
            data: item,
            error: `Section "${sectionName}" not found${departmentName ? ` in department "${departmentName}"` : ''}`
          });
          continue;
        }

        // Check for existing job title with same name in same section
        const existing = await JobTitle.findOne({
          where: {
            name: { [Op.iLike]: name },
            sectionId: section.id
          }
        });

        if (existing) {
          if (skipDuplicates) {
            results.skipped.push({
              data: item,
              reason: `Job title "${name}" already exists in section "${section.name}"`
            });
            continue;
          } else {
            results.errors.push({
              data: item,
              error: `Job title "${name}" already exists in section "${section.name}"`
            });
            continue;
          }
        }

        // Create the job title
        const jobTitle = await JobTitle.create({
          name,
          code: code || null,
          description: description || null,
          sectionId: section.id,
          isActive: true
        });

        results.created.push({
          id: jobTitle.id,
          name: jobTitle.name,
          code: jobTitle.code,
          section: section.name,
          department: section.department?.name
        });

      } catch (itemError) {
        results.errors.push({
          data: item,
          error: itemError.message
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Bulk upload completed: ${results.created.length} created, ${results.skipped.length} skipped, ${results.errors.length} errors`,
      data: results
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
