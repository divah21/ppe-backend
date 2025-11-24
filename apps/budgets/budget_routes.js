const express = require('express');
const router = express.Router();
const { Budget, Department, Section } = require('../../models');
const { authenticate } = require('../../middlewares/auth_middleware');

// Get all budgets
router.get('/', authenticate, async (req, res) => {
  try {
    const budgets = await Budget.findAll({
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'code']
        },
        {
          model: Section,
          as: 'section',
          attributes: ['id', 'name']
        }
      ],
      order: [['fiscalYear', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: budgets
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

// Get budget by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const budget = await Budget.findByPk(req.params.id, {
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'code']
        },
        {
          model: Section,
          as: 'section',
          attributes: ['id', 'name']
        }
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

// Get budgets by department
router.get('/department/:departmentId', authenticate, async (req, res) => {
  try {
    const budgets = await Budget.findAll({
      where: { departmentId: req.params.departmentId },
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'code']
        },
        {
          model: Section,
          as: 'section',
          attributes: ['id', 'name']
        }
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

// Create budget
router.post('/', authenticate, async (req, res) => {
  try {
    const { departmentId, sectionId, fiscalYear, totalBudget, status, period, quarter, startDate, endDate, notes } = req.body;

    // Validate required fields
    if (!departmentId || !fiscalYear || !totalBudget) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: departmentId, fiscalYear, totalBudget'
      });
    }

    // Check if department exists
    const department = await Department.findByPk(departmentId);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // If section provided, check it exists
    if (sectionId) {
      const section = await Section.findByPk(sectionId);
      if (!section) {
        return res.status(404).json({
          success: false,
          message: 'Section not found'
        });
      }
    }

    const budget = await Budget.create({
      departmentId,
      sectionId: sectionId || null,
      fiscalYear,
      totalBudget,
      allocatedBudget: 0,
      remainingBudget: totalBudget,
      status: status || 'active',
      period: period || 'annual',
      quarter: quarter || null,
      startDate: startDate || null,
      endDate: endDate || null,
      notes: notes || null
    });

    // Fetch with associations
    const createdBudget = await Budget.findByPk(budget.id, {
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'code']
        },
        {
          model: Section,
          as: 'section',
          attributes: ['id', 'name']
        }
      ]
    });

    res.status(201).json({
      success: true,
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

// Update budget
router.put('/:id', authenticate, async (req, res) => {
  try {
    const budget = await Budget.findByPk(req.params.id);

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    const { totalBudget, allocatedBudget, status } = req.body;

    const updateData = {};
    if (totalBudget !== undefined) {
      updateData.totalBudget = totalBudget;
      updateData.remainingBudget = totalBudget - (allocatedBudget || budget.allocatedBudget);
    }
    if (allocatedBudget !== undefined) {
      updateData.allocatedBudget = allocatedBudget;
      updateData.remainingBudget = (totalBudget || budget.totalBudget) - allocatedBudget;
    }
    if (status !== undefined) {
      updateData.status = status;
    }

    await budget.update(updateData);

    // Fetch updated budget with associations
    const updatedBudget = await Budget.findByPk(budget.id, {
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'code']
        },
        {
          model: Section,
          as: 'section',
          attributes: ['id', 'name']
        }
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

// Allocate from budget
router.post('/:id/allocate', authenticate, async (req, res) => {
  try {
    const budget = await Budget.findByPk(req.params.id);

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid allocation amount'
      });
    }

    if (amount > budget.remainingBudget) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient budget remaining'
      });
    }

    await budget.update({
      allocatedBudget: budget.allocatedBudget + amount,
      remainingBudget: budget.remainingBudget - amount
    });

    // Fetch updated budget with associations
    const updatedBudget = await Budget.findByPk(budget.id, {
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'code']
        },
        {
          model: Section,
          as: 'section',
          attributes: ['id', 'name']
        }
      ]
    });

    res.json({
      success: true,
      data: updatedBudget
    });
  } catch (error) {
    console.error('Error allocating budget:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to allocate budget',
      error: error.message
    });
  }
});

// Delete budget
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const budget = await Budget.findByPk(req.params.id);

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
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
