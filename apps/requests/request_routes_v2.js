const express = require('express');
const router = express.Router();
const { Request, RequestItem, Employee, User, PPEItem, Section, Department, Allocation, Stock } = require('../../models');
const { authenticate } = require('../../middlewares/auth_middleware');
const { authorize } = require('../../middlewares/role_middleware');
const { auditLog } = require('../../middlewares/audit_middleware');
const { Op } = require('sequelize');
const { sequelize } = require('../../database/db');

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
    const { status, requestType, employeeId, sectionId, departmentId, ppeItemId, page = 1, limit = 50 } = req.query;
    const userRole = req.user.role.name;
    const offset = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (requestType) where.requestType = requestType;
    if (employeeId) where.employeeId = employeeId;

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
      { model: User, as: 'createdBy', attributes: ['id', 'username', 'firstName', 'lastName'] },
      { model: User, as: 'sectionRepApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
      { model: User, as: 'deptRepApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
      { model: User, as: 'hodApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
      { model: User, as: 'storesApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
      { model: User, as: 'fulfilledBy', attributes: ['id', 'username', 'firstName', 'lastName'] },
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
      where['$targetEmployee.section.department_id$'] = req.user.departmentId;
    } else if (userRole === 'hod-hos' && req.user.departmentId) {
      // HOD sees requests from their department that need their approval
      where.status = { [Op.in]: ['hod-review', 'stores-review', 'approved', 'fulfilled'] };
      where['$targetEmployee.section.department_id$'] = req.user.departmentId;
    } else if (userRole === 'stores') {
      // Stores sees all requests that reached stores stage
      where.status = { [Op.in]: ['stores-review', 'approved', 'fulfilled'] };
    }

    // Filter by section or department via employee
    if (sectionId) {
      where['$targetEmployee.section_id$'] = sectionId;
    }
    if (departmentId) {
      where['$targetEmployee.section.department_id$'] = departmentId;
    }

    // Filter by PPE item via request items
    if (ppeItemId) {
      where['$items.ppe_item_id$'] = ppeItemId;
    }

    const { count, rows: requests } = await Request.findAndCountAll({
      where,
      include,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
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
 * @route   PUT /api/v1/requests/:id/sheq-approve
 * @desc    SHEQ Manager approves replacement request
 * @access  Private (SHEQ only)
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

    if (request.requestType !== 'replacement') {
      return res.status(400).json({
        success: false,
        message: 'SHEQ approval is only applicable to replacement requests'
      });
    }

    if (request.status !== 'sheq-review') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve request with status: ${request.status}`
      });
    }

    await request.update({
      status: 'hod-review',
      sheqApprovalDate: new Date(),
      sheqApproverId: req.user.id,
      sheqComment: comment
    });

    const updatedRequest = await Request.findByPk(request.id, {
      include: [
        { model: Employee, as: 'targetEmployee', include: [{ model: Section, as: 'section', include: [{ model: Department, as: 'department' }] }] },
        { model: User, as: 'createdBy', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: User, as: 'sectionRepApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: User, as: 'deptRepApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: User, as: 'hodApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: User, as: 'storesApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: RequestItem, as: 'items', include: [{ model: PPEItem, as: 'ppeItem' }] }
      ]
    });

    res.json({
      success: true,
      message: 'Request approved by SHEQ and forwarded to Head of Department',
      data: updatedRequest
    });
  } catch (error) {
    console.error('Error approving request by SHEQ:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve request by SHEQ',
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
        { model: User, as: 'createdBy', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: User, as: 'sectionRepApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: User, as: 'deptRepApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: User, as: 'hodApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: User, as: 'storesApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: User, as: 'fulfilledBy', attributes: ['id', 'username', 'firstName', 'lastName'] },
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
    const { employeeId, items: bodyItems, requestReason, requestType = 'replacement' } = req.body;

    // For emergency/visitor issues, allow a special visitor employee profile to be used.
    // For normal flows, employeeId must be a valid employee.
    let employee = null;
    if (employeeId) {
      employee = await Employee.findByPk(employeeId);
    }

    if (!employee) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Employee (or visitor profile) not found'
      });
    }

    let items = bodyItems || [];

    // For new employee issues, auto-populate from job title PPE matrix if items not provided
    if (requestType === 'new' && (!items || items.length === 0)) {
      const matrixEntries = await JobTitlePPEMatrix.findAll({
        where: { jobTitle: employee.jobTitle, isActive: true }
      });

      items = matrixEntries.map(entry => ({
        ppeItemId: entry.ppeItemId,
        quantity: entry.quantityRequired,
        size: null,
        reason: 'Initial issue from PPE matrix'
      }));
    }

    if (!items || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'At least one PPE item is required for the request'
      });
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

    // Eligibility rules
    const now = new Date();

    // Load matrix for employee for rules that depend on it
    const matrixEntries = await JobTitlePPEMatrix.findAll({
      where: { jobTitle: employee.jobTitle, isActive: true }
    });
    const matrixItemIds = new Set(matrixEntries.map(e => e.ppeItemId));

    // Replacement: requested items must be in matrix
    if (requestType === 'replacement') {
      const invalidItems = items.filter(i => !matrixItemIds.has(i.ppeItemId));
      if (invalidItems.length > 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Replacement requests can only contain PPE items from the employee PPE matrix',
          data: { invalidItemIds: invalidItems.map(i => i.ppeItemId) }
        });
      }
    }

    // Annual: ensure items are due based on last issue / renewal
    if (requestType === 'annual') {
      const allocations = await Allocation.findAll({
        where: { employeeId },
        order: [['issueDate', 'DESC']]
      });
      const latestByItem = {};
      for (const alloc of allocations) {
        if (!latestByItem[alloc.ppeItemId]) {
          latestByItem[alloc.ppeItemId] = alloc;
        }
      }

      const notDue = [];
      for (const item of items) {
        const latestAlloc = latestByItem[item.ppeItemId];
        if (!latestAlloc) {
          continue; // Never issued before, treat as due
        }
        const months = latestAlloc.replacementFrequency || 12;
        const due = new Date(latestAlloc.issueDate);
        due.setMonth(due.getMonth() + months);
        if (now < due) {
          notDue.push({
            ppeItemId: item.ppeItemId,
            lastIssueDate: latestAlloc.issueDate,
            nextDueDate: due
          });
        }
      }

      if (notDue.length > 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Annual request contains items that are not yet due',
          data: { notDue }
        });
      }
    }

    // Emergency: no additional eligibility restrictions (matrix or due dates)

    // Create request
    const request = await Request.create({
      employeeId,
      requestedById: req.user.id,
      comment: requestReason,
      requestType,
      status: 'pending'
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
        { model: User, as: 'createdBy', attributes: ['id', 'username', 'firstName', 'lastName'] },
        {
          model: RequestItem,
          as: 'items',
          include: [{ model: PPEItem, as: 'ppeItem' }]
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Request created successfully. Awaiting your approval to forward to Department Representative.',
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
    
    const request = await Request.findByPk(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.requestedById !== req.user.id && req.user.role.name !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only approve your own requests'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve request with status: ${request.status}`
      });
    }

    let nextStatus;
    if (request.requestType === 'replacement') {
      // Replacement: Section Rep -> SHEQ -> HOD -> Stores
      nextStatus = 'sheq-review';
    } else if (request.requestType === 'annual') {
      // Annual: Section Rep -> HOD -> Stores (skip dept-rep)
      nextStatus = 'hod-review';
    } else {
      // Default (e.g. new, emergency) keeps legacy dept-rep step
      nextStatus = 'dept-rep-review';
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
        { model: User, as: 'createdBy', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: User, as: 'sectionRepApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: RequestItem, as: 'items', include: [{ model: PPEItem, as: 'ppeItem' }] }
      ]
    });

    const message =
      nextStatus === 'sheq-review'
        ? 'Request approved and forwarded to SHEQ Manager'
        : nextStatus === 'hod-review'
        ? 'Request approved and forwarded to Head of Department'
        : 'Request approved and forwarded to Department Representative';

    res.json({
      success: true,
      message,
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
        { model: User, as: 'createdBy', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: User, as: 'sectionRepApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: User, as: 'deptRepApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
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
        { model: User, as: 'createdBy', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: User, as: 'sectionRepApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: User, as: 'deptRepApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: User, as: 'hodApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
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
        { model: User, as: 'createdBy', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: User, as: 'sectionRepApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: User, as: 'deptRepApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: User, as: 'hodApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: User, as: 'storesApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
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
        { model: User, as: 'createdBy', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: User, as: 'rejectedBy', attributes: ['id', 'username', 'firstName', 'lastName'] },
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
        { model: User, as: 'createdBy', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: User, as: 'sectionRepApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: User, as: 'deptRepApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: User, as: 'hodApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: User, as: 'storesApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: User, as: 'fulfilledBy', attributes: ['id', 'username', 'firstName', 'lastName'] },
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

module.exports = router;
