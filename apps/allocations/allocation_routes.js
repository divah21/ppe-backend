const express = require('express');
const router = express.Router();
const { Allocation, Employee, PPEItem, User, Request, RequestItem, Stock, Section } = require('../../models');
const { authenticate } = require('../../middlewares/auth_middleware');
const { requireRole } = require('../../middlewares/role_middleware');
const { auditLog } = require('../../middlewares/audit_middleware');
const { Op } = require('sequelize');
const db = require('../../database/db');

/**
 * @route   GET /api/v1/allocations
 * @desc    Get all allocations
 * @access  Private
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const {
      employeeId,
      ppeItemId,
      status,
      fromDate,
      toDate,
      renewalDue,
      departmentId,
      sectionId,
      page = 1,
      limit = 50
    } = req.query;

    const where = {};
    const employeeWhere = {};
    
    if (employeeId) where.employeeId = employeeId;
    if (ppeItemId) where.ppeItemId = ppeItemId;
    if (status) where.status = status;
    if (fromDate) where.issueDate = { [Op.gte]: new Date(fromDate) };
    if (toDate) {
      where.issueDate = {
        ...where.issueDate,
        [Op.lte]: new Date(toDate)
      };
    }

    // Filter by department or section via employee
    if (departmentId) {
      employeeWhere['$employee.section.department_id$'] = departmentId;
    }
    if (sectionId) {
      employeeWhere['$employee.section_id$'] = sectionId;
    }

    // Filter by renewal due date
    if (renewalDue) {
      const daysAhead = parseInt(renewalDue);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      
      where.nextRenewalDate = {
        [Op.lte]: futureDate,
        [Op.gte]: new Date()
      };
      where.status = 'active';
    }

    const offset = (page - 1) * limit;

    const { count, rows: allocations } = await Allocation.findAndCountAll({
      where: { ...where, ...employeeWhere },
      include: [
        { 
          model: Employee, 
          as: 'employee',
          include: [
            { model: Section, as: 'section' }
          ]
        },
        { model: PPEItem, as: 'ppeItem' },
        { model: User, as: 'issuedBy', attributes: ['id', 'username', 'firstName', 'lastName'] }
      ],
      limit: parseInt(limit),
      offset,
      order: [['issueDate', 'DESC']]
    });

    res.json({
      success: true,
      data: allocations,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/allocations/renewals
 * @desc    Get allocations due for renewal
 * @access  Private (Stores)
 */
router.get('/renewals', authenticate, requireRole('stores', 'admin'), async (req, res, next) => {
  try {
    const { daysAhead = 30 } = req.query;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(daysAhead));

    const allocations = await Allocation.findAll({
      where: {
        status: 'active',
        nextRenewalDate: {
          [Op.lte]: futureDate,
          [Op.gte]: new Date()
        }
      },
      include: [
        { model: Employee, as: 'employee' },
        { model: PPEItem, as: 'ppeItem' },
        { model: User, as: 'issuedBy', attributes: ['id', 'username', 'firstName', 'lastName'] }
      ],
      order: [['nextRenewalDate', 'ASC']]
    });

    res.json({
      success: true,
      data: allocations,
      meta: {
        daysAhead: parseInt(daysAhead),
        count: allocations.length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/allocations/fulfill/:requestId
 * @desc    Fulfill request and create allocations
 * @access  Private (Stores only)
 */
router.post(
  '/fulfill/:requestId',
  authenticate,
  requireRole('stores', 'admin'),
  auditLog('CREATE', 'Allocation'),
  async (req, res, next) => {
    const transaction = await db.sequelize.transaction();

    try {
      const { requestId } = req.params;
      const { allocations: allocationData } = req.body;

      // Get request with items
      const request = await Request.findByPk(requestId, {
        include: [
          { model: Employee, as: 'targetEmployee', include: [{ model: Section, as: 'section' }] },
          {
            model: RequestItem,
            as: 'items',
            include: [{ model: PPEItem, as: 'ppeItem' }]
          }
        ]
      });

      if (!request) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Request not found'
        });
      }

      // Allow fulfillment for requests that are approved by stores (legacy 'approved')
      const currentStatus = (request.status || '').toString().toLowerCase();
      const allowed = ['approved'];
      if (!allowed.includes(currentStatus)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Request must be '${allowed[0]}' before fulfillment. Current status: ${request.status}`
        });
      }

      const createdAllocations = [];

      // Process each allocation
      for (const allocItem of allocationData) {
        const requestItem = request.items.find(ri => ri.id === allocItem.requestItemId);
        
        if (!requestItem) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Request item ${allocItem.requestItemId} not found`
          });
        }

        // Check stock availability (including size if applicable)
        const requestedSize = allocItem.size || requestItem.size;
        const stockWhere = { ppeItemId: requestItem.ppeItemId };
        
        // Only add size constraint if the item has size variants and a size is specified
        if (requestItem.ppeItem.hasSizeVariants && requestedSize) {
          stockWhere.size = requestedSize;
        } else if (!requestItem.ppeItem.hasSizeVariants) {
          // For non-sized items, ensure we get stock with no size specified
          stockWhere.size = null;
        }
        
        const stock = await Stock.findOne({ where: stockWhere });

        if (!stock || stock.quantity < allocItem.quantity) {
          await transaction.rollback();
          const sizeInfo = requestedSize ? ` (size: ${requestedSize})` : '';
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${requestItem.ppeItem.name}${sizeInfo}. Available: ${stock ? stock.quantity : 0}, Requested: ${allocItem.quantity}`
          });
        }

        // Calculate next renewal date
        const issueDate = new Date();
        const nextRenewalDate = new Date(issueDate);
        nextRenewalDate.setMonth(nextRenewalDate.getMonth() + requestItem.ppeItem.replacementFrequency);

        // Create allocation
        const allocation = await Allocation.create({
          employeeId: request.employeeId,
          ppeItemId: requestItem.ppeItemId,
          requestId: request.id,
          issuedById: req.user.id,
          quantity: allocItem.quantity,
          size: allocItem.size || requestItem.size,
          issueDate,
          nextRenewalDate,
          status: 'active',
          totalCost: stock.unitCost * allocItem.quantity
        }, { transaction });

        // Update stock
        await stock.update({
          quantity: stock.quantity - allocItem.quantity
        }, { transaction });

        // Update request item approved quantity
        await requestItem.update({
          approvedQuantity: allocItem.quantity
        }, { transaction });

        createdAllocations.push(allocation);
      }

      // Mark request as completed
      await request.update({
        status: 'completed',
        completedDate: new Date()
      }, { transaction });

      await transaction.commit();

      // Get allocations with relations
      const fullAllocations = await Allocation.findAll({
        where: { id: createdAllocations.map(a => a.id) },
        include: [
          { model: Employee, as: 'employee' },
          { model: PPEItem, as: 'ppeItem' },
          { model: User, as: 'issuedBy', attributes: ['id', 'username', 'firstName', 'lastName'] }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Request fulfilled successfully',
        data: fullAllocations
      });
    } catch (error) {
      await transaction.rollback();
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/allocations/:id/return
 * @desc    Return PPE allocation
 * @access  Private (Stores)
 */
router.put(
  '/:id/return',
  authenticate,
  requireRole('stores', 'admin'),
  auditLog('UPDATE', 'Allocation'),
  async (req, res, next) => {
    const transaction = await db.sequelize.transaction();

    try {
      const { returnReason, condition } = req.body;

      const allocation = await Allocation.findByPk(req.params.id);

      if (!allocation) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Allocation not found'
        });
      }

      if (allocation.status === 'returned') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Allocation already returned'
        });
      }

      // Update allocation
      await allocation.update({
        status: 'returned',
        returnDate: new Date(),
        returnReason,
        condition
      }, { transaction });

      // If returned in good condition, add back to stock
      if (condition === 'good' || condition === 'fair') {
        const stock = await Stock.findOne({
          where: { ppeItemId: allocation.ppeItemId }
        });

        if (stock) {
          await stock.update({
            quantity: stock.quantity + allocation.quantity
          }, { transaction });
        }
      }

      await transaction.commit();

      const updatedAllocation = await Allocation.findByPk(allocation.id, {
        include: [
          { model: Employee, as: 'employee' },
          { model: PPEItem, as: 'ppeItem' },
          { model: User, as: 'issuedBy', attributes: ['id', 'username', 'firstName', 'lastName'] }
        ]
      });

      res.json({
        success: true,
        message: 'Allocation returned successfully',
        data: updatedAllocation
      });
    } catch (error) {
      await transaction.rollback();
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/allocations/:id/renew
 * @desc    Renew PPE allocation
 * @access  Private (Stores)
 */
router.put(
  '/:id/renew',
  authenticate,
  requireRole('stores', 'admin'),
  auditLog('CREATE', 'Allocation'),
  async (req, res, next) => {
    const transaction = await db.sequelize.transaction();

    try {
      const { quantity, size } = req.body;

      const oldAllocation = await Allocation.findByPk(req.params.id, {
        include: [{ model: PPEItem, as: 'ppeItem' }]
      });

      if (!oldAllocation) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Allocation not found'
        });
      }

      // Check stock (including size if applicable)
      const renewalSize = size || oldAllocation.size;
      const stockWhere = { ppeItemId: oldAllocation.ppeItemId };
      
      if (oldAllocation.ppeItem.hasSizeVariants && renewalSize) {
        stockWhere.size = renewalSize;
      } else if (!oldAllocation.ppeItem.hasSizeVariants) {
        stockWhere.size = null;
      }
      
      const stock = await Stock.findOne({ where: stockWhere });

      const renewalQty = quantity || oldAllocation.quantity;

      if (!stock || stock.quantity < renewalQty) {
        await transaction.rollback();
        const sizeInfo = renewalSize ? ` (size: ${renewalSize})` : '';
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for renewal${sizeInfo}. Available: ${stock ? stock.quantity : 0}, Requested: ${renewalQty}`
        });
      }

      // Mark old allocation as replaced
      await oldAllocation.update({
        status: 'replaced'
      }, { transaction });

      // Calculate next renewal date
      const issueDate = new Date();
      const nextRenewalDate = new Date(issueDate);
      nextRenewalDate.setMonth(nextRenewalDate.getMonth() + oldAllocation.ppeItem.replacementFrequency);

      // Create new allocation
      const newAllocation = await Allocation.create({
        employeeId: oldAllocation.employeeId,
        ppeItemId: oldAllocation.ppeItemId,
        issuedById: req.user.id,
        quantity: renewalQty,
        size: size || oldAllocation.size,
        issueDate,
        nextRenewalDate,
        status: 'active',
        totalCost: stock.unitCost * renewalQty
      }, { transaction });

      // Update stock
      await stock.update({
        quantity: stock.quantity - renewalQty
      }, { transaction });

      await transaction.commit();

      const fullAllocation = await Allocation.findByPk(newAllocation.id, {
        include: [
          { model: Employee, as: 'employee' },
          { model: PPEItem, as: 'ppeItem' },
          { model: User, as: 'issuedBy', attributes: ['id', 'username', 'firstName', 'lastName'] }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Allocation renewed successfully',
        data: fullAllocation
      });
    } catch (error) {
      await transaction.rollback();
      next(error);
    }
  }
);

module.exports = router;
