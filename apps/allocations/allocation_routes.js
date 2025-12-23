const express = require('express');
const router = express.Router();
const { Allocation, Employee, PPEItem, User, Request, RequestItem, Stock, Section, Department, Budget, Role } = require('../../models');
const { authenticate } = require('../../middlewares/auth_middleware');
const { requireRole } = require('../../middlewares/role_middleware');
const { auditLog } = require('../../middlewares/audit_middleware');
const { Op, fn, col, literal } = require('sequelize');
const db = require('../../database/db');
const { sendBudgetThresholdWarning, sendLowStockAlert } = require('../../helpers/email_helper');

/**
 * @route   GET /api/v1/allocations/summaries
 * @desc    Get allocation summaries for multiple employees (batch operation to avoid N+1)
 * @access  Private
 */
router.get('/summaries', authenticate, async (req, res, next) => {
  try {
    const { employeeIds } = req.query;
    
    if (!employeeIds) {
      return res.status(400).json({
        success: false,
        message: 'employeeIds query parameter is required (comma-separated UUIDs)'
      });
    }

    const ids = employeeIds.split(',').map(id => id.trim()).filter(id => id);

    // Single query to get all allocations for these employees
    const allocations = await Allocation.findAll({
      where: {
        employeeId: {
          [Op.in]: ids
        }
      },
      attributes: ['id', 'employeeId', 'status', 'nextRenewalDate', 'issueDate'],
      order: [['issueDate', 'DESC']]
    });

    // Group by employee and calculate summaries
    const summaries = {};
    for (const id of ids) {
      summaries[id] = {
        active: 0,
        total: 0,
        nextRenewal: null,
        daysUntilRenewal: null
      };
    }

    const now = new Date();
    
    for (const alloc of allocations) {
      const empId = alloc.employeeId;
      if (!summaries[empId]) continue;
      
      summaries[empId].total++;
      if (alloc.status === 'active') {
        summaries[empId].active++;
        
        // Track earliest renewal date
        if (alloc.nextRenewalDate) {
          const renewalDate = new Date(alloc.nextRenewalDate);
          if (!summaries[empId].nextRenewal || renewalDate < summaries[empId].nextRenewal) {
            summaries[empId].nextRenewal = renewalDate;
            summaries[empId].daysUntilRenewal = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          }
        }
      }
    }

    res.json({
      success: true,
      data: summaries
    });
  } catch (error) {
    next(error);
  }
});

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
    const includeEmployeeWhere = {};
    const includeSectionWhere = {};
    
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

    // Filter by section via employee - apply on the included Employee model
    if (sectionId) {
      includeEmployeeWhere.sectionId = sectionId;
    }

    // Filter by department via employee's section
    // Put the filter directly on the Section include
    if (departmentId) {
      includeSectionWhere.departmentId = departmentId;
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

    // Determine if we need to filter by employee/section
    const hasEmployeeFilter = Object.keys(includeEmployeeWhere).length > 0;
    const hasSectionFilter = Object.keys(includeSectionWhere).length > 0;
    const needsEmployeeFilter = hasEmployeeFilter || hasSectionFilter;

    const { count, rows: allocations } = await Allocation.findAndCountAll({
      where,
      include: [
        { 
          model: Employee, 
          as: 'employee',
          where: hasEmployeeFilter ? includeEmployeeWhere : undefined,
          required: needsEmployeeFilter,
          include: [
            { 
              model: Section, 
              as: 'section',
              where: hasSectionFilter ? includeSectionWhere : undefined,
              required: hasSectionFilter
            }
          ]
        },
        { model: PPEItem, as: 'ppeItem' },
        { 
          model: User, 
          as: 'issuedBy', 
          attributes: ['id', 'username'],
          include: [
            { 
              model: Employee, 
              as: 'employee', 
              attributes: ['id', 'firstName', 'lastName'] 
            }
          ]
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['issueDate', 'DESC']],
      subQuery: false
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
        { 
          model: User, 
          as: 'issuedBy', 
          attributes: ['id', 'username'],
          include: [
            { model: Employee, as: 'employee', attributes: ['id', 'firstName', 'lastName'] }
          ]
        }
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
 * @route   GET /api/v1/allocations/expiry-by-item
 * @desc    Get allocations with expiry dates, grouped by PPE item
 * @access  Private (Stores, HOD, Admin)
 */
router.get('/expiry-by-item', authenticate, requireRole('stores', 'hod-hos', 'admin'), async (req, res, next) => {
  try {
    const { daysAhead = 90, departmentId, sectionId } = req.query;

    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + parseInt(daysAhead));

    const where = {
      status: 'active',
      expiryDate: {
        [Op.gte]: now,
        [Op.lte]: future
      }
    };

    const employeeWhere = {};
    if (departmentId) {
      employeeWhere['$employee.section.department_id$'] = departmentId;
    }
    if (sectionId) {
      employeeWhere['$employee.section_id$'] = sectionId;
    }

    const allocations = await Allocation.findAll({
      where: { ...where, ...employeeWhere },
      include: [
        {
          model: Employee,
          as: 'employee',
          include: [{ model: Section, as: 'section' }]
        },
        { model: PPEItem, as: 'ppeItem' }
      ],
      order: [['expiryDate', 'ASC']]
    });

    const byItem = {};
    for (const alloc of allocations) {
      const key = alloc.ppeItemId;
      if (!byItem[key]) {
        byItem[key] = {
          ppeItemId: alloc.ppeItemId,
          itemName: alloc.ppeItem.name,
          itemCode: alloc.ppeItem.itemCode,
          category: alloc.ppeItem.category,
          totalQuantity: 0,
          allocations: []
        };
      }
      byItem[key].totalQuantity += alloc.quantity;
      byItem[key].allocations.push({
        id: alloc.id,
        employeeId: alloc.employeeId,
        employeeName: alloc.employee ? `${alloc.employee.firstName} ${alloc.employee.lastName}` : null,
        issueDate: alloc.issueDate,
        expiryDate: alloc.expiryDate,
        quantity: alloc.quantity,
        size: alloc.size
      });
    }

    res.json({
      success: true,
      data: Object.values(byItem),
      meta: { daysAhead: parseInt(daysAhead) }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/allocations/expiry-by-personnel
 * @desc    Get allocations due or nearing expiry per employee
 * @access  Private (Stores, HOD, Admin)
 */
router.get('/expiry-by-personnel', authenticate, requireRole('stores', 'hod-hos', 'admin'), async (req, res, next) => {
  try {
    const { daysAhead = 90, departmentId, sectionId } = req.query;

    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + parseInt(daysAhead));

    const where = {
      status: 'active',
      expiryDate: {
        [Op.gte]: now,
        [Op.lte]: future
      }
    };

    const employeeWhere = {};
    if (departmentId) {
      employeeWhere['$employee.section.department_id$'] = departmentId;
    }
    if (sectionId) {
      employeeWhere['$employee.section_id$'] = sectionId;
    }

    const allocations = await Allocation.findAll({
      where: { ...where, ...employeeWhere },
      include: [
        {
          model: Employee,
          as: 'employee',
          include: [{ model: Section, as: 'section' }]
        },
        { model: PPEItem, as: 'ppeItem' }
      ],
      order: [['expiryDate', 'ASC']]
    });

    const byEmployee = {};
    for (const alloc of allocations) {
      const emp = alloc.employee;
      const key = alloc.employeeId;
      if (!byEmployee[key]) {
        byEmployee[key] = {
          employeeId: alloc.employeeId,
          employeeName: emp ? `${emp.firstName} ${emp.lastName}` : null,
          worksNumber: emp ? emp.worksNumber : null,
          section: emp && emp.section ? emp.section.name : null,
          departmentId: emp && emp.section ? emp.section.departmentId : null,
          items: []
        };
      }
      byEmployee[key].items.push({
        allocationId: alloc.id,
        ppeItemId: alloc.ppeItemId,
        itemName: alloc.ppeItem.name,
        itemCode: alloc.ppeItem.itemCode,
        quantity: alloc.quantity,
        size: alloc.size,
        issueDate: alloc.issueDate,
        expiryDate: alloc.expiryDate
      });
    }

    res.json({
      success: true,
      data: Object.values(byEmployee),
      meta: { daysAhead: parseInt(daysAhead) }
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
      const lowStockItems = []; // Track items that fall below reorder level

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
        }
        // For non-sized items, we don't filter by size at all - find any stock for this PPE item
        // This allows stock with size=null OR any other size value
        
        // Find stock, prioritizing exact size match, then any available stock
        let stock = await Stock.findOne({ 
          where: stockWhere,
          order: [['quantity', 'DESC']] // Get the stock with most quantity first
        });
        
        // If no stock found and we're looking for a specific size, try without size filter
        if (!stock && !requestItem.ppeItem.hasSizeVariants) {
          stock = await Stock.findOne({ 
            where: { ppeItemId: requestItem.ppeItemId },
            order: [['quantity', 'DESC']]
          });
        }

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
          totalCost: (parseFloat(stock.unitPriceUSD) || 0) * allocItem.quantity
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

        // Check low stock after deduction and queue alert if needed
        const updatedStock = await Stock.findOne({ 
          where: { ppeItemId: requestItem.ppeItemId },
          transaction 
        });
        
        if (updatedStock && updatedStock.quantity <= (updatedStock.reorderLevel || 10)) {
          // Queue low stock alert (will be sent after transaction commits)
          lowStockItems.push({
            itemName: requestItem.ppeItem.name,
            currentStock: updatedStock.quantity,
            reorderLevel: updatedStock.reorderLevel || 10,
            size: updatedStock.size || null
          });
        }
      }

      // Mark request as fulfilled
      await request.update({
        status: 'fulfilled',
        fulfilledDate: new Date(),
        fulfilledByUserId: req.user.id
      }, { transaction });

      await transaction.commit();

      // Post-commit: Send low stock alerts to Stores users
      if (lowStockItems.length > 0) {
        try {
          const storesRole = await Role.findOne({ where: { name: 'stores' } });
          if (storesRole) {
            const storesUsers = await User.findAll({
              where: { roleId: storesRole.id, isActive: true },
              include: [{ model: Employee, as: 'employee' }]
            });

            for (const item of lowStockItems) {
              for (const storesUser of storesUsers) {
                const email = storesUser.employee?.email || storesUser.email;
                if (email) {
                  await sendLowStockAlert({
                    storesPersonName: storesUser.employee?.fullName || storesUser.username,
                    storesPersonEmail: email,
                    itemName: item.itemName,
                    currentStock: item.currentStock,
                    reorderLevel: item.reorderLevel,
                    size: item.size
                  });
                }
              }
            }
          }
        } catch (emailError) {
          console.error('Error sending low stock alerts:', emailError);
        }
      }

      // Post-commit: Check department budget threshold and send warning
      try {
        const employee = request.targetEmployee;
        if (employee?.section?.departmentId) {
          const departmentId = employee.section.departmentId;
          const fiscalYear = new Date().getFullYear();
          
          const budget = await Budget.findOne({
            where: { departmentId, fiscalYear },
            include: [{ model: Department, as: 'department' }]
          });

          if (budget) {
            // Calculate total allocation cost for this request
            const totalRequestCost = createdAllocations.reduce((sum, alloc) => sum + parseFloat(alloc.totalCost || 0), 0);
            
            // Update budget spent amount
            const newSpent = parseFloat(budget.totalSpent || 0) + totalRequestCost;
            await budget.update({ 
              totalSpent: newSpent,
              remainingBudget: parseFloat(budget.allocatedAmount || 0) - newSpent
            });

            // Check if budget exceeds threshold (80%)
            const utilizationPercent = (newSpent / parseFloat(budget.allocatedAmount || 1)) * 100;
            if (utilizationPercent >= 80) {
              const hodRole = await Role.findOne({ where: { name: 'hod' } });
              if (hodRole) {
                const hodUsers = await User.findAll({
                  where: { roleId: hodRole.id, departmentId, isActive: true },
                  include: [{ model: Employee, as: 'employee' }]
                });

                for (const hodUser of hodUsers) {
                  const hodEmail = hodUser.employee?.email || hodUser.email;
                  if (hodEmail) {
                    await sendBudgetThresholdWarning({
                      hodName: hodUser.employee?.fullName || hodUser.username,
                      hodEmail,
                      departmentName: budget.department?.name || 'Your Department',
                      budget: {
                        fiscalYear,
                        allocatedAmount: budget.allocatedAmount,
                        spentAmount: newSpent,
                        utilizationPercent: utilizationPercent.toFixed(1)
                      }
                    });
                  }
                }
              }
            }
          }
        }
      } catch (budgetError) {
        console.error('Error checking budget threshold:', budgetError);
      }

      // Get allocations with relations
      const fullAllocations = await Allocation.findAll({
        where: { id: createdAllocations.map(a => a.id) },
        include: [
          { model: Employee, as: 'employee' },
          { model: PPEItem, as: 'ppeItem' },
          { 
            model: User, 
            as: 'issuedBy', 
            attributes: ['id', 'username'],
            include: [
              { model: Employee, as: 'employee', attributes: ['id', 'firstName', 'lastName'] }
            ]
          }
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
          { 
            model: User, 
            as: 'issuedBy', 
            attributes: ['id', 'username'],
            include: [
              { model: Employee, as: 'employee', attributes: ['id', 'firstName', 'lastName'] }
            ]
          }
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
        totalCost: (parseFloat(stock.unitPriceUSD) || 0) * renewalQty
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
          { 
            model: User, 
            as: 'issuedBy', 
            attributes: ['id', 'username'],
            include: [
              { model: Employee, as: 'employee', attributes: ['id', 'firstName', 'lastName'] }
            ]
          }
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
