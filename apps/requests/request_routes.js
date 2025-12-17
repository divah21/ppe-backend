const express = require('express');
const router = express.Router();
const { Request, RequestItem, Employee, User, PPEItem, Section, Department, Allocation, Stock, JobTitlePPEMatrix, JobTitle } = require('../../models');
const { authenticate } = require('../../middlewares/auth_middleware');
const { authorize } = require('../../middlewares/role_middleware');
const { auditLog } = require('../../middlewares/audit_middleware');
const { Op } = require('sequelize');
const { sequelize } = require('../../database/db');

// Helper function to include User with Employee name data
const userInclude = (alias) => ({
  model: User,
  as: alias,
  attributes: ['id', 'username'],
  include: [{ model: Employee, as: 'employee', attributes: ['firstName', 'lastName'] }]
});

/**
 * PPE REQUEST WORKFLOW:
 * 1. Section Rep creates request (status: 'pending')
 * 2. Section Rep reviews and approves own request (status: 'dept-rep-review')
 * 3. Dept Rep approves (status: 'hod-review')
 * 4. HOD approves (status: 'stores-review')
 * 5. Stores approves (status: 'approved')
 * 6. Stores fulfills request (status: 'fulfilled')
 * 
 * Any approver can reject at their stage (status: 'rejected')
 */

/**
 * @route   GET /api/v1/requests
 * @desc    Get all requests (filtered by role)
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { 
      status, 
      requestType, 
      employeeId, 
      sectionId, 
      departmentId, 
      ppeItemId,
      page = 1, 
      limit = 50 
    } = req.query;
    const userRole = req.user.role.name;
    const offset = (page - 1) * limit;

    const where = {};
    
    // Apply filters
    if (status) where.status = status;
    if (requestType) where.requestType = requestType;
    if (employeeId) where.employeeId = employeeId;
    if (sectionId) where.sectionId = sectionId;
    if (departmentId) where.departmentId = departmentId;

    // Role-based filtering
    let include = [
      {
        model: Employee,
        as: 'targetEmployee',
        include: [{
          model: Section,
          as: 'section',
          include: [{ model: Department, as: 'department' }]
        }]
      },
      { 
        model: User, 
        as: 'createdBy', 
        attributes: ['id', 'username'],
        include: [{ model: Employee, as: 'employee', attributes: ['firstName', 'lastName'] }]
      },
      { 
        model: User, 
        as: 'sectionRepApprover', 
        attributes: ['id', 'username'],
        include: [{ model: Employee, as: 'employee', attributes: ['firstName', 'lastName'] }]
      },
      { 
        model: User, 
        as: 'deptRepApprover', 
        attributes: ['id', 'username'],
        include: [{ model: Employee, as: 'employee', attributes: ['firstName', 'lastName'] }]
      },
      { 
        model: User, 
        as: 'hodApprover', 
        attributes: ['id', 'username'],
        include: [{ model: Employee, as: 'employee', attributes: ['firstName', 'lastName'] }]
      },
      { 
        model: User, 
        as: 'storesApprover', 
        attributes: ['id', 'username'],
        include: [{ model: Employee, as: 'employee', attributes: ['firstName', 'lastName'] }]
      },
      { 
        model: User, 
        as: 'fulfilledBy', 
        attributes: ['id', 'username'],
        include: [{ model: Employee, as: 'employee', attributes: ['firstName', 'lastName'] }]
      },
      {
        model: RequestItem,
        as: 'items',
        include: [{ model: PPEItem, as: 'ppeItem' }]
      }
    ];

    // Filter by role
    if (userRole === 'section-rep') {
      where.requestedById = req.user.id;
    } else if (userRole === 'department-rep' && req.user.departmentId) {
      // Dept Rep sees requests from their department that need their approval
      where.status = { [Op.in]: ['dept-rep-review', 'hod-review', 'stores-review', 'approved', 'fulfilled'] };
    } else if (userRole === 'hod-hos' && req.user.departmentId) {
      // HOD sees requests from their department that need their approval
      where.status = { [Op.in]: ['hod-review', 'stores-review', 'approved', 'fulfilled'] };
    } else if (userRole === 'stores') {
      // Stores sees all requests that reached stores stage
      where.status = { [Op.in]: ['stores-review', 'approved', 'fulfilled'] };
    }

    // PPE Item filter (requires filtering through RequestItems)
    let itemWhere = {};
    if (ppeItemId) {
      itemWhere.ppeItemId = ppeItemId;
    }

    const { count, rows: requests } = await Request.findAndCountAll({
      where,
      include: include.map(inc => {
        // Add where clause to items include if filtering by PPE item
        if (inc.as === 'items' && ppeItemId) {
          return { ...inc, where: itemWhere, required: true };
        }
        return inc;
      }),
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
      distinct: true // Important when filtering by associated table
    });

    res.json({
      success: true,
      data: requests,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch requests',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/requests/:id
 * @desc    Get request by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const request = await Request.findByPk(req.params.id, {
      include: [
        {
          model: Employee,
          as: 'targetEmployee',
          include: [{
            model: Section,
            as: 'section',
            include: [{ model: Department, as: 'department' }]
          }]
        },
        userInclude('createdBy'),
        userInclude('sectionRepApprover'),
        userInclude('deptRepApprover'),
        userInclude('hodApprover'),
        userInclude('storesApprover'),
        userInclude('fulfilledBy'),
        {
          model: RequestItem,
          as: 'items',
          include: [{ model: PPEItem, as: 'ppeItem' }]
        }
      ]
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('Error fetching request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch request',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/requests
 * @desc    Create new PPE request (Section Rep)
 * @access  Private (Section Rep only)
 */
router.post('/', authenticate, authorize(['section-rep', 'admin']), auditLog('CREATE', 'Request'), async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { employeeId, items, requestReason, requestType = 'replacement' } = req.body;

    // Special handling for emergency requests with visitor profile
    const isEmergencyVisitor = employeeId === 'visitor' || employeeId === 'emergency';

    let employee = null;
    if (!isEmergencyVisitor) {
      // Validate employee exists
      employee = await Employee.findByPk(employeeId, {
        include: [{ model: JobTitle, as: 'jobTitleRef' }]
      });
      
      if (!employee) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }
    }

    // Validate all PPE items exist
    const ppeItemIds = items.map(item => item.ppeItemId);
    const ppeItems = await PPEItem.findAll({
      where: { id: { [Op.in]: ppeItemIds } }
    });

    if (ppeItems.length !== ppeItemIds.length) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'One or more PPE items not found'
      });
    }

    // ELIGIBILITY VALIDATION based on request type
    if (!isEmergencyVisitor && employee) {
      
      // Get employee's PPE matrix (eligibility)
      const eligibility = await JobTitlePPEMatrix.findAll({
        where: { jobTitleId: employee.jobTitleId },
        include: [{ model: PPEItem, as: 'ppeItem' }]
      });

      const eligibleItemIds = eligibility.map(e => e.ppeItemId);

      // Get employee's current allocations
      const currentAllocations = await Allocation.findAll({
        where: { 
          employeeId,
          status: 'active'
        }
      });

      // Validate based on request type
      switch (requestType) {
        case 'annual':
          // Annual: Can only request when due based on last issue date
          for (const item of items) {
            // Check if item is in employee's matrix
            if (!eligibleItemIds.includes(item.ppeItemId)) {
              await transaction.rollback();
              return res.status(400).json({
                success: false,
                message: `Item is not in employee's PPE matrix for annual issue`
              });
            }

            // Check if item is due
            const allocation = currentAllocations.find(a => a.ppeItemId === item.ppeItemId);
            const matrixItem = eligibility.find(e => e.ppeItemId === item.ppeItemId);
            
            if (allocation) {
              const nextDueDate = new Date(allocation.nextRenewalDate);
              const today = new Date();
              
              if (today < nextDueDate) {
                const itemName = matrixItem?.ppeItemRef?.name || 'Unknown item';
                await transaction.rollback();
                return res.status(400).json({
                  success: false,
                  message: `${itemName} is not due yet. Next renewal date: ${nextDueDate.toLocaleDateString()}`
                });
              }
            }
          }
          break;

        case 'new':
          // New issue: No restrictions, typically auto-populated with full matrix
          // Already validated items exist above
          break;

        case 'replacement':
          // Replacement: Can request before due date, but only items in matrix
          for (const item of items) {
            if (!eligibleItemIds.includes(item.ppeItemId)) {
              await transaction.rollback();
              return res.status(400).json({
                success: false,
                message: 'Replacement items must be within employee\'s PPE matrix'
              });
            }
          }
          break;

        case 'emergency':
          // Emergency: No restrictions (handled by isEmergencyVisitor flag)
          break;

        default:
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'Invalid request type'
          });
      }
    }

    // Create request
    const request = await Request.create({
      employeeId: isEmergencyVisitor ? null : employeeId,
      requestedById: req.user.id,
      departmentId: req.user.departmentId,
      sectionId: req.user.sectionId,
      comment: requestReason,
      requestType,
      status: 'pending',
      isEmergencyVisitor: isEmergencyVisitor || false
    }, { transaction });

    // Create request items
    await Promise.all(
      items.map(item =>
        RequestItem.create({
          requestId: request.id,
          ppeItemId: item.ppeItemId,
          quantity: item.quantity,
          size: item.size,
          reason: item.reason
        }, { transaction })
      )
    );

    await transaction.commit();

    // Fetch created request with relations
    const createdRequest = await Request.findByPk(request.id, {
      include: [
        {
          model: Employee,
          as: 'targetEmployee',
          include: [{
            model: Section,
            as: 'section',
            include: [{ model: Department, as: 'department' }]
          }]
        },
        userInclude('createdBy'),
        {
          model: RequestItem,
          as: 'items',
          include: [{ model: PPEItem, as: 'ppeItem' }]
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Request created successfully. Awaiting your approval to forward.',
      data: createdRequest
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create request',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/v1/requests/:id/section-rep-approve
 * @desc    Section Rep approves their own request
 * @access  Private (Section Rep only)
 */
router.put('/:id/section-rep-approve', authenticate, authorize(['section-rep', 'admin']), auditLog('UPDATE', 'Request'), async (req, res) => {
  try {
    const { comment } = req.body;
    
    const request = await Request.findByPk(req.params.id, {
      include: [
        { model: Employee, as: 'targetEmployee' },
        { model: User, as: 'createdBy', attributes: ['id', 'sectionId'] }
      ]
    });
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // Section rep/supervisor should be able to approve requests from their section
    // The workflow is: Section Rep creates → Section Supervisor approves → HOD/SHEQ
    if (req.user.role.name !== 'admin') {
      // Check if user is from the same section as the requester
      const requesterSectionId = request.createdBy?.sectionId || request.sectionId;
      
      if (req.user.sectionId !== requesterSectionId) {
        return res.status(403).json({
          success: false,
          message: 'You can only approve requests from your section'
        });
      }
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve request with status: ${request.status}`
      });
    }

    // Determine next status based on request type
    let nextStatus;
    let successMessage;
    
    switch (request.requestType) {
      case 'replacement':
        // Replacement: Section Rep → SHEQ Manager
        nextStatus = 'sheq-review';
        successMessage = 'Request approved and forwarded to SHEQ Manager';
        break;
      
      case 'annual':
      case 'new':
      case 'emergency':
      default:
        // Annual/New/Emergency: Section Rep → HOD (skipping Dept Rep for now)
        nextStatus = 'hod-review';
        successMessage = 'Request approved and forwarded to Head of Department';
        break;
    }

    await request.update({
      status: nextStatus,
      sectionRepApprovalDate: new Date(),
      sectionRepApproverId: req.user.id,
      sectionRepComment: comment
    });

    const updatedRequest = await Request.findByPk(request.id, {
      include: [
        { model: Employee, as: 'targetEmployee', include: [{ model: Section, as: 'section', include: [{ model: Department, as: 'department' }] }] },
        userInclude('createdBy'),
        userInclude('sectionRepApprover'),
        { model: RequestItem, as: 'items', include: [{ model: PPEItem, as: 'ppeItem' }] }
      ]
    });

    res.json({
      success: true,
      message: successMessage,
      data: updatedRequest
    });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve request',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/v1/requests/:id/dept-rep-approve
 * @desc    Dept Rep approves request
 * @access  Private (Dept Rep only)
 */
router.put('/:id/dept-rep-approve', authenticate, authorize(['department-rep', 'admin']), auditLog('UPDATE', 'Request'), async (req, res) => {
  try {
    const { comment } = req.body;
    
    const request = await Request.findByPk(req.params.id, {
      include: [{ model: Employee, as: 'targetEmployee', include: [{ model: Section, as: 'section' }] }]
    });
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.status !== 'dept-rep-review') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve request with status: ${request.status}`
      });
    }

    await request.update({
      status: 'hod-review',
      deptRepApprovalDate: new Date(),
      deptRepApproverId: req.user.id,
      deptRepComment: comment
    });

    const updatedRequest = await Request.findByPk(request.id, {
      include: [
        { model: Employee, as: 'targetEmployee', include: [{ model: Section, as: 'section', include: [{ model: Department, as: 'department' }] }] },
        userInclude('createdBy'),
        userInclude('sectionRepApprover'),
        userInclude('deptRepApprover'),
        { model: RequestItem, as: 'items', include: [{ model: PPEItem, as: 'ppeItem' }] }
      ]
    });

    res.json({
      success: true,
      message: 'Request approved and forwarded to Head of Department',
      data: updatedRequest
    });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve request',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/v1/requests/:id/hod-approve
 * @desc    HOD approves request
 * @access  Private (HOD only)
 */
router.put('/:id/hod-approve', authenticate, authorize(['hod-hos', 'admin']), auditLog('UPDATE', 'Request'), async (req, res) => {
  try {
    const { comment } = req.body;
    
    const request = await Request.findByPk(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.status !== 'hod-review') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve request with status: ${request.status}`
      });
    }

    await request.update({
      status: 'stores-review',
      hodApprovalDate: new Date(),
      hodApproverId: req.user.id,
      hodComment: comment
    });

    const updatedRequest = await Request.findByPk(request.id, {
      include: [
        { model: Employee, as: 'targetEmployee', include: [{ model: Section, as: 'section', include: [{ model: Department, as: 'department' }] }] },
        userInclude('createdBy'),
        userInclude('sectionRepApprover'),
        userInclude('deptRepApprover'),
        userInclude('hodApprover'),
        { model: RequestItem, as: 'items', include: [{ model: PPEItem, as: 'ppeItem' }] }
      ]
    });

    res.json({
      success: true,
      message: 'Request approved and forwarded to Stores',
      data: updatedRequest
    });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve request',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/v1/requests/:id/sheq-approve
 * @desc    SHEQ Manager approves replacement request
 * @access  Private (SHEQ Manager only)
 */
router.put('/:id/sheq-approve', authenticate, authorize(['sheq', 'admin']), auditLog('UPDATE', 'Request'), async (req, res) => {
  try {
    const { comment } = req.body;
    
    const request = await Request.findByPk(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.status !== 'sheq-review') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve request with status: ${request.status}. Must be in sheq-review status.`
      });
    }

    // After SHEQ approval for replacement requests, go to HOD
    await request.update({
      status: 'hod-review',
      sheqApprovalDate: new Date(),
      sheqApproverId: req.user.id,
      sheqComment: comment
    });

    const updatedRequest = await Request.findByPk(request.id, {
      include: [
        { model: Employee, as: 'targetEmployee', include: [{ model: Section, as: 'section', include: [{ model: Department, as: 'department' }] }] },
        userInclude('createdBy'),
        userInclude('sectionRepApprover'),
        userInclude('sheqApprover'),
        { model: RequestItem, as: 'items', include: [{ model: PPEItem, as: 'ppeItem' }] }
      ]
    });

    res.json({
      success: true,
      message: 'Request approved by SHEQ and forwarded to Head of Department',
      data: updatedRequest
    });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve request',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/v1/requests/:id/stores-approve
 * @desc    Stores approves request
 * @access  Private (Stores only)
 */
router.put('/:id/stores-approve', authenticate, authorize(['stores', 'admin']), auditLog('UPDATE', 'Request'), async (req, res) => {
  try {
    const { comment } = req.body;
    
    const request = await Request.findByPk(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.status !== 'stores-review') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve request with status: ${request.status}`
      });
    }

    await request.update({
      status: 'approved',
      storesApprovalDate: new Date(),
      storesApproverId: req.user.id,
      storesComment: comment
    });

    const updatedRequest = await Request.findByPk(request.id, {
      include: [
        { model: Employee, as: 'targetEmployee', include: [{ model: Section, as: 'section', include: [{ model: Department, as: 'department' }] }] },
        userInclude('createdBy'),
        userInclude('sectionRepApprover'),
        userInclude('deptRepApprover'),
        userInclude('hodApprover'),
        userInclude('storesApprover'),
        { model: RequestItem, as: 'items', include: [{ model: PPEItem, as: 'ppeItem' }] }
      ]
    });

    res.json({
      success: true,
      message: 'Request approved. Ready for fulfillment.',
      data: updatedRequest
    });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve request',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/v1/requests/:id/reject
 * @desc    Reject request (at any approval stage)
 * @access  Private
 */
router.put('/:id/reject', authenticate, auditLog('UPDATE', 'Request'), async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    
    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const request = await Request.findByPk(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (['rejected', 'fulfilled', 'cancelled'].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot reject request with status: ${request.status}`
      });
    }

    await request.update({
      status: 'rejected',
      rejectionReason,
      rejectedById: req.user.id,
      rejectedAt: new Date()
    });

    const updatedRequest = await Request.findByPk(request.id, {
      include: [
        { model: Employee, as: 'targetEmployee', include: [{ model: Section, as: 'section', include: [{ model: Department, as: 'department' }] }] },
        userInclude('createdBy'),
        userInclude('rejectedBy'),
        { model: RequestItem, as: 'items', include: [{ model: PPEItem, as: 'ppeItem' }] }
      ]
    });

    res.json({
      success: true,
      message: 'Request rejected',
      data: updatedRequest
    });
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject request',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/v1/requests/:id/fulfill
 * @desc    Fulfill approved request (create allocations)
 * @access  Private (Stores only)
 */
router.put('/:id/fulfill', authenticate, authorize(['stores', 'admin']), auditLog('UPDATE', 'Request'), async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { fulfillmentNote } = req.body;
    
    const request = await Request.findByPk(req.params.id, {
      include: [
        { model: Employee, as: 'targetEmployee' },
        { model: RequestItem, as: 'items', include: [{ model: PPEItem, as: 'ppeItem' }] }
      ]
    });
    
    if (!request) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.status !== 'approved') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot fulfill request with status: ${request.status}. Request must be approved first.`
      });
    }

    // Create allocations for each request item
    const allocations = await Promise.all(
      request.items.map(async (item) => {
        // Check stock availability
        const stock = await Stock.findOne({
          where: { ppeItemId: item.ppeItemId },
          transaction
        });

        if (!stock || stock.quantity < item.quantity) {
          throw new Error(`Insufficient stock for ${item.ppeItem.name}. Available: ${stock?.quantity || 0}, Required: ${item.quantity}`);
        }

        // Get item cost
        const unitCost = parseFloat(stock.unitPriceUSD || 0);
        const totalCost = unitCost * item.quantity;

        // Calculate renewal date (example: 12 months)
        const renewalMonths = item.ppeItem.renewalFrequency || 12;
        const nextRenewalDate = new Date();
        nextRenewalDate.setMonth(nextRenewalDate.getMonth() + renewalMonths);

        // Create allocation
        const allocation = await Allocation.create({
          employeeId: request.employeeId,
          ppeItemId: item.ppeItemId,
          quantity: item.quantity,
          size: item.size,
          unitCost,
          totalCost,
          issueDate: new Date(),
          nextRenewalDate,
          expiryDate: nextRenewalDate,
          allocationType: request.requestType,
          status: 'active',
          replacementFrequency: renewalMonths,
          notes: `Allocated from request #${request.id.slice(0, 8)}`
        }, { transaction });

        // Update stock quantity
        await stock.update({
          quantity: stock.quantity - item.quantity
        }, { transaction });

        return allocation;
      })
    );

    // Update request status
    await request.update({
      status: 'fulfilled',
      fulfilledDate: new Date(),
      fulfilledByUserId: req.user.id,
      storesComment: fulfillmentNote || request.storesComment
    }, { transaction });

    await transaction.commit();

    const updatedRequest = await Request.findByPk(request.id, {
      include: [
        { model: Employee, as: 'targetEmployee', include: [{ model: Section, as: 'section', include: [{ model: Department, as: 'department' }] }] },
        userInclude('createdBy'),
        userInclude('sectionRepApprover'),
        userInclude('deptRepApprover'),
        userInclude('hodApprover'),
        userInclude('storesApprover'),
        userInclude('fulfilledBy'),
        { model: RequestItem, as: 'items', include: [{ model: PPEItem, as: 'ppeItem' }] }
      ]
    });

    res.json({
      success: true,
      message: `Request fulfilled successfully. ${allocations.length} allocation(s) created.`,
      data: updatedRequest,
      allocations: allocations.map(a => a.id)
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error fulfilling request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fulfill request',
      error: error.message
    });
  }
});

// Cancel request (Section Rep can cancel their own pending requests)
router.put('/:id/cancel', authenticate, authorize(['section-rep', 'admin']), auditLog('UPDATE', 'Request'), async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellationReason } = req.body;

    const request = await Request.findByPk(id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // Only pending requests can be cancelled
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending requests can be cancelled'
      });
    }

    // Section rep can only cancel their own requests
    if (req.user.role.name === 'section-rep' && request.createdByUserId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own requests'
      });
    }

    await request.update({
      status: 'cancelled',
      rejectionReason: cancellationReason || 'Cancelled by requester',
      rejectionDate: new Date(),
      rejectedByUserId: req.user.id
    });

    const updatedRequest = await Request.findByPk(request.id, {
      include: [
        { model: Employee, as: 'targetEmployee' },
        userInclude('createdBy')
      ]
    });

    res.json({
      success: true,
      message: 'Request cancelled successfully',
      data: updatedRequest
    });
  } catch (error) {
    console.error('Error cancelling request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel request',
      error: error.message
    });
  }
});

// Delete request (Section Rep can delete their own pending requests)
router.delete('/:id', authenticate, authorize(['section-rep', 'admin']), auditLog('DELETE', 'Request'), async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;

    const request = await Request.findByPk(id);
    
    if (!request) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Request not found. It may have already been deleted.'
      });
    }

    // Only pending requests can be deleted
    if (request.status !== 'pending') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Only pending requests can be deleted'
      });
    }

    // Section rep can only delete their own requests
    if (req.user.role.name === 'section-rep' && request.createdByUserId !== req.user.id) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own requests'
      });
    }

    // Delete request items first
    await RequestItem.destroy({
      where: { requestId: id },
      transaction
    });

    // Delete the request
    await request.destroy({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Request deleted successfully',
      data: { id }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete request',
      error: error.message
    });
  }
});

module.exports = router;
