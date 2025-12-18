const express = require('express');
const router = express.Router();
const { CompanyBudget, Budget, Department, Section, Allocation, Employee } = require('../../models');
const { authenticate } = require('../../middlewares/auth_middleware');
const { requireRole } = require('../../middlewares/role_middleware');
const { auditLog } = require('../../middlewares/audit_middleware');
const { Op, Sequelize } = require('sequelize');

// ============================================================
// COMPANY BUDGET ROUTES (Company-wide annual PPE budget)
// ============================================================

/**
 * @route   GET /api/v1/budgets/company
 * @desc    Get all company budgets
 * @access  Private (Admin, Stores)
 */
router.get('/company', authenticate, async (req, res) => {
  try {
    const { fiscalYear, status } = req.query;
    const where = {};
    if (fiscalYear) where.fiscalYear = fiscalYear;
    if (status) where.status = status;

    const companyBudgets = await CompanyBudget.findAll({
      where,
      include: [{
        model: Budget,
        as: 'departmentBudgets',
        include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
      }],
      order: [['fiscalYear', 'DESC']]
    });

    res.json({
      success: true,
      data: companyBudgets
    });
  } catch (error) {
    console.error('Error fetching company budgets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company budgets',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/budgets/company/current
 * @desc    Get current fiscal year's company budget with summary
 * @access  Private
 */
router.get('/company/current', authenticate, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    
    let companyBudget = await CompanyBudget.findOne({
      where: { 
        fiscalYear: currentYear,
        status: 'active'
      },
      include: [{
        model: Budget,
        as: 'departmentBudgets',
        include: [
          { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
          { model: Section, as: 'section', attributes: ['id', 'name'] }
        ]
      }]
    });

    if (!companyBudget) {
      // Return empty budget state
      return res.json({
        success: true,
        data: null,
        message: `No active company budget found for fiscal year ${currentYear}. Please create one first.`
      });
    }

    // Calculate actual spending from allocations this year
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);
    
    const allocations = await Allocation.findAll({
      where: {
        issueDate: {
          [Op.between]: [yearStart, yearEnd]
        }
      },
      attributes: [
        [Sequelize.fn('SUM', Sequelize.col('total_cost')), 'totalSpent'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'allocationCount']
      ],
      raw: true
    });

    const totalSpent = parseFloat(allocations[0]?.totalSpent || 0);
    const allocationCount = parseInt(allocations[0]?.allocationCount || 0);

    // Update company budget spent amount
    await companyBudget.update({ totalSpent });

    res.json({
      success: true,
      data: {
        id: companyBudget.id,
        fiscalYear: companyBudget.fiscalYear,
        totalBudget: parseFloat(companyBudget.totalBudget),
        allocatedToDepartments: parseFloat(companyBudget.allocatedToDepartments),
        unallocated: companyBudget.unallocated,
        totalSpent: parseFloat(totalSpent.toFixed(2)),
        remaining: parseFloat((companyBudget.totalBudget - totalSpent).toFixed(2)),
        utilizationPercent: parseFloat(((totalSpent / companyBudget.totalBudget) * 100).toFixed(2)),
        allocationCount,
        status: companyBudget.status,
        startDate: companyBudget.startDate,
        endDate: companyBudget.endDate,
        departmentBudgets: companyBudget.departmentBudgets
      }
    });
  } catch (error) {
    console.error('Error fetching current company budget:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch current company budget',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/budgets/company
 * @desc    Create company-wide annual PPE budget
 * @access  Private (Admin only)
 */
router.post('/company', authenticate, requireRole('admin'), auditLog('CREATE', 'CompanyBudget'), async (req, res) => {
  try {
    const { fiscalYear, totalBudget, startDate, endDate, notes } = req.body;

    if (!fiscalYear || !totalBudget) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: fiscalYear, totalBudget'
      });
    }

    // Check if budget already exists for this year
    const existing = await CompanyBudget.findOne({ where: { fiscalYear } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Company budget for fiscal year ${fiscalYear} already exists`
      });
    }

    const companyBudget = await CompanyBudget.create({
      fiscalYear,
      totalBudget,
      allocatedToDepartments: 0,
      totalSpent: 0,
      status: 'active',
      startDate: startDate || `${fiscalYear}-01-01`,
      endDate: endDate || `${fiscalYear}-12-31`,
      notes,
      createdById: req.user.id
    });

    res.status(201).json({
      success: true,
      message: `Company PPE budget for ${fiscalYear} created successfully`,
      data: companyBudget
    });
  } catch (error) {
    console.error('Error creating company budget:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create company budget',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/v1/budgets/company/:id
 * @desc    Update company budget
 * @access  Private (Admin only)
 */
router.put('/company/:id', authenticate, requireRole('admin'), auditLog('UPDATE', 'CompanyBudget'), async (req, res) => {
  try {
    const companyBudget = await CompanyBudget.findByPk(req.params.id);
    
    if (!companyBudget) {
      return res.status(404).json({
        success: false,
        message: 'Company budget not found'
      });
    }

    const { totalBudget, status, notes } = req.body;
    
    const updateData = {};
    if (totalBudget !== undefined) updateData.totalBudget = totalBudget;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    await companyBudget.update(updateData);

    res.json({
      success: true,
      message: 'Company budget updated successfully',
      data: companyBudget
    });
  } catch (error) {
    console.error('Error updating company budget:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update company budget',
      error: error.message
    });
  }
});

// ============================================================
// BUDGET SUMMARY ROUTE (must be before /:id to avoid conflict)
// ============================================================

/**
 * @route   GET /api/v1/budgets/summary
 * @desc    Get budget summary with actual spending
 * @access  Private
 */
router.get('/summary', authenticate, async (req, res) => {
  try {
    const { fiscalYear = new Date().getFullYear() } = req.query;
    const yearStart = new Date(fiscalYear, 0, 1);
    const yearEnd = new Date(fiscalYear, 11, 31, 23, 59, 59);

    // Get company budget
    const companyBudget = await CompanyBudget.findOne({
      where: { fiscalYear, status: 'active' }
    });

    // Get department budgets
    const departmentBudgets = await Budget.findAll({
      where: { fiscalYear },
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] }
      ]
    });

    // Get actual spending from allocations
    const allocations = await Allocation.findAll({
      where: {
        issueDate: { [Op.between]: [yearStart, yearEnd] }
      },
      include: [{
        model: Employee,
        as: 'employee',
        include: [{ model: Section, as: 'section', include: [{ model: Department, as: 'department' }] }]
      }]
    });

    // Group spending by department
    const spendingByDept = {};
    let totalSpent = 0;

    for (const alloc of allocations) {
      const cost = parseFloat(alloc.totalCost || 0);
      totalSpent += cost;
      
      const deptId = alloc.employee?.section?.department?.id;
      const deptName = alloc.employee?.section?.department?.name || 'Unknown';
      
      if (deptId) {
        if (!spendingByDept[deptId]) {
          spendingByDept[deptId] = { departmentId: deptId, departmentName: deptName, totalSpent: 0, allocationCount: 0 };
        }
        spendingByDept[deptId].totalSpent += cost;
        spendingByDept[deptId].allocationCount += 1;
      }
    }

    // Build department budgets with spending data
    const departmentBudgetsWithSpending = departmentBudgets.map(budget => {
      const budgetData = budget.toJSON();
      const allocatedAmount = parseFloat(budgetData.allocatedAmount || budgetData.totalBudget || 0);
      const deptSpending = spendingByDept[budgetData.departmentId];
      const deptSpent = deptSpending ? deptSpending.totalSpent : 0;
      const remaining = allocatedAmount - deptSpent;
      const utilizationPercent = allocatedAmount > 0 ? (deptSpent / allocatedAmount) * 100 : 0;

      return {
        id: budgetData.id,
        departmentId: budgetData.departmentId,
        departmentName: budgetData.department?.name || 'Unknown',
        allocatedAmount: parseFloat(allocatedAmount.toFixed(2)),
        totalSpent: parseFloat(deptSpent.toFixed(2)),
        remaining: parseFloat(remaining.toFixed(2)),
        utilizationPercent: parseFloat(utilizationPercent.toFixed(2)),
        status: budgetData.status
      };
    });

    res.json({
      success: true,
      data: {
        fiscalYear: parseInt(fiscalYear),
        companyBudget: companyBudget ? {
          id: companyBudget.id,
          totalBudget: parseFloat(companyBudget.totalBudget),
          allocatedToDepartments: parseFloat(companyBudget.allocatedToDepartments),
          unallocated: companyBudget.unallocated,
          totalSpent: parseFloat(totalSpent.toFixed(2)),
          remaining: parseFloat((companyBudget.totalBudget - totalSpent).toFixed(2)),
          utilizationPercent: companyBudget.totalBudget > 0 ? parseFloat(((totalSpent / companyBudget.totalBudget) * 100).toFixed(2)) : 0
        } : null,
        departmentBudgets: departmentBudgetsWithSpending,
        totalAllocated: departmentBudgetsWithSpending.reduce((sum, b) => sum + b.allocatedAmount, 0),
        totalSpent: parseFloat(totalSpent.toFixed(2)),
        totalRemaining: departmentBudgetsWithSpending.reduce((sum, b) => sum + b.remaining, 0),
        allocationCount: allocations.length,
        spendingByDepartment: Object.values(spendingByDept).map(d => ({
          ...d,
          totalSpent: parseFloat(d.totalSpent.toFixed(2))
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching budget summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch budget summary',
      error: error.message
    });
  }
});

// ============================================================
// DEPARTMENT BUDGET ROUTES (Allocations from company budget)
// ============================================================

/**
 * @route   GET /api/v1/budgets
 * @desc    Get all department budgets
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { fiscalYear, departmentId, status } = req.query;
    const where = {};
    if (fiscalYear) where.fiscalYear = fiscalYear;
    if (departmentId) where.departmentId = departmentId;
    if (status) where.status = status;

    const budgets = await Budget.findAll({
      where,
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
        { model: Section, as: 'section', attributes: ['id', 'name'] },
        { model: CompanyBudget, as: 'companyBudget', attributes: ['id', 'fiscalYear', 'totalBudget'] }
      ],
      order: [['fiscalYear', 'DESC'], ['createdAt', 'DESC']]
    });

    // Calculate actual spending for each budget
    const enrichedBudgets = await Promise.all(budgets.map(async (budget) => {
      const budgetData = budget.toJSON();
      
      // Get actual spending from allocations for this department
      const yearStart = new Date(budget.fiscalYear, 0, 1);
      const yearEnd = new Date(budget.fiscalYear, 11, 31, 23, 59, 59);

      // Build section filter condition
      const sectionFilter = budget.sectionId 
        ? { id: budget.sectionId }
        : { departmentId: budget.departmentId };

      // First, get employee IDs that belong to the target department/section
      const employees = await Employee.findAll({
        include: [{
          model: Section,
          as: 'section',
          where: sectionFilter,
          required: true,
          attributes: []
        }],
        attributes: ['id'],
        raw: true
      });

      const employeeIds = employees.map(e => e.id);

      // Then calculate spending for those employees
      let totalSpent = 0;
      if (employeeIds.length > 0) {
        const spending = await Allocation.findAll({
          where: {
            issueDate: { [Op.between]: [yearStart, yearEnd] },
            employeeId: { [Op.in]: employeeIds }
          },
          attributes: [[Sequelize.fn('SUM', Sequelize.col('total_cost')), 'totalSpent']],
          raw: true
        });
        totalSpent = parseFloat(spending[0]?.totalSpent || 0);
      }
      const allocatedAmount = parseFloat(budgetData.allocatedAmount || budgetData.totalBudget || 0);

      return {
        ...budgetData,
        allocatedAmount,
        totalSpent: parseFloat(totalSpent.toFixed(2)),
        remaining: parseFloat((allocatedAmount - totalSpent).toFixed(2)),
        utilizationPercent: allocatedAmount > 0 ? parseFloat(((totalSpent / allocatedAmount) * 100).toFixed(2)) : 0
      };
    }));

    res.json({
      success: true,
      data: enrichedBudgets
    });
  } catch (error) {
    console.error('Error fetching budgets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch budgets',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/budgets/department/:departmentId
 * @desc    Get budgets by department
 * @access  Private
 */
router.get('/department/:departmentId', authenticate, async (req, res) => {
  try {
    const budgets = await Budget.findAll({
      where: { departmentId: req.params.departmentId },
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
        { model: Section, as: 'section', attributes: ['id', 'name'] },
        { model: CompanyBudget, as: 'companyBudget' }
      ],
      order: [['fiscalYear', 'DESC']]
    });

    res.json({
      success: true,
      data: budgets
    });
  } catch (error) {
    console.error('Error fetching department budgets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch department budgets',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/budgets
 * @desc    Create department budget (allocate from company budget)
 * @access  Private (Admin only)
 */
router.post('/', authenticate, requireRole('admin'), auditLog('CREATE', 'Budget'), async (req, res) => {
  try {
    const { 
      companyBudgetId, departmentId, sectionId, fiscalYear, 
      allocatedAmount, period, quarter, month, startDate, endDate, notes 
    } = req.body;

    if (!departmentId || !fiscalYear || !allocatedAmount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: departmentId, fiscalYear, allocatedAmount'
      });
    }

    // Validate department exists
    const department = await Department.findByPk(departmentId);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // If company budget specified, verify and update
    if (companyBudgetId) {
      const companyBudget = await CompanyBudget.findByPk(companyBudgetId);
      if (!companyBudget) {
        return res.status(404).json({
          success: false,
          message: 'Company budget not found'
        });
      }

      // Check if there's enough unallocated budget
      const unallocated = companyBudget.unallocated;
      if (allocatedAmount > unallocated) {
        return res.status(400).json({
          success: false,
          message: `Insufficient unallocated company budget. Available: $${unallocated.toFixed(2)}`
        });
      }

      // Update company budget allocated amount
      await companyBudget.update({
        allocatedToDepartments: parseFloat(companyBudget.allocatedToDepartments) + parseFloat(allocatedAmount)
      });
    }

    // Check for existing budget
    const existingWhere = { departmentId, fiscalYear, period: period || 'annual' };
    if (sectionId) existingWhere.sectionId = sectionId;
    if (quarter) existingWhere.quarter = quarter;
    if (month) existingWhere.month = month;

    const existing = await Budget.findOne({ where: existingWhere });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Budget already exists for this department/period. Update it instead.'
      });
    }

    const budget = await Budget.create({
      companyBudgetId: companyBudgetId || null,
      departmentId,
      sectionId: sectionId || null,
      fiscalYear,
      allocatedAmount,
      totalSpent: 0,
      totalBudget: allocatedAmount, // Legacy
      allocatedBudget: 0, // Legacy
      remainingBudget: allocatedAmount, // Legacy
      status: 'active',
      period: period || 'annual',
      quarter: quarter || null,
      month: month || null,
      startDate: startDate || null,
      endDate: endDate || null,
      notes: notes || null
    });

    const createdBudget = await Budget.findByPk(budget.id, {
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
        { model: Section, as: 'section', attributes: ['id', 'name'] },
        { model: CompanyBudget, as: 'companyBudget' }
      ]
    });

    res.status(201).json({
      success: true,
      message: `Budget allocated to ${department.name} for ${fiscalYear}`,
      data: createdBudget
    });
  } catch (error) {
    console.error('Error creating budget:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create budget',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/budgets/:id
 * @desc    Get budget by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const budget = await Budget.findByPk(req.params.id, {
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
        { model: Section, as: 'section', attributes: ['id', 'name'] },
        { model: CompanyBudget, as: 'companyBudget', attributes: ['id', 'fiscalYear', 'totalBudget'] }
      ]
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    res.json({
      success: true,
      data: budget
    });
  } catch (error) {
    console.error('Error fetching budget:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch budget',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/v1/budgets/:id
 * @desc    Update department budget
 * @access  Private (Admin only)
 */
router.put('/:id', authenticate, requireRole('admin'), auditLog('UPDATE', 'Budget'), async (req, res) => {
  try {
    const budget = await Budget.findByPk(req.params.id, {
      include: [{ model: CompanyBudget, as: 'companyBudget' }]
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    const { allocatedAmount, status, notes } = req.body;
    const updateData = {};

    // Handle allocation amount change
    if (allocatedAmount !== undefined && budget.companyBudget) {
      const oldAmount = parseFloat(budget.allocatedAmount || 0);
      const newAmount = parseFloat(allocatedAmount);
      const diff = newAmount - oldAmount;

      if (diff > 0) {
        // Increasing allocation - check company budget
        const unallocated = budget.companyBudget.unallocated;
        if (diff > unallocated) {
          return res.status(400).json({
            success: false,
            message: `Insufficient unallocated company budget. Available: $${unallocated.toFixed(2)}`
          });
        }
      }

      // Update company budget
      await budget.companyBudget.update({
        allocatedToDepartments: parseFloat(budget.companyBudget.allocatedToDepartments) + diff
      });

      updateData.allocatedAmount = newAmount;
      updateData.totalBudget = newAmount; // Legacy
      updateData.remainingBudget = newAmount - parseFloat(budget.totalSpent || 0); // Legacy
    }

    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    await budget.update(updateData);

    const updatedBudget = await Budget.findByPk(budget.id, {
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
        { model: Section, as: 'section', attributes: ['id', 'name'] },
        { model: CompanyBudget, as: 'companyBudget' }
      ]
    });

    res.json({
      success: true,
      data: updatedBudget
    });
  } catch (error) {
    console.error('Error updating budget:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update budget',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/v1/budgets/:id
 * @desc    Delete department budget
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticate, requireRole('admin'), auditLog('DELETE', 'Budget'), async (req, res) => {
  try {
    const budget = await Budget.findByPk(req.params.id, {
      include: [{ model: CompanyBudget, as: 'companyBudget' }]
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    // Return allocated amount to company budget
    if (budget.companyBudget) {
      const allocatedAmount = parseFloat(budget.allocatedAmount || 0);
      await budget.companyBudget.update({
        allocatedToDepartments: parseFloat(budget.companyBudget.allocatedToDepartments) - allocatedAmount
      });
    }

    await budget.destroy();

    res.json({
      success: true,
      message: 'Budget deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting budget:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete budget',
      error: error.message
    });
  }
});

module.exports = router;
