const express = require('express');
const router = express.Router();
const { FailureReport, Employee, PPEItem, Allocation, Section, Department, Stock, JobTitle } = require('../../models');
const { authenticate } = require('../../middlewares/auth_middleware');
const { requireRole } = require('../../middlewares/role_middleware');
const { auditLog } = require('../../middlewares/audit_middleware');
const { body, param } = require('express-validator');
const { validate } = require('../../middlewares/validation_middleware');
const { Op } = require('sequelize');

/**
 * @route   GET /api/v1/failures
 * @desc    Get all failure reports
 * @access  Private (Section Rep, HOD, Dept Rep, Stores, SHEQ, Admin)
 */
router.get('/', authenticate, requireRole('section-rep', 'hod', 'department-rep', 'stores', 'sheq', 'admin'), async (req, res, next) => {
  try {
    const {
      status,
      severity,
      employeeId,
      ppeItemId,
      environment,
      brand,
      fromDate,
      toDate,
      page = 1,
      limit = 50
    } = req.query;

    const where = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (employeeId) where.employeeId = employeeId;
    if (ppeItemId) where.ppeItemId = ppeItemId;
    if (environment) where.observedAt = environment;
    if (fromDate) where.reportedDate = { $gte: new Date(fromDate) };
    if (toDate) {
      where.reportedDate = {
        ...where.reportedDate,
        $lte: new Date(toDate)
      };
    }

    const offset = (page - 1) * limit;

    const { count, rows: reports } = await FailureReport.findAndCountAll({
      where,
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'firstName', 'lastName', 'worksNumber', 'jobTitle', 'sectionId', 'jobTitleId'],
          include: [
            {
              model: Section,
              as: 'section',
              include: [{ model: Department, as: 'department' }]
            },
            {
              model: JobTitle,
              as: 'jobTitleRef',
              attributes: ['id', 'name', 'code']
            }
          ]
        },
        {
          model: PPEItem,
          as: 'ppeItem',
          attributes: ['id', 'name', 'itemCode', 'category', 'supplier', 'productName']
        },
        {
          model: Allocation,
          as: 'allocation',
          attributes: ['id', 'issueDate']
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['reportedDate', 'DESC']]
    });

    res.json({
      success: true,
      data: reports,
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
 * @route   GET /api/v1/failures/:id
 * @desc    Get failure report by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const report = await FailureReport.findByPk(req.params.id, {
      include: [
        {
          model: Employee,
          as: 'employee',
          include: [
            {
              model: Section,
              as: 'section',
              include: [{ model: Department, as: 'department' }]
            },
            {
              model: JobTitle,
              as: 'jobTitleRef',
              attributes: ['id', 'name', 'code']
            }
          ]
        },
        {
          model: PPEItem,
          as: 'ppeItem'
        },
        {
          model: Allocation,
          as: 'allocation'
        }
      ]
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Failure report not found'
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/failures
 * @desc    Create failure report
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  [
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('failureType').isIn(['damage', 'defect', 'lost', 'wear']).withMessage('Invalid failure type'),
    body('severity').isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity'),
    body('employeeId').isUUID().withMessage('Invalid employee ID'),
    body('ppeItemId').isUUID().withMessage('Invalid PPE item ID'),
    body('stockId').optional().isUUID().withMessage('Invalid stock ID'),
    body('allocationId').optional().isUUID().withMessage('Invalid allocation ID'),
    body('observedAt').optional().trim(),
    body('brand').optional().trim(),
    body('failureDate').optional().isISO8601().withMessage('Invalid failure date'),
    body('remarks').optional().trim()
  ],
  validate,
  auditLog('CREATE', 'FailureReport'),
  async (req, res, next) => {
    try {
      const { description, failureType, severity, employeeId, ppeItemId, stockId, allocationId, observedAt, brand, failureDate, remarks } = req.body;

      // Verify employee exists
      const employee = await Employee.findByPk(employeeId);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      // Verify PPE item exists
      const ppeItem = await PPEItem.findByPk(ppeItemId);
      if (!ppeItem) {
        return res.status(404).json({
          success: false,
          message: 'PPE item not found'
        });
      }

      // If stockId is provided, verify it exists
      let validStockId = stockId;
      if (stockId) {
        const stock = await Stock.findByPk(stockId);
        if (!stock) {
          // Stock ID provided but doesn't exist, try to find a matching stock
          validStockId = null;
        }
      }

      // If no valid stockId, try to find a matching stock item for this PPE
      if (!validStockId) {
        const matchingStock = await Stock.findOne({
          where: {
            ppeItemId: ppeItemId,
            quantity: { [Op.gt]: 0 }
          },
          order: [['createdAt', 'DESC']]
        });

        if (matchingStock) {
          validStockId = matchingStock.id;
        }
      }

      const report = await FailureReport.create({
        description,
        failureType,
        severity,
        employeeId,
        ppeItemId,
        stockId: validStockId,
        allocationId,
        observedAt,
        brand,
        failureDate: failureDate || new Date(),
        remarks,
        reportedDate: new Date(),
        status: 'pending'
      });

      const createdReport = await FailureReport.findByPk(report.id, {
        include: [
          { model: Employee, as: 'employee' },
          { model: PPEItem, as: 'ppeItem' }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Failure report created successfully. Item will be processed by stores for replacement.',
        data: createdReport
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/failures/:id
 * @desc    Update failure report
 * @access  Private (Stores, SHEQ, Admin)
 */
router.put(
  '/:id',
  authenticate,
  requireRole('stores', 'sheq', 'admin'),
  [
    param('id').isUUID().withMessage('Invalid failure report ID'),
    body('status').optional().isIn(['reported', 'under-review', 'resolved', 'closed']).withMessage('Invalid status'),
    body('reviewedBySHEQ').optional().isBoolean(),
    body('sheqDecision').optional().trim(),
    body('actionTaken').optional().trim()
  ],
  validate,
  auditLog('UPDATE', 'FailureReport'),
  async (req, res, next) => {
    try {
      const report = await FailureReport.findByPk(req.params.id);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Failure report not found'
        });
      }

      // If SHEQ is reviewing, set review date
      if (req.body.reviewedBySHEQ === true && !report.sheqReviewDate) {
        req.body.sheqReviewDate = new Date();
      }

      await report.update(req.body);

      const updatedReport = await FailureReport.findByPk(report.id, {
        include: [
          { model: Employee, as: 'employee' },
          { model: PPEItem, as: 'ppeItem' }
        ]
      });

      res.json({
        success: true,
        message: 'Failure report updated successfully',
        data: updatedReport
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PATCH /api/v1/failures/:id
 * @desc    Partially update failure report (for SHEQ review, status updates)
 * @access  Private (Stores, SHEQ, Admin)
 */
router.patch(
  '/:id',
  authenticate,
  requireRole('stores', 'sheq', 'admin'),
  [
    param('id').isUUID().withMessage('Invalid failure report ID'),
    body('status').optional().isIn(['pending-sheq-review', 'sheq-approved', 'stores-processing', 'resolved', 'replaced']).withMessage('Invalid status'),
    body('reviewedBySHEQ').optional().isBoolean(),
    body('sheqDecision').optional().trim(),
    body('sheqReviewDate').optional().isISO8601(),
    body('actionTaken').optional().trim()
  ],
  validate,
  auditLog('UPDATE', 'FailureReport'),
  async (req, res, next) => {
    try {
      const report = await FailureReport.findByPk(req.params.id);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Failure report not found'
        });
      }

      await report.update(req.body);

      const updatedReport = await FailureReport.findByPk(report.id, {
        include: [
          {
            model: Employee,
            as: 'employee',
            include: [
              {
                model: Section,
                as: 'section',
                include: [{ model: Department, as: 'department' }]
              },
              {
                model: JobTitle,
                as: 'jobTitleRef',
                attributes: ['id', 'name', 'code']
              }
            ]
          },
          { model: PPEItem, as: 'ppeItem' },
          { model: Allocation, as: 'allocation' }
        ]
      });

      res.json({
        success: true,
        message: 'Failure report updated successfully',
        data: updatedReport
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/failures/:id/process
 * @desc    Process failure report - deduct stock and prepare for replacement
 * @access  Private (Stores, Admin)
 */
router.post(
  '/:id/process',
  authenticate,
  requireRole('stores', 'admin'),
  [
    param('id').isUUID().withMessage('Invalid failure report ID'),
    body('replacementStockId').optional().isUUID().withMessage('Invalid replacement stock ID'),
    body('actionTaken').optional().trim()
  ],
  validate,
  auditLog('UPDATE', 'FailureReport'),
  async (req, res, next) => {
    try {
      const { Stock } = require('../../models');
      const { replacementStockId, actionTaken } = req.body;

      const report = await FailureReport.findByPk(req.params.id, {
        include: [
          { model: Employee, as: 'employee' },
          { model: PPEItem, as: 'ppeItem' },
          { model: Allocation, as: 'allocation' }
        ]
      });

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Failure report not found'
        });
      }

      if (report.status === 'replaced') {
        return res.status(400).json({
          success: false,
          message: 'This failure has already been processed and replaced'
        });
      }

      // Deduct from stock if stockId is provided
      if (report.stockId) {
        const stock = await Stock.findByPk(report.stockId);
        if (stock) {
          if (stock.quantity > 0) {
            await stock.update({
              quantity: stock.quantity - 1
            });
            console.log(`Deducted 1 unit from stock ${stock.id}. New quantity: ${stock.quantity - 1}`);
          }
        }
      }

      // Update the allocation status if exists
      if (report.allocationId) {
        const allocation = await Allocation.findByPk(report.allocationId);
        if (allocation) {
          await allocation.update({
            status: 'replaced',
            notes: (allocation.notes || '') + `\nReplaced due to ${report.failureType} (Failure Report #${report.id.substring(0, 8)})`
          });
        }
      }

      // Update failure report
      const updateData = {
        status: replacementStockId ? 'replaced' : 'investigating',
        actionTaken: actionTaken || `Stock deducted. ${replacementStockId ? 'Replacement allocated.' : 'Awaiting replacement allocation.'}`,
        replacementStockId
      };

      await report.update(updateData);

      const updatedReport = await FailureReport.findByPk(report.id, {
        include: [
          { model: Employee, as: 'employee' },
          { model: PPEItem, as: 'ppeItem' },
          { model: Allocation, as: 'allocation' }
        ]
      });

      res.json({
        success: true,
        message: replacementStockId 
          ? 'Failure processed, stock deducted, and replacement allocated'
          : 'Failure processed and stock deducted. Ready for replacement allocation.',
        data: updatedReport,
        stockDeducted: !!report.stockId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/failures/:id
 * @desc    Delete failure report
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  [param('id').isUUID().withMessage('Invalid failure report ID')],
  validate,
  auditLog('DELETE', 'FailureReport'),
  async (req, res, next) => {
    try {
      const report = await FailureReport.findByPk(req.params.id);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Failure report not found'
        });
      }

      await report.destroy();

      res.json({
        success: true,
        message: 'Failure report deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/failures/analytics/premature-failures
 * @desc    Get premature failure analytics with predictions
 * @access  Private (Stores, SHEQ, Admin)
 */
router.get('/analytics/premature-failures', authenticate, requireRole('stores', 'sheq', 'admin'), async (req, res, next) => {
  try {
    const { fromDate, toDate, departmentId, sectionId } = req.query;
    const { Sequelize } = require('sequelize');

    // Date range (default: last 12 months)
    const endDate = toDate ? new Date(toDate) : new Date();
    const startDate = fromDate ? new Date(fromDate) : new Date(endDate.getTime() - (365 * 24 * 60 * 60 * 1000));

    // Build WHERE clause
    const where = {
      reportedDate: {
        [Sequelize.Op.gte]: startDate,
        [Sequelize.Op.lte]: endDate
      }
    };

    // Fetch all failure reports with related data
    const failures = await FailureReport.findAll({
      where,
      include: [
        {
          model: PPEItem,
          as: 'ppeItem',
          attributes: ['id', 'name', 'itemCode', 'category', 'replacementFrequency']
        },
        {
          model: Allocation,
          as: 'allocation',
          attributes: ['id', 'issueDate', 'expiryDate']
        },
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'firstName', 'lastName', 'sectionId'],
          include: [{
            model: Section,
            as: 'section',
            attributes: ['id', 'name', 'departmentId'],
            include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }]
          }]
        }
      ]
    });

    // Filter by department/section if provided
    const filteredFailures = failures.filter(f => {
      if (departmentId && f.employee?.section?.departmentId !== departmentId) return false;
      if (sectionId && f.employee?.sectionId !== sectionId) return false;
      return true;
    });

    // Analytics by PPE Item
    const itemAnalytics = {};
    const prematureThreshold = 0.7; // Items failing before 70% of expected lifetime

    for (const failure of filteredFailures) {
      const itemId = failure.ppeItemId;
      const itemName = failure.ppeItem?.name || 'Unknown';
      const category = failure.ppeItem?.category || 'Unknown';
      const expectedLifeMonths = failure.ppeItem?.replacementFrequency || 12;

      if (!itemAnalytics[itemId]) {
        itemAnalytics[itemId] = {
          ppeItemId: itemId,
          ppeItemName: itemName,
          ppeItemCode: failure.ppeItem?.itemCode,
          category,
          expectedLifeMonths,
          totalFailures: 0,
          prematureFailures: 0,
          damageCount: 0,
          defectCount: 0,
          lostCount: 0,
          wearCount: 0,
          severityCritical: 0,
          severityHigh: 0,
          severityMedium: 0,
          severityLow: 0,
          avgDaysToFailure: 0,
          totalDaysUsed: 0,
          failuresByMonth: {},
          prematureRate: 0,
          failureRate: 0,
          predictedFailures: 0
        };
      }

      const item = itemAnalytics[itemId];
      item.totalFailures++;

      // Failure type counts
      if (failure.failureType === 'damage') item.damageCount++;
      if (failure.failureType === 'defect') item.defectCount++;
      if (failure.failureType === 'lost') item.lostCount++;
      if (failure.failureType === 'wear') item.wearCount++;

      // Severity counts
      if (failure.severity === 'critical') item.severityCritical++;
      if (failure.severity === 'high') item.severityHigh++;
      if (failure.severity === 'medium') item.severityMedium++;
      if (failure.severity === 'low') item.severityLow++;

      // Calculate if premature
      if (failure.allocation?.issueDate && failure.failureDate) {
        const issueDate = new Date(failure.allocation.issueDate);
        const failDate = new Date(failure.failureDate);
        const daysUsed = Math.floor((failDate - issueDate) / (1000 * 60 * 60 * 24));
        const expectedDays = expectedLifeMonths * 30;
        
        item.totalDaysUsed += daysUsed;

        if (daysUsed < (expectedDays * prematureThreshold)) {
          item.prematureFailures++;
        }
      }

      // Monthly trend
      const month = new Date(failure.reportedDate).toISOString().slice(0, 7); // YYYY-MM
      item.failuresByMonth[month] = (item.failuresByMonth[month] || 0) + 1;
    }

    // Calculate rates and predictions
    const analyticsArray = Object.values(itemAnalytics).map(item => {
      item.avgDaysToFailure = item.totalFailures > 0 ? Math.round(item.totalDaysUsed / item.totalFailures) : 0;
      item.prematureRate = item.totalFailures > 0 ? (item.prematureFailures / item.totalFailures * 100) : 0;
      
      // Simple linear prediction for next 3 months based on trend
      const months = Object.keys(item.failuresByMonth).sort();
      if (months.length >= 3) {
        const recentMonths = months.slice(-3);
        const avgRecentFailures = recentMonths.reduce((sum, m) => sum + item.failuresByMonth[m], 0) / 3;
        item.predictedFailures = Math.round(avgRecentFailures * 3);
      }

      return item;
    });

    // Sort by premature failure rate
    analyticsArray.sort((a, b) => b.prematureRate - a.prematureRate);

    // Overall summary
    const summary = {
      totalFailures: filteredFailures.length,
      totalPrematureFailures: analyticsArray.reduce((sum, item) => sum + item.prematureFailures, 0),
      avgPrematureRate: analyticsArray.length > 0 
        ? analyticsArray.reduce((sum, item) => sum + item.prematureRate, 0) / analyticsArray.length 
        : 0,
      itemsWithHighFailureRate: analyticsArray.filter(item => item.prematureRate > 50).length,
      mostProblematicItems: analyticsArray.slice(0, 10),
      failuresByType: {
        damage: analyticsArray.reduce((sum, item) => sum + item.damageCount, 0),
        defect: analyticsArray.reduce((sum, item) => sum + item.defectCount, 0),
        lost: analyticsArray.reduce((sum, item) => sum + item.lostCount, 0),
        wear: analyticsArray.reduce((sum, item) => sum + item.wearCount, 0)
      },
      failuresBySeverity: {
        critical: analyticsArray.reduce((sum, item) => sum + item.severityCritical, 0),
        high: analyticsArray.reduce((sum, item) => sum + item.severityHigh, 0),
        medium: analyticsArray.reduce((sum, item) => sum + item.severityMedium, 0),
        low: analyticsArray.reduce((sum, item) => sum + item.severityLow, 0)
      }
    };

    res.json({
      success: true,
      data: {
        analytics: analyticsArray,
        summary,
        dateRange: { startDate, endDate }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/failures/analytics/failure-trends
 * @desc    Get failure trends over time with predictions
 * @access  Private (Stores, SHEQ, Admin)
 */
router.get('/analytics/failure-trends', authenticate, requireRole('stores', 'sheq', 'admin'), async (req, res, next) => {
  try {
    const { Sequelize } = require('sequelize');
    const { months = 12 } = req.query;

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (parseInt(months) * 30 * 24 * 60 * 60 * 1000));

    const failures = await FailureReport.findAll({
      where: {
        reportedDate: {
          [Sequelize.Op.gte]: startDate,
          [Sequelize.Op.lte]: endDate
        }
      },
      include: [
        { model: PPEItem, as: 'ppeItem', attributes: ['id', 'name', 'category'] }
      ],
      order: [['reportedDate', 'ASC']]
    });

    // Group by month
    const monthlyTrends = {};
    for (const failure of failures) {
      const month = new Date(failure.reportedDate).toISOString().slice(0, 7);
      
      if (!monthlyTrends[month]) {
        monthlyTrends[month] = {
          month,
          total: 0,
          damage: 0,
          defect: 0,
          lost: 0,
          wear: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        };
      }

      monthlyTrends[month].total++;
      monthlyTrends[month][failure.failureType]++;
      monthlyTrends[month][failure.severity]++;
    }

    const trendsArray = Object.values(monthlyTrends).sort((a, b) => a.month.localeCompare(b.month));

    // Calculate trend and predict next 3 months
    const predictions = [];
    if (trendsArray.length >= 3) {
      const recentTrends = trendsArray.slice(-3);
      const avgGrowth = recentTrends.length > 1
        ? (recentTrends[recentTrends.length - 1].total - recentTrends[0].total) / recentTrends.length
        : 0;

      for (let i = 1; i <= 3; i++) {
        const futureMonth = new Date(endDate.getTime() + (i * 30 * 24 * 60 * 60 * 1000));
        const monthStr = futureMonth.toISOString().slice(0, 7);
        const lastTotal = trendsArray[trendsArray.length - 1].total;
        
        predictions.push({
          month: monthStr,
          predictedTotal: Math.max(0, Math.round(lastTotal + (avgGrowth * i))),
          isPrediction: true
        });
      }
    }

    res.json({
      success: true,
      data: {
        trends: trendsArray,
        predictions,
        summary: {
          totalFailures: failures.length,
          avgMonthly: trendsArray.length > 0 ? Math.round(failures.length / trendsArray.length) : 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

