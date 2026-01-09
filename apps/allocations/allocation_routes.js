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

/**
 * @route   POST /api/v1/allocations/bulk-upload
 * @desc    Bulk upload historical allocations (for migration/launch)
 * @access  Private (Stores, Admin only)
 * 
 * Expected format:
 * {
 *   defaultSectionId: "uuid", // Default section for new employees
 *   skipStockDeduction: true, // Don't deduct from stock (historical data)
 *   allocations: [
 *     {
 *       firstName: "INNOCENT",
 *       lastName: "NYAWANGA", 
 *       worksNumber: "EMP001", // Optional - will generate if not provided
 *       ppeItems: [
 *         { itemName: "Worksuit", issueDate: "2024/12/10", quantity: 2 },
 *         { itemName: "Safety Shoes", issueDate: "2025/02/04", quantity: 1 },
 *         { itemName: "Winter Jackets", issueDate: "2025/06/03", quantity: 1 }
 *       ]
 *     }
 *   ]
 * }
 */
router.post(
  '/bulk-upload',
  authenticate,
  requireRole('stores', 'admin'),
  auditLog('CREATE', 'Allocation'),
  async (req, res, next) => {
    const transaction = await db.sequelize.transaction();

    try {
      const { 
        defaultSectionId, 
        skipStockDeduction = true, 
        allocations: allocationData 
      } = req.body;

      if (!allocationData || !Array.isArray(allocationData) || allocationData.length === 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Allocations data is required and must be an array'
        });
      }

      // Validate section exists if provided
      if (defaultSectionId) {
        const section = await Section.findByPk(defaultSectionId);
        if (!section) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'Invalid default section ID'
          });
        }
      }

      // Get all PPE items for name matching
      const allPPEItems = await PPEItem.findAll({
        where: { itemType: 'PPE' }
      });

      // Build a lookup map for PPE items (case-insensitive)
      const ppeItemMap = new Map();
      for (const item of allPPEItems) {
        // Match by exact name (case-insensitive)
        ppeItemMap.set(item.name.toLowerCase(), item);
        // Also add common variations
        const baseName = item.name.toLowerCase()
          .replace(/s$/, '') // Remove trailing 's' for singular/plural matching
          .replace(/-/g, ' '); // Replace dashes with spaces
        ppeItemMap.set(baseName, item);
      }

      // Common name mappings for PPE items
      const nameAliases = {
        'worksuit': ['work suit', 'overalls', 'overall', 'coverall', 'coveralls'],
        'safety shoes': ['safety shoe', 'safety boots', 'safety boot', 'boots', 'steel toe boots'],
        'winter jackets': ['winter jacket', 'jacket', 'jackets', 'cold weather jacket'],
        'hard hat': ['helmet', 'safety helmet', 'hard hats'],
        'safety glasses': ['glasses', 'goggles', 'safety goggles', 'eye protection'],
        'gloves': ['glove', 'work gloves', 'safety gloves'],
        'ear plugs': ['earplugs', 'ear plug', 'hearing protection'],
        'dust mask': ['dust masks', 'respirator', 'face mask', 'mask'],
        'reflective vest': ['hi-vis vest', 'high visibility vest', 'safety vest', 'reflective vests']
      };

      // Add aliases to the map
      for (const [mainName, aliases] of Object.entries(nameAliases)) {
        const mainItem = ppeItemMap.get(mainName);
        if (mainItem) {
          for (const alias of aliases) {
            if (!ppeItemMap.has(alias)) {
              ppeItemMap.set(alias, mainItem);
            }
          }
        }
      }

      const results = {
        created: [],
        skipped: [],
        errors: [],
        employeesCreated: [],
        employeesFound: []
      };

      let worksNumberCounter = await Employee.count() + 1;

      // Process each employee's allocations
      for (let i = 0; i < allocationData.length; i++) {
        const empData = allocationData[i];
        const rowIndex = i + 1;

        try {
          if (!empData.firstName || !empData.lastName) {
            results.skipped.push({
              row: rowIndex,
              reason: 'Missing first name or last name',
              data: empData
            });
            continue;
          }

          // Skip if no PPE items to allocate
          if (!empData.ppeItems || empData.ppeItems.length === 0) {
            results.skipped.push({
              row: rowIndex,
              reason: 'No PPE items to allocate',
              employee: `${empData.firstName} ${empData.lastName}`
            });
            continue;
          }

          // Check if all PPE items have valid data
          const hasValidPPE = empData.ppeItems.some(item => 
            item.itemName && item.issueDate && item.quantity > 0
          );
          
          if (!hasValidPPE) {
            results.skipped.push({
              row: rowIndex,
              reason: 'No valid PPE items with issue date and quantity',
              employee: `${empData.firstName} ${empData.lastName}`
            });
            continue;
          }

          // Find or create employee
          const firstName = empData.firstName.trim().toUpperCase();
          const lastName = empData.lastName.trim().toUpperCase();

          let employee = await Employee.findOne({
            where: {
              [Op.and]: [
                db.sequelize.where(
                  fn('UPPER', col('firstName')),
                  firstName
                ),
                db.sequelize.where(
                  fn('UPPER', col('lastName')),
                  lastName
                )
              ]
            },
            transaction
          });

          if (!employee) {
            // Create new employee
            const worksNumber = empData.worksNumber || `EMP${String(worksNumberCounter++).padStart(5, '0')}`;
            
            if (!defaultSectionId) {
              results.errors.push({
                row: rowIndex,
                error: 'Cannot create employee without default section ID',
                employee: `${firstName} ${lastName}`
              });
              continue;
            }

            employee = await Employee.create({
              firstName,
              lastName,
              worksNumber,
              sectionId: defaultSectionId,
              isActive: true,
              jobType: empData.jobType || 'NEC'
            }, { transaction });

            results.employeesCreated.push({
              id: employee.id,
              name: `${firstName} ${lastName}`,
              worksNumber
            });
          } else {
            results.employeesFound.push({
              id: employee.id,
              name: `${firstName} ${lastName}`,
              worksNumber: employee.worksNumber
            });
          }

          // Process each PPE item allocation
          for (const ppeAlloc of empData.ppeItems) {
            if (!ppeAlloc.itemName || !ppeAlloc.issueDate || !ppeAlloc.quantity) {
              continue; // Skip invalid items
            }

            // Find PPE item by name
            let ppeItem = ppeItemMap.get(ppeAlloc.itemName.toLowerCase().trim());
            
            if (!ppeItem) {
              // Create the PPE item if it doesn't exist
              const itemName = ppeAlloc.itemName.trim();
              const itemCode = itemName.toUpperCase().replace(/\s+/g, '-').substring(0, 20);
              
              // Check if we already created this item in this batch
              ppeItem = ppeItemMap.get(itemName.toLowerCase());
              
              if (!ppeItem) {
                // Determine category based on item name
                let category = 'General';
                const nameLower = itemName.toLowerCase();
                if (nameLower.includes('shoe') || nameLower.includes('boot')) {
                  category = 'Footwear';
                } else if (nameLower.includes('jacket') || nameLower.includes('suit') || nameLower.includes('overall') || nameLower.includes('coat')) {
                  category = 'Clothing';
                } else if (nameLower.includes('helmet') || nameLower.includes('hat') || nameLower.includes('cap')) {
                  category = 'Head Protection';
                } else if (nameLower.includes('glass') || nameLower.includes('goggle')) {
                  category = 'Eye Protection';
                } else if (nameLower.includes('glove')) {
                  category = 'Hand Protection';
                } else if (nameLower.includes('mask') || nameLower.includes('respirator')) {
                  category = 'Respiratory';
                } else if (nameLower.includes('ear') || nameLower.includes('hearing')) {
                  category = 'Hearing Protection';
                } else if (nameLower.includes('vest') || nameLower.includes('hi-vis') || nameLower.includes('reflective')) {
                  category = 'High Visibility';
                }

                // Create new PPE item
                ppeItem = await PPEItem.create({
                  name: itemName,
                  itemCode: `PPE-${itemCode}`,
                  category,
                  itemType: 'PPE',
                  description: `${itemName} - Auto-created during bulk upload`,
                  replacementFrequency: 12, // Default 12 months
                  isActive: true
                }, { transaction });

                // Add to map for future lookups in this batch
                ppeItemMap.set(itemName.toLowerCase(), ppeItem);
                
                // Track created items
                if (!results.ppeItemsCreated) {
                  results.ppeItemsCreated = [];
                }
                results.ppeItemsCreated.push({
                  id: ppeItem.id,
                  name: ppeItem.name,
                  itemCode: ppeItem.itemCode,
                  category: ppeItem.category
                });
              }
            }

            // Parse issue date (handles multiple formats)
            let issueDate;
            try {
              // Handle formats: 2024/12/10, 12/10/24, 2024-12-10
              const dateStr = String(ppeAlloc.issueDate).trim();
              
              if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts[0].length === 4) {
                  // YYYY/MM/DD format
                  issueDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                } else if (parts[2].length === 4) {
                  // DD/MM/YYYY format
                  issueDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                } else {
                  // DD/MM/YY format - assume 2000s
                  const year = parseInt(parts[2]) < 50 ? 2000 + parseInt(parts[2]) : 1900 + parseInt(parts[2]);
                  issueDate = new Date(year, parseInt(parts[1]) - 1, parseInt(parts[0]));
                }
              } else if (dateStr.includes('-')) {
                issueDate = new Date(dateStr);
              } else {
                throw new Error('Invalid date format');
              }

              // Validate date is reasonable (not in far future or too far past)
              if (isNaN(issueDate.getTime())) {
                throw new Error('Invalid date');
              }
              
              // If date is unreasonably far in the future (like 2050), it's probably a typo
              if (issueDate.getFullYear() > new Date().getFullYear() + 2) {
                results.errors.push({
                  row: rowIndex,
                  error: `Issue date seems incorrect (year ${issueDate.getFullYear()}): ${ppeAlloc.issueDate}`,
                  employee: `${firstName} ${lastName}`,
                  item: ppeAlloc.itemName
                });
                continue;
              }
            } catch (e) {
              results.errors.push({
                row: rowIndex,
                error: `Invalid date format: ${ppeAlloc.issueDate}`,
                employee: `${firstName} ${lastName}`,
                item: ppeAlloc.itemName
              });
              continue;
            }

            // Calculate next renewal date based on PPE item's replacement frequency
            const nextRenewalDate = new Date(issueDate);
            const replacementMonths = ppeItem.replacementFrequency || 12;
            nextRenewalDate.setMonth(nextRenewalDate.getMonth() + replacementMonths);

            // Check if allocation already exists (prevent duplicates)
            const existingAllocation = await Allocation.findOne({
              where: {
                employeeId: employee.id,
                ppeItemId: ppeItem.id,
                issueDate: issueDate
              },
              transaction
            });

            if (existingAllocation) {
              results.skipped.push({
                row: rowIndex,
                reason: 'Allocation already exists for this date',
                employee: `${firstName} ${lastName}`,
                item: ppeItem.name,
                date: issueDate.toISOString().split('T')[0]
              });
              continue;
            }

            // Create allocation
            const allocation = await Allocation.create({
              employeeId: employee.id,
              ppeItemId: ppeItem.id,
              issuedById: req.user.id,
              quantity: parseInt(ppeAlloc.quantity) || 1,
              size: ppeAlloc.size || null,
              issueDate,
              nextRenewalDate,
              allocationType: 'annual',
              status: nextRenewalDate <= new Date() ? 'expired' : 'active',
              notes: 'Historical allocation (bulk import)'
            }, { transaction });

            results.created.push({
              id: allocation.id,
              employee: `${firstName} ${lastName}`,
              item: ppeItem.name,
              quantity: allocation.quantity,
              issueDate: issueDate.toISOString().split('T')[0]
            });
          }
        } catch (rowError) {
          results.errors.push({
            row: rowIndex,
            error: rowError.message,
            employee: `${empData.firstName || 'Unknown'} ${empData.lastName || 'Unknown'}`
          });
        }
      }

      await transaction.commit();

      res.status(201).json({
        success: true,
        message: `Bulk upload completed. Created ${results.created.length} allocations.`,
        data: {
          summary: {
            totalProcessed: allocationData.length,
            allocationsCreated: results.created.length,
            employeesCreated: results.employeesCreated.length,
            employeesFound: results.employeesFound.length,
            ppeItemsCreated: results.ppeItemsCreated ? results.ppeItemsCreated.length : 0,
            skipped: results.skipped.length,
            errors: results.errors.length
          },
          created: results.created,
          employeesCreated: results.employeesCreated,
          employeesFound: results.employeesFound,
          ppeItemsCreated: results.ppeItemsCreated || [],
          skipped: results.skipped,
          errors: results.errors
        }
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Bulk allocation upload error:', error);
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/allocations/bulk-upload/template
 * @desc    Get bulk upload template info and PPE items list
 * @access  Private (Stores, Admin only)
 */
router.get('/bulk-upload/template', authenticate, requireRole('stores', 'admin'), async (req, res, next) => {
  try {
    // Get all sections for dropdown
    const sections = await Section.findAll({
      include: [{ model: Department, as: 'department' }],
      order: [['name', 'ASC']]
    });

    // Get all PPE items for reference
    const ppeItems = await PPEItem.findAll({
      where: { itemType: 'PPE' },
      attributes: ['id', 'name', 'itemCode', 'category', 'replacementFrequency'],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        sections: sections.map(s => ({
          id: s.id,
          name: s.name,
          department: s.department?.name
        })),
        ppeItems: ppeItems.map(p => ({
          id: p.id,
          name: p.name,
          itemCode: p.itemCode,
          category: p.category,
          replacementFrequency: p.replacementFrequency
        })),
        templateColumns: [
          'FirstName',
          'Surname',
          'WorksNumber (optional)',
          'PPE Item Name',
          'Issue Date (YYYY/MM/DD)',
          'Quantity'
        ],
        supportedDateFormats: [
          'YYYY/MM/DD (e.g., 2024/12/10)',
          'DD/MM/YYYY (e.g., 10/12/2024)',
          'YYYY-MM-DD (e.g., 2024-12-10)'
        ],
        exampleRow: {
          firstName: 'INNOCENT',
          lastName: 'NYAWANGA',
          worksNumber: 'EMP00001',
          ppeItems: [
            { itemName: 'Worksuit', issueDate: '2024/12/10', quantity: 2 },
            { itemName: 'Safety Shoes', issueDate: '2025/02/04', quantity: 1 },
            { itemName: 'Winter Jackets', issueDate: '2025/06/03', quantity: 1 }
          ]
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
