const express = require('express');
const router = express.Router();
const { Stock, PPEItem, Allocation, Employee, Section, Department, Budget, JobTitlePPEMatrix, CompanyBudget } = require('../../models');
const { authenticate } = require('../../middlewares/auth_middleware');
const { authorize } = require('../../middlewares/role_middleware');
const { auditLog } = require('../../middlewares/audit_middleware');
const { Sequelize } = require('sequelize');

/**
 * @route   GET /api/v1/valuation/stock-value
 * @desc    Get total stock valuation in USD
 * @access  Private (Admin, SHEQ, Stores)
 */
router.get('/stock-value', authenticate, authorize(['admin', 'sheq', 'stores']), async (req, res) => {
  try {
    const { category, itemType, stockAccount } = req.query;

    // Build where clause for filtering
    const itemWhere = {};
    if (category) itemWhere.category = category;
    if (itemType) itemWhere.itemType = itemType;

    const stockWhere = {};
    if (stockAccount) stockWhere.stockAccount = stockAccount;

    // Get all stock items with their PPE details
    const stockItems = await Stock.findAll({
      where: stockWhere,
      include: [{
        model: PPEItem,
        as: 'ppeItem',
        where: itemWhere,
        required: true
      }]
    });

    // Calculate total valuation
    let totalValueUSD = 0;
    const valuationDetails = [];

    for (const stock of stockItems) {
      const itemValue = parseFloat(stock.totalValueUSD || 0);
      totalValueUSD += itemValue;

      valuationDetails.push({
        itemRefCode: stock.ppeItem.itemRefCode,
        itemName: stock.ppeItem.name,
        category: stock.ppeItem.category,
        itemType: stock.ppeItem.itemType,
        quantity: stock.quantity,
        unit: stock.ppeItem.unit,
        unitPriceUSD: parseFloat(stock.unitPriceUSD || 0),
        totalValueUSD: itemValue,
        stockAccount: stock.stockAccount,
        location: stock.location,
        size: stock.size,
        color: stock.color
      });
    }

    res.json({
      success: true,
      data: {
        totalValueUSD: parseFloat(totalValueUSD.toFixed(2)),
        itemCount: stockItems.length,
        filters: { category, itemType, stockAccount },
        items: valuationDetails
      }
    });
  } catch (error) {
    console.error('Error calculating stock valuation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate stock valuation',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/valuation/cost-analysis
 * @desc    Comprehensive PPE cost analysis per employee/section/department based on PPE matrices
 * @access  Private (Admin, HOD, Stores)
 */
router.get('/cost-analysis', authenticate, authorize(['admin', 'hod-hos', 'stores']), async (req, res) => {
  try {
    const { departmentId, sectionId, employeeId, groupBy = 'employee' } = req.query;

    // Build employee filter
    const employeeWhere = {};
    if (employeeId) employeeWhere.id = employeeId;
    if (sectionId) employeeWhere.sectionId = sectionId;

    const sectionWhere = {};
    if (departmentId) sectionWhere.departmentId = departmentId;

    // Get all active employees with filters
    const employees = await Employee.findAll({
      where: { ...employeeWhere, isActive: true },
      include: [
        {
          model: Section,
          as: 'section',
          where: Object.keys(sectionWhere).length > 0 ? sectionWhere : undefined,
          include: [{ model: Department, as: 'department' }]
        },
        {
          model: require('../../models/jobTitle'),
          as: 'jobTitleRef'
        }
      ]
    });

    const costDetails = [];

    for (const employee of employees) {
      // Get PPE matrix for this employee's job title
      const matrixEntries = await JobTitlePPEMatrix.findAll({
        where: { jobTitleId: employee.jobTitleId, isActive: true },
        include: [{ model: PPEItem, as: 'ppeItem' }]
      });

      for (const entry of matrixEntries) {
        const ppeItem = entry.ppeItem;
        const quantity = entry.quantityRequired || 1;

        // Get latest stock price for this item
        const stockRecord = await Stock.findOne({
          where: { ppeItemId: ppeItem.id },
          order: [['updatedAt', 'DESC']]
        });

        const unitCost = stockRecord ? parseFloat(stockRecord.unitPriceUSD || 0) : 0;
        const totalCostPerItem = unitCost * quantity;

        costDetails.push({
          employeeId: employee.id,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          worksNumber: employee.worksNumber,
          jobTitle: employee.jobTitleRef ? employee.jobTitleRef.name : (employee.jobTitle || 'N/A'),
          sectionId: employee.section ? employee.section.id : null,
          sectionName: employee.section ? employee.section.name : null,
          departmentId: employee.section && employee.section.department ? employee.section.department.id : null,
          departmentName: employee.section && employee.section.department ? employee.section.department.name : null,
          ppeItemId: ppeItem.id,
          ppeItemName: ppeItem.name,
          ppeItemCode: ppeItem.itemCode,
          category: ppeItem.category,
          quantity,
          unitCost: parseFloat(unitCost.toFixed(2)),
          totalCostPerItem: parseFloat(totalCostPerItem.toFixed(2))
        });
      }
    }

    // Group results based on groupBy parameter
    let groupedData = [];

    if (groupBy === 'employee') {
      const byEmployee = {};
      for (const row of costDetails) {
        const key = row.employeeId;
        if (!byEmployee[key]) {
          byEmployee[key] = {
            employeeId: row.employeeId,
            employeeName: row.employeeName,
            worksNumber: row.worksNumber,
            jobTitle: row.jobTitle,
            sectionName: row.sectionName,
            departmentName: row.departmentName,
            items: [],
            totalCost: 0
          };
        }
        byEmployee[key].items.push({
          ppeItemName: row.ppeItemName,
          ppeItemCode: row.ppeItemCode,
          category: row.category,
          quantity: row.quantity,
          unitCost: row.unitCost,
          totalCostPerItem: row.totalCostPerItem
        });
        byEmployee[key].totalCost += row.totalCostPerItem;
      }
      groupedData = Object.values(byEmployee).map(e => ({
        ...e,
        totalCost: parseFloat(e.totalCost.toFixed(2))
      }));
    } else if (groupBy === 'section') {
      const bySection = {};
      for (const row of costDetails) {
        const key = row.sectionId || 'NO_SECTION';
        if (!bySection[key]) {
          bySection[key] = {
            sectionId: row.sectionId,
            sectionName: row.sectionName || 'No Section',
            departmentName: row.departmentName,
            employeeCount: new Set(),
            totalCost: 0
          };
        }
        bySection[key].employeeCount.add(row.employeeId);
        bySection[key].totalCost += row.totalCostPerItem;
      }
      groupedData = Object.values(bySection).map(s => ({
        ...s,
        employeeCount: s.employeeCount.size,
        totalCost: parseFloat(s.totalCost.toFixed(2))
      }));
    } else if (groupBy === 'department') {
      const byDept = {};
      for (const row of costDetails) {
        const key = row.departmentId || 'NO_DEPT';
        if (!byDept[key]) {
          byDept[key] = {
            departmentId: row.departmentId,
            departmentName: row.departmentName || 'No Department',
            employeeCount: new Set(),
            totalCost: 0
          };
        }
        byDept[key].employeeCount.add(row.employeeId);
        byDept[key].totalCost += row.totalCostPerItem;
      }
      groupedData = Object.values(byDept).map(d => ({
        ...d,
        employeeCount: d.employeeCount.size,
        totalCost: parseFloat(d.totalCost.toFixed(2))
      }));
    } else if (groupBy === 'item') {
      const byItem = {};
      for (const row of costDetails) {
        const key = row.ppeItemId;
        if (!byItem[key]) {
          byItem[key] = {
            ppeItemId: row.ppeItemId,
            ppeItemName: row.ppeItemName,
            ppeItemCode: row.ppeItemCode,
            category: row.category,
            totalQuantity: 0,
            totalCost: 0
          };
        }
        byItem[key].totalQuantity += row.quantity;
        byItem[key].totalCost += row.totalCostPerItem;
      }
      groupedData = Object.values(byItem).map(i => ({
        ...i,
        totalCost: parseFloat(i.totalCost.toFixed(2))
      }));
    }

    const grandTotal = costDetails.reduce((sum, row) => sum + row.totalCostPerItem, 0);

    res.json({
      success: true,
      data: {
        groupBy,
        groupedData,
        grandTotal: parseFloat(grandTotal.toFixed(2)),
        rawData: costDetails
      }
    });
  } catch (error) {
    console.error('Error calculating cost analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate cost analysis',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/valuation/actual-spending
 * @desc    Actual PPE spending from fulfilled allocations (not matrix projections)
 * @access  Private (Admin, HOD, Stores)
 */
router.get('/actual-spending', authenticate, authorize(['admin', 'hod-hos', 'stores']), async (req, res) => {
  try {
    const { departmentId, sectionId, employeeId, groupBy = 'employee', fromDate, toDate } = req.query;

    // Build allocation filter
    const allocationWhere = {};
    if (fromDate) allocationWhere.issueDate = { [Sequelize.Op.gte]: new Date(fromDate) };
    if (toDate) {
      allocationWhere.issueDate = { 
        ...allocationWhere.issueDate, 
        [Sequelize.Op.lte]: new Date(toDate) 
      };
    }

    // Build employee filter
    const employeeWhere = {};
    if (employeeId) employeeWhere.id = employeeId;
    if (sectionId) employeeWhere.sectionId = sectionId;

    const sectionWhere = {};
    if (departmentId) sectionWhere.departmentId = departmentId;

    // Get all allocations with related data
    const allocations = await Allocation.findAll({
      where: allocationWhere,
      include: [
        {
          model: Employee,
          as: 'employee',
          where: Object.keys(employeeWhere).length > 0 ? employeeWhere : undefined,
          include: [
            {
              model: Section,
              as: 'section',
              where: Object.keys(sectionWhere).length > 0 ? sectionWhere : undefined,
              include: [{ model: Department, as: 'department' }]
            },
            {
              model: require('../../models/jobTitle'),
              as: 'jobTitleRef'
            }
          ]
        },
        {
          model: PPEItem,
          as: 'ppeItem'
        }
      ],
      order: [['issueDate', 'DESC']]
    });

    const spendingDetails = [];

    for (const alloc of allocations) {
      if (!alloc.employee) continue;
      
      spendingDetails.push({
        allocationId: alloc.id,
        issueDate: alloc.issueDate,
        employeeId: alloc.employee.id,
        employeeName: `${alloc.employee.firstName} ${alloc.employee.lastName}`,
        worksNumber: alloc.employee.worksNumber,
        jobTitle: alloc.employee.jobTitleRef ? alloc.employee.jobTitleRef.name : (alloc.employee.jobTitle || 'N/A'),
        sectionId: alloc.employee.section ? alloc.employee.section.id : null,
        sectionName: alloc.employee.section ? alloc.employee.section.name : null,
        departmentId: alloc.employee.section && alloc.employee.section.department ? alloc.employee.section.department.id : null,
        departmentName: alloc.employee.section && alloc.employee.section.department ? alloc.employee.section.department.name : null,
        ppeItemId: alloc.ppeItem ? alloc.ppeItem.id : null,
        ppeItemName: alloc.ppeItem ? alloc.ppeItem.name : 'N/A',
        ppeItemCode: alloc.ppeItem ? alloc.ppeItem.itemCode : null,
        category: alloc.ppeItem ? alloc.ppeItem.category : null,
        quantity: alloc.quantity,
        unitCost: parseFloat(alloc.unitCost || 0),
        totalCost: parseFloat(alloc.totalCost || 0),
        size: alloc.size,
        status: alloc.status
      });
    }

    // Group results based on groupBy parameter
    let groupedData = [];

    if (groupBy === 'employee') {
      const byEmployee = {};
      for (const row of spendingDetails) {
        const key = row.employeeId;
        if (!byEmployee[key]) {
          byEmployee[key] = {
            employeeId: row.employeeId,
            employeeName: row.employeeName,
            worksNumber: row.worksNumber,
            jobTitle: row.jobTitle,
            sectionName: row.sectionName,
            departmentName: row.departmentName,
            items: [],
            totalSpent: 0,
            allocationCount: 0
          };
        }
        byEmployee[key].items.push({
          ppeItemName: row.ppeItemName,
          ppeItemCode: row.ppeItemCode,
          category: row.category,
          quantity: row.quantity,
          unitCost: row.unitCost,
          totalCost: row.totalCost,
          issueDate: row.issueDate
        });
        byEmployee[key].totalSpent += row.totalCost;
        byEmployee[key].allocationCount += 1;
      }
      groupedData = Object.values(byEmployee).map(e => ({
        ...e,
        totalSpent: parseFloat(e.totalSpent.toFixed(2))
      }));
    } else if (groupBy === 'section') {
      const bySection = {};
      for (const row of spendingDetails) {
        const key = row.sectionId || 'NO_SECTION';
        if (!bySection[key]) {
          bySection[key] = {
            sectionId: row.sectionId,
            sectionName: row.sectionName || 'No Section',
            departmentName: row.departmentName,
            employeeCount: new Set(),
            totalSpent: 0,
            allocationCount: 0
          };
        }
        bySection[key].employeeCount.add(row.employeeId);
        bySection[key].totalSpent += row.totalCost;
        bySection[key].allocationCount += 1;
      }
      groupedData = Object.values(bySection).map(s => ({
        ...s,
        employeeCount: s.employeeCount.size,
        totalSpent: parseFloat(s.totalSpent.toFixed(2))
      }));
    } else if (groupBy === 'department') {
      const byDept = {};
      for (const row of spendingDetails) {
        const key = row.departmentId || 'NO_DEPT';
        if (!byDept[key]) {
          byDept[key] = {
            departmentId: row.departmentId,
            departmentName: row.departmentName || 'No Department',
            employeeCount: new Set(),
            totalSpent: 0,
            allocationCount: 0
          };
        }
        byDept[key].employeeCount.add(row.employeeId);
        byDept[key].totalSpent += row.totalCost;
        byDept[key].allocationCount += 1;
      }
      groupedData = Object.values(byDept).map(d => ({
        ...d,
        employeeCount: d.employeeCount.size,
        totalSpent: parseFloat(d.totalSpent.toFixed(2))
      }));
    } else if (groupBy === 'item') {
      const byItem = {};
      for (const row of spendingDetails) {
        const key = row.ppeItemId || 'UNKNOWN';
        if (!byItem[key]) {
          byItem[key] = {
            ppeItemId: row.ppeItemId,
            ppeItemName: row.ppeItemName,
            ppeItemCode: row.ppeItemCode,
            category: row.category,
            totalQuantity: 0,
            totalSpent: 0,
            allocationCount: 0
          };
        }
        byItem[key].totalQuantity += row.quantity;
        byItem[key].totalSpent += row.totalCost;
        byItem[key].allocationCount += 1;
      }
      groupedData = Object.values(byItem).map(i => ({
        ...i,
        totalSpent: parseFloat(i.totalSpent.toFixed(2))
      }));
    } else if (groupBy === 'month') {
      const byMonth = {};
      for (const row of spendingDetails) {
        const dt = new Date(row.issueDate);
        const key = `${dt.getFullYear()}-${(dt.getMonth()+1).toString().padStart(2,'0')}`;
        if (!byMonth[key]) {
          byMonth[key] = {
            period: key,
            totalSpent: 0,
            allocationCount: 0,
            employeeCount: new Set()
          };
        }
        byMonth[key].totalSpent += row.totalCost;
        byMonth[key].allocationCount += 1;
        byMonth[key].employeeCount.add(row.employeeId);
      }
      groupedData = Object.values(byMonth).map(m => ({
        period: m.period,
        totalSpent: parseFloat(m.totalSpent.toFixed(2)),
        allocationCount: m.allocationCount,
        employeeCount: m.employeeCount.size
      })).sort((a, b) => a.period.localeCompare(b.period));
    }

    const grandTotal = spendingDetails.reduce((sum, row) => sum + row.totalCost, 0);
    const totalAllocations = spendingDetails.length;
    const uniqueEmployees = new Set(spendingDetails.map(d => d.employeeId)).size;

    res.json({
      success: true,
      data: {
        groupBy,
        groupedData,
        summary: {
          grandTotal: parseFloat(grandTotal.toFixed(2)),
          totalAllocations,
          uniqueEmployees,
          avgPerEmployee: uniqueEmployees > 0 ? parseFloat((grandTotal / uniqueEmployees).toFixed(2)) : 0,
          avgPerAllocation: totalAllocations > 0 ? parseFloat((grandTotal / totalAllocations).toFixed(2)) : 0
        },
        rawData: spendingDetails
      }
    });
  } catch (error) {
    console.error('Error calculating actual spending:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate actual spending',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/valuation/by-category
 * @desc    Get stock valuation grouped by category
 * @access  Private (Admin, SHEQ, Stores)
 */
router.get('/by-category', authenticate, authorize(['admin', 'sheq', 'stores']), async (req, res) => {
  try {
    const { itemType } = req.query;

    const itemWhere = {};
    if (itemType) itemWhere.itemType = itemType;

    const stockItems = await Stock.findAll({
      include: [{
        model: PPEItem,
        as: 'ppeItem',
        where: itemWhere,
        required: true
      }]
    });

    // Group by category
    const categoryValuation = {};
    let totalValueUSD = 0;

    for (const stock of stockItems) {
      const category = stock.ppeItem.category || 'UNCATEGORIZED';
      const itemValue = parseFloat(stock.totalValueUSD || 0);

      if (!categoryValuation[category]) {
        categoryValuation[category] = {
          category,
          totalValueUSD: 0,
          itemCount: 0,
          totalQuantity: 0
        };
      }

      categoryValuation[category].totalValueUSD += itemValue;
      categoryValuation[category].itemCount += 1;
      categoryValuation[category].totalQuantity += stock.quantity;
      totalValueUSD += itemValue;
    }

    // Convert to array and sort by value
    const categories = Object.values(categoryValuation)
      .map(cat => ({
        ...cat,
        totalValueUSD: parseFloat(cat.totalValueUSD.toFixed(2))
      }))
      .sort((a, b) => b.totalValueUSD - a.totalValueUSD);

    res.json({
      success: true,
      data: {
        totalValueUSD: parseFloat(totalValueUSD.toFixed(2)),
        categories
      }
    });
  } catch (error) {
    console.error('Error calculating category valuation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate category valuation',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/valuation/by-stock-account
 * @desc    Get stock valuation grouped by stock account
 * @access  Private (Admin, SHEQ, Stores)
 */
router.get('/by-stock-account', authenticate, authorize(['admin', 'sheq', 'stores']), async (req, res) => {
  try {
    const stockItems = await Stock.findAll({
      include: [{
        model: PPEItem,
        as: 'ppeItem',
        required: true
      }]
    });

    // Group by stock account
    const accountValuation = {};
    let totalValueUSD = 0;

    for (const stock of stockItems) {
      const account = stock.stockAccount || 'UNASSIGNED';
      const itemValue = parseFloat(stock.totalValueUSD || 0);

      if (!accountValuation[account]) {
        accountValuation[account] = {
          stockAccount: account,
          totalValueUSD: 0,
          itemCount: 0,
          totalQuantity: 0
        };
      }

      accountValuation[account].totalValueUSD += itemValue;
      accountValuation[account].itemCount += 1;
      accountValuation[account].totalQuantity += stock.quantity;
      totalValueUSD += itemValue;
    }

    // Convert to array and sort by value
    const accounts = Object.values(accountValuation)
      .map(acc => ({
        ...acc,
        totalValueUSD: parseFloat(acc.totalValueUSD.toFixed(2))
      }))
      .sort((a, b) => b.totalValueUSD - a.totalValueUSD);

    res.json({
      success: true,
      data: {
        totalValueUSD: parseFloat(totalValueUSD.toFixed(2)),
        accounts
      }
    });
  } catch (error) {
    console.error('Error calculating stock account valuation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate stock account valuation',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/valuation/low-stock
 * @desc    Get items with low stock (below reorder point)
 * @access  Private (Admin, SHEQ, Stores)
 */
router.get('/low-stock', authenticate, authorize(['admin', 'sheq', 'stores']), async (req, res) => {
  try {
    const lowStockItems = await Stock.findAll({
      where: {
        [Sequelize.Op.or]: [
          // Check against reorder_point if it exists
          {
            reorderPoint: { [Sequelize.Op.ne]: null },
            quantity: { [Sequelize.Op.lte]: Sequelize.col('reorder_point') }
          },
          // Otherwise check against min_level
          {
            [Sequelize.Op.and]: [
              {
                [Sequelize.Op.or]: [
                  { reorderPoint: { [Sequelize.Op.eq]: null } },
                  { reorderPoint: 0 }
                ]
              },
              { minLevel: { [Sequelize.Op.ne]: null } },
              { quantity: { [Sequelize.Op.lte]: Sequelize.col('min_level') } }
            ]
          }
        ]
      },
      include: [{
        model: PPEItem,
        as: 'ppeItem',
        required: true
      }],
      order: [['quantity', 'ASC']]
    });

    const formattedItems = lowStockItems.map(stock => ({
      itemRefCode: stock.ppeItem.itemRefCode,
      itemName: stock.ppeItem.name,
      category: stock.ppeItem.category,
      currentQuantity: stock.quantity,
      reorderPoint: stock.reorderPoint || stock.minLevel,
      minLevel: stock.minLevel,
      maxLevel: stock.maxLevel,
      unit: stock.ppeItem.unit,
      location: stock.location,
      size: stock.size,
      color: stock.color,
      unitPriceUSD: parseFloat(stock.unitPriceUSD || 0),
      stockAccount: stock.stockAccount,
      deficit: (stock.reorderPoint || stock.minLevel) - stock.quantity
    }));

    res.json({
      success: true,
      data: {
        itemCount: formattedItems.length,
        items: formattedItems
      }
    });
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock items',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/valuation/costs
 * @desc    Get PPE cost aggregated by employee/section/department/item
 * @access  Private (Stores, HOD, Admin)
 */
router.get('/costs', authenticate, authorize(['stores', 'hod-hos', 'admin']), async (req, res) => {
  try {
    const { fromDate, toDate, groupBy = 'employee', departmentId, sectionId } = req.query;

    const where = {};
    if (fromDate) where.issueDate = { [Sequelize.Op.gte]: new Date(fromDate) };
    if (toDate) {
      where.issueDate = {
        ...where.issueDate,
        [Sequelize.Op.lte]: new Date(toDate)
      };
    }

    const employeeWhere = {};
    if (departmentId) employeeWhere['$employee.section.department_id$'] = departmentId;
    if (sectionId) employeeWhere['$employee.section_id$'] = sectionId;

    const allocations = await Allocation.findAll({
      where: { ...where, ...employeeWhere },
      include: [
        {
          model: Employee,
          as: 'employee',
          include: [{ model: Section, as: 'section', include: [{ model: Department, as: 'department' }] }]
        },
        { model: PPEItem, as: 'ppeItem' }
      ]
    });

    const result = {};

    for (const alloc of allocations) {
      const emp = alloc.employee;
      const dept = emp && emp.section && emp.section.department;

      let key;
      if (groupBy === 'section') {
        key = emp && emp.section ? emp.section.id : 'UNKNOWN_SECTION';
      } else if (groupBy === 'department') {
        key = dept ? dept.id : 'UNKNOWN_DEPT';
      } else if (groupBy === 'item') {
        key = alloc.ppeItemId;
      } else {
        key = alloc.employeeId;
      }

      if (!result[key]) {
        result[key] = {
          totalQuantity: 0,
          totalCost: 0,
          employees: new Set(),
          sections: new Set(),
          departments: new Set(),
          items: new Set(),
          sample: {
            employeeName: emp ? `${emp.firstName} ${emp.lastName}` : null,
            worksNumber: emp ? emp.worksNumber : null,
            jobTitle: emp ? emp.jobTitle : null,
            section: emp && emp.section ? emp.section.name : null,
            department: dept ? dept.name : null,
            ppeItemName: alloc.ppeItem ? alloc.ppeItem.name : null
          }
        };
      }

      result[key].totalQuantity += alloc.quantity;
      result[key].totalCost += parseFloat(alloc.totalCost || 0);
      if (emp) {
        result[key].employees.add(emp.id);
        if (emp.section) result[key].sections.add(emp.section.id);
        if (dept) result[key].departments.add(dept.id);
      }
      if (alloc.ppeItem) result[key].items.add(alloc.ppeItem.id);
    }

    const data = Object.entries(result).map(([key, value]) => ({
      key,
      totalQuantity: value.totalQuantity,
      totalCost: parseFloat(value.totalCost.toFixed(2)),
      employees: value.employees.size,
      sections: value.sections.size,
      departments: value.departments.size,
      items: value.items.size,
      sample: value.sample
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error calculating PPE costs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate PPE costs',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/valuation/forecast-90-days
 * @desc    Comprehensive PPE requirements forecast with breakdown (supports 30-365 days)
 * @access  Private (Stores, HOD, Admin)
 * @query   days - forecast period in days (default: 90, max: 365)
 */
router.get('/forecast-90-days', authenticate, authorize(['stores', 'hod-hos', 'admin']), async (req, res) => {
  try {
    const { departmentId, sectionId, days } = req.query;

    // Support dynamic forecast periods: 30, 60, 90, 180, 365 days
    const forecastDays = Math.min(parseInt(days) || 90, 365);
    
    const now = new Date();
    const futureEnd = new Date();
    futureEnd.setDate(futureEnd.getDate() + forecastDays);
    const future30 = new Date();
    future30.setDate(future30.getDate() + 30);
    const future60 = new Date();
    future60.setDate(future60.getDate() + 60);
    const future90 = new Date();
    future90.setDate(future90.getDate() + 90);
    const future180 = new Date();
    future180.setDate(future180.getDate() + 180);
    const future365 = new Date();
    future365.setDate(future365.getDate() + 365);

    const where = {
      status: 'active',
      expiryDate: {
        [Sequelize.Op.gte]: now,
        [Sequelize.Op.lte]: futureEnd  // Use dynamic end date
      }
    };

    const employeeWhere = {};
    if (departmentId) employeeWhere['$employee.section.department_id$'] = departmentId;
    if (sectionId) employeeWhere['$employee.section_id$'] = sectionId;

    const allocations = await Allocation.findAll({
      where: { ...where, ...employeeWhere },
      include: [
        {
          model: Employee,
          as: 'employee',
          include: [{ model: Section, as: 'section', include: [{ model: Department, as: 'department' }] }]
        },
        { model: PPEItem, as: 'ppeItem' }
      ]
    });

    // Get all stock items
    const stockItems = await Stock.findAll({
      include: [{ model: PPEItem, as: 'ppeItem' }]
    });

    const byItem = {};
    for (const alloc of allocations) {
      const key = alloc.ppeItemId;
      const expiryDate = new Date(alloc.expiryDate);
      
      if (!byItem[key]) {
        byItem[key] = {
          ppeItemId: alloc.ppeItemId,
          ppeItemName: alloc.ppeItem ? alloc.ppeItem.name : null,
          ppeItemCode: alloc.ppeItem ? alloc.ppeItem.itemCode : null,
          category: alloc.ppeItem ? alloc.ppeItem.category : null,
          departmentId: alloc.employee && alloc.employee.section && alloc.employee.section.department ? alloc.employee.section.department.id : null,
          departmentName: alloc.employee && alloc.employee.section && alloc.employee.section.department ? alloc.employee.section.department.name : null,
          sectionId: alloc.employee && alloc.employee.section ? alloc.employee.section.id : null,
          sectionName: alloc.employee && alloc.employee.section ? alloc.employee.section.name : null,
          totalRequired: 0,
          next30Days: 0,
          next60Days: 0,
          next90Days: 0,
          next180Days: 0,
          next365Days: 0,
          currentStock: 0,
          shortage: 0,
          avgMonthly: 0
        };
      }
      
      byItem[key].totalRequired += alloc.quantity;
      
      // Dynamic breakdown based on expiry date
      if (expiryDate <= future30) {
        byItem[key].next30Days += alloc.quantity;
      } else if (expiryDate <= future60) {
        byItem[key].next60Days += alloc.quantity;
      } else if (expiryDate <= future90) {
        byItem[key].next90Days += alloc.quantity;
      } else if (expiryDate <= future180) {
        byItem[key].next180Days += alloc.quantity;
      } else if (expiryDate <= future365) {
        byItem[key].next365Days += alloc.quantity;
      }
    }

    // Add stock info
    for (const stock of stockItems) {
      const key = stock.ppeItemId;
      if (byItem[key]) {
        byItem[key].currentStock = stock.quantity || 0;
        byItem[key].shortage = Math.max(0, byItem[key].totalRequired - byItem[key].currentStock);
        byItem[key].avgMonthly = Math.round(byItem[key].totalRequired / 3);
      }
    }

    const forecast = Object.values(byItem);

    res.json({ 
      success: true, 
      data: {
        forecast,
        summary: {
          totalRequired: forecast.reduce((sum, f) => sum + f.totalRequired, 0),
          totalShortage: forecast.reduce((sum, f) => sum + f.shortage, 0),
          itemsWithShortage: forecast.filter(f => f.shortage > 0).length
        }
      }
    });
  } catch (error) {
    console.error('Error calculating 90-day forecast:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate 90-day forecast',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/valuation/stock-vs-forecast
 * @desc    Compare current stock with 90-day forecast
 * @access  Private (Stores, Admin)
 */
router.get('/stock-vs-forecast', authenticate, authorize(['stores', 'admin']), async (req, res) => {
  try {
    const { departmentId, sectionId } = req.query;

    // Build forecast inline for next 90 days
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + 90);

    const allocWhere = {
      status: 'active',
      expiryDate: {
        [Sequelize.Op.gte]: now,
        [Sequelize.Op.lte]: future
      }
    };

    const employeeWhere = {};
    if (departmentId) employeeWhere['$employee.section.department_id$'] = departmentId;
    if (sectionId) employeeWhere['$employee.section_id$'] = sectionId;

    const allocations = await Allocation.findAll({
      where: { ...allocWhere, ...employeeWhere },
      include: [
        { model: Employee, as: 'employee', include: [{ model: Section, as: 'section', include: [{ model: Department, as: 'department' }] }] },
        { model: PPEItem, as: 'ppeItem' }
      ]
    });

    const forecastByItem = {};
    for (const alloc of allocations) {
      forecastByItem[alloc.ppeItemId] = (forecastByItem[alloc.ppeItemId] || 0) + alloc.quantity;
    }

    const stockItems = await Stock.findAll({
      include: [{ model: PPEItem, as: 'ppeItem' }]
    });

    const rows = stockItems.map(stock => {
      const required = forecastByItem[stock.ppeItemId] || 0;
      const current = stock.quantity;
      return {
        ppeItemId: stock.ppeItemId,
        itemName: stock.ppeItem ? stock.ppeItem.name : null,
        itemCode: stock.ppeItem ? stock.ppeItem.itemCode : null,
        currentStock: current,
        requiredNext90Days: required,
        shortage: Math.max(0, required - current),
        lowStock: current < stock.minLevel,
        outOfStock: current <= 0,
        forecastShortage: required > current
      };
    });

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error calculating stock vs forecast:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate stock vs forecast',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/valuation/issued-value
 * @desc    Total PPE issued value over a period with budget tracking using real budget data
 * @access  Private (Stores, HOD, Admin)
 */
router.get('/issued-value', authenticate, authorize(['stores', 'hod-hos', 'admin']), async (req, res) => {
  try {
    const { fromDate, toDate, groupBy = 'month', departmentId, sectionId, alertThreshold } = req.query;

    const where = {};
    if (fromDate) where.issueDate = { [Sequelize.Op.gte]: new Date(fromDate) };
    if (toDate) {
      where.issueDate = { ...where.issueDate, [Sequelize.Op.lte]: new Date(toDate) };
    }

    const employeeWhere = {};
    if (departmentId) employeeWhere['$employee.section.department_id$'] = departmentId;
    if (sectionId) employeeWhere['$employee.section_id$'] = sectionId;

    const allocations = await Allocation.findAll({
      where: { ...where, ...employeeWhere },
      include: [{ model: Employee, as: 'employee', include: [{ model: Section, as: 'section', include: [{ model: Department, as: 'department' }] }] }],
      order: [['issueDate', 'ASC']]
    });

    const keyFor = (d) => {
      const dt = new Date(d);
      if (groupBy === 'month') return `${dt.getFullYear()}-${(dt.getMonth()+1).toString().padStart(2,'0')}`;
      if (groupBy === 'year') return `${dt.getFullYear()}`;
      return dt.toISOString().slice(0,10); // day
    };

    const buckets = {};
    let totalIssued = 0;
    for (const alloc of allocations) {
      const key = keyFor(alloc.issueDate);
      if (!buckets[key]) buckets[key] = { period: key, totalValue: 0, count: 0, avgValue: 0 };
      buckets[key].totalValue += parseFloat(alloc.totalCost || 0);
      buckets[key].count += 1;
      totalIssued += parseFloat(alloc.totalCost || 0);
    }

    const breakdown = Object.values(buckets).map(b => ({
      period: b.period,
      totalValue: parseFloat(b.totalValue.toFixed(2)),
      count: b.count,
      avgValue: parseFloat((b.totalValue / b.count).toFixed(2))
    }));

    // Get the real company budget for the current fiscal year
    const currentYear = new Date().getFullYear();
    let companyBudget = await CompanyBudget.findOne({ 
      where: { 
        fiscalYear: currentYear,
        status: 'active'
      } 
    });

    // If no active budget for current year, try to find any active budget
    if (!companyBudget) {
      companyBudget = await CompanyBudget.findOne({ 
        where: { status: 'active' },
        order: [['fiscalYear', 'DESC']]
      });
    }

    // Get department-level budget if departmentId is specified
    let allocatedBudget = 0;
    let budgetSource = 'none';

    if (departmentId) {
      // Get department-specific budget
      const deptBudget = await Budget.findOne({ 
        where: { 
          departmentId,
          companyBudgetId: companyBudget ? companyBudget.id : null
        }
      });
      if (deptBudget) {
        allocatedBudget = parseFloat(deptBudget.allocatedAmount || deptBudget.totalBudget || 0);
        budgetSource = 'department';
      }
    } else if (companyBudget) {
      // Use company-wide budget
      allocatedBudget = parseFloat(companyBudget.totalBudget || 0);
      budgetSource = 'company';
    }

    const remainingBudget = allocatedBudget > 0 ? allocatedBudget - totalIssued : 0;
    const utilizationPercent = allocatedBudget > 0 ? (totalIssued / allocatedBudget) * 100 : 0;
    const avgPerPeriod = breakdown.length > 0 ? totalIssued / breakdown.length : 0;

    const alerts = [];
    if (alertThreshold) {
      const threshold = parseFloat(alertThreshold);
      if (!Number.isNaN(threshold) && totalIssued >= threshold) {
        alerts.push({ type: 'budget', message: `Issued value ${totalIssued.toFixed(2)} exceeds threshold ${threshold.toFixed(2)}` });
      }
    }

    // Alert if utilization is high
    if (utilizationPercent >= 90) {
      alerts.push({ type: 'budget_warning', message: `Budget utilization is at ${utilizationPercent.toFixed(1)}%` });
    }

    res.json({ 
      success: true, 
      data: { 
        totalIssued: parseFloat(totalIssued.toFixed(2)),
        allocatedBudget: parseFloat(allocatedBudget.toFixed(2)),
        remainingBudget: parseFloat(remainingBudget.toFixed(2)),
        utilizationPercent: parseFloat(utilizationPercent.toFixed(2)),
        avgPerPeriod: parseFloat(avgPerPeriod.toFixed(2)),
        budgetSource,
        fiscalYear: companyBudget ? companyBudget.fiscalYear : null,
        hasBudget: allocatedBudget > 0,
        breakdown
      }, 
      alerts 
    });
  } catch (error) {
    console.error('Error calculating issued value:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate issued value', error: error.message });
  }
});

/**
 * @route   GET /api/v1/valuation/budget-vs-spend
 * @desc    Compare PPE budget vs expenditure for a department
 * @access  Private (Stores, HOD, Admin)
 */
router.get('/budget-vs-spend', authenticate, authorize(['stores', 'hod-hos', 'admin']), async (req, res) => {
  try {
    const { departmentId, fromDate, toDate } = req.query;

    if (!departmentId) {
      return res.status(400).json({ success: false, message: 'departmentId is required' });
    }

    const budget = await Budget.findOne({ where: { departmentId } });

    const where = {};
    if (fromDate) where.issueDate = { [Sequelize.Op.gte]: new Date(fromDate) };
    if (toDate) {
      where.issueDate = {
        ...where.issueDate,
        [Sequelize.Op.lte]: new Date(toDate)
      };
    }

    const allocations = await Allocation.findAll({
      where,
      include: [{
        model: Employee,
        as: 'employee',
        include: [{ model: Section, as: 'section', where: { departmentId } }]
      }]
    });

    let totalSpend = 0;
    for (const alloc of allocations) {
      totalSpend += parseFloat(alloc.totalCost || 0);
    }

    const budgetAmount = budget ? parseFloat(budget.amount || 0) : 0;
    const remaining = budgetAmount - totalSpend;
    const utilization = budgetAmount > 0 ? totalSpend / budgetAmount : 0;

    res.json({
      success: true,
      data: {
        budgetAmount: parseFloat(budgetAmount.toFixed(2)),
        totalSpend: parseFloat(totalSpend.toFixed(2)),
        remaining: parseFloat(remaining.toFixed(2)),
        utilization
      }
    });
  } catch (error) {
    console.error('Error calculating budget vs spend:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate budget vs spend',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/valuation/update-stock-value/:id
 * @desc    Update stock valuation (quantity, unit price, calculate total)
 * @access  Private (Admin, Stores)
 */
router.post('/update-stock-value/:id', authenticate, authorize(['admin', 'stores']), auditLog('Update Stock Valuation', 'Stock'), async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, unitPriceUSD, stockAccount } = req.body;

    const stock = await Stock.findByPk(id);
    if (!stock) {
      return res.status(404).json({
        success: false,
        message: 'Stock item not found'
      });
    }

    // Update fields
    if (quantity !== undefined) stock.quantity = quantity;
    if (unitPriceUSD !== undefined) stock.unitPriceUSD = unitPriceUSD;
    if (stockAccount !== undefined) stock.stockAccount = stockAccount;

    // Calculate total value
    if (stock.quantity && stock.unitPriceUSD) {
      stock.totalValueUSD = parseFloat((stock.quantity * stock.unitPriceUSD).toFixed(2));
    }

    await stock.save();

    // Fetch with PPE details
    const updatedStock = await Stock.findByPk(id, {
      include: [{
        model: PPEItem,
        as: 'ppeItem'
      }]
    });

    res.json({
      success: true,
      message: 'Stock valuation updated successfully',
      data: updatedStock
    });
  } catch (error) {
    console.error('Error updating stock valuation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stock valuation',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/valuation/bulk-import
 * @desc    Bulk import stock with valuation data
 * @access  Private (Admin, Stores)
 */
router.post('/bulk-import', authenticate, authorize(['admin', 'stores']), auditLog('Bulk Import Stock', 'Stock'), async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required'
      });
    }

    const results = {
      created: 0,
      updated: 0,
      errors: []
    };

    for (const item of items) {
      try {
        const { itemRefCode, quantity, unitPriceUSD, stockAccount, location, size, color } = item;

        // Find PPE item
        const ppeItem = await PPEItem.findOne({ where: { itemRefCode } });
        if (!ppeItem) {
          results.errors.push({ itemRefCode, error: 'PPE item not found' });
          continue;
        }

        // Validate size against item's size scale
        const { validateRequestedSize } = require('../../middlewares/size_validation');
        if (size !== undefined) {
          const check = await validateRequestedSize(ppeItem, size);
          if (!check.valid) {
            results.errors.push({ itemRefCode, error: check.message });
            continue;
          }
        }

        // Calculate total value
        const totalValueUSD = quantity && unitPriceUSD ? parseFloat((quantity * unitPriceUSD).toFixed(2)) : null;

        // Find or create stock
        const [stock, created] = await Stock.findOrCreate({
          where: {
            ppeItemId: ppeItem.id,
            size: size || null,
            color: color || null,
            location: location || 'Main Store'
          },
          defaults: {
            quantity: quantity || 0,
            unitPriceUSD,
            totalValueUSD,
            stockAccount
          }
        });

        if (!created) {
          // Update existing
          stock.quantity = quantity !== undefined ? quantity : stock.quantity;
          stock.unitPriceUSD = unitPriceUSD !== undefined ? unitPriceUSD : stock.unitPriceUSD;
          stock.totalValueUSD = totalValueUSD !== null ? totalValueUSD : stock.totalValueUSD;
          stock.stockAccount = stockAccount !== undefined ? stockAccount : stock.stockAccount;
          await stock.save();
          results.updated++;
        } else {
          results.created++;
        }
      } catch (error) {
        results.errors.push({ item, error: error.message });
      }
    }

    res.json({
      success: true,
      message: 'Bulk import completed',
      data: results
    });
  } catch (error) {
    console.error('Error during bulk import:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete bulk import',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/valuation/analytics/demand-forecast
 * @desc    Get comprehensive demand analytics based on allocations, stock, and failures
 * @access  Private (Stores, Admin)
 */
router.get('/analytics/demand-forecast', authenticate, authorize(['stores', 'admin']), async (req, res) => {
  try {
    const { departmentId, sectionId, months = 12 } = req.query;
    
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (parseInt(months) * 30 * 24 * 60 * 60 * 1000));
    
    // Get all allocations in period
    const allocWhere = {
      createdAt: {
        [Sequelize.Op.gte]: startDate,
        [Sequelize.Op.lte]: endDate
      },
      status: { [Sequelize.Op.in]: ['active', 'expired', 'returned'] }
    };

    const employeeWhere = {};
    if (departmentId) employeeWhere['$employee.section.department_id$'] = departmentId;
    if (sectionId) employeeWhere['$employee.section_id$'] = sectionId;

    const allocations = await Allocation.findAll({
      where: { ...allocWhere, ...employeeWhere },
      include: [
        { model: PPEItem, as: 'ppeItem' },
        {
          model: Employee,
          as: 'employee',
          include: [{ model: Section, as: 'section', include: [{ model: Department, as: 'department' }] }]
        }
      ]
    });

    // Get failures in same period
    const { FailureReport } = require('../../models');
    const failures = await FailureReport.findAll({
      where: {
        reportedDate: {
          [Sequelize.Op.gte]: startDate,
          [Sequelize.Op.lte]: endDate
        }
      },
      include: [{ model: PPEItem, as: 'ppeItem' }]
    });

    // Get current stock levels
    const stockItems = await Stock.findAll({
      include: [{ model: PPEItem, as: 'ppeItem' }]
    });

    // Build demand analytics by PPE item
    const demandByItem = {};

    // Process allocations
    for (const alloc of allocations) {
      const itemId = alloc.ppeItemId;
      if (!demandByItem[itemId]) {
        demandByItem[itemId] = {
          ppeItemId: itemId,
          ppeItemName: alloc.ppeItem?.name || 'Unknown',
          ppeItemCode: alloc.ppeItem?.itemCode,
          category: alloc.ppeItem?.category,
          replacementFrequency: alloc.ppeItem?.replacementFrequency || 12,
          totalAllocations: 0,
          activeAllocations: 0,
          expiredAllocations: 0,
          totalQuantityIssued: 0,
          failureCount: 0,
          currentStock: 0,
          avgMonthlyDemand: 0,
          predictedMonthlyDemand: 0,
          recommendedStockLevel: 0,
          allocationsByMonth: {},
          failuresByMonth: {},
          failureRate: 0
        };
      }

      const item = demandByItem[itemId];
      item.totalAllocations++;
      item.totalQuantityIssued += alloc.quantity;
      
      if (alloc.status === 'active') item.activeAllocations++;
      if (alloc.status === 'expired') item.expiredAllocations++;

      // Monthly tracking
      const month = new Date(alloc.createdAt).toISOString().slice(0, 7);
      item.allocationsByMonth[month] = (item.allocationsByMonth[month] || 0) + alloc.quantity;
    }

    // Process failures
    for (const failure of failures) {
      const itemId = failure.ppeItemId;
      if (demandByItem[itemId]) {
        demandByItem[itemId].failureCount++;
        const month = new Date(failure.reportedDate).toISOString().slice(0, 7);
        demandByItem[itemId].failuresByMonth[month] = (demandByItem[itemId].failuresByMonth[month] || 0) + 1;
      }
    }

    // Process stock levels
    for (const stock of stockItems) {
      const itemId = stock.ppeItemId;
      if (demandByItem[itemId]) {
        demandByItem[itemId].currentStock += stock.quantity || 0;
      }
    }

    // Calculate metrics and predictions
    const analyticsArray = Object.values(demandByItem).map(item => {
      // Average monthly demand
      const monthCount = Math.max(1, parseInt(months));
      item.avgMonthlyDemand = Math.round(item.totalQuantityIssued / monthCount);
      
      // Failure rate
      item.failureRate = item.totalAllocations > 0 
        ? ((item.failureCount / item.totalAllocations) * 100).toFixed(2)
        : 0;

      // Trend-based prediction
      const monthKeys = Object.keys(item.allocationsByMonth).sort();
      if (monthKeys.length >= 3) {
        const recentMonths = monthKeys.slice(-3);
        const recentDemand = recentMonths.map(m => item.allocationsByMonth[m]);
        const avgRecent = recentDemand.reduce((a, b) => a + b, 0) / recentDemand.length;
        
        // Calculate growth trend
        const firstRecent = recentDemand[0];
        const lastRecent = recentDemand[recentDemand.length - 1];
        const growthRate = firstRecent > 0 ? ((lastRecent - firstRecent) / firstRecent) : 0;
        
        item.predictedMonthlyDemand = Math.round(avgRecent * (1 + growthRate));
      } else {
        item.predictedMonthlyDemand = item.avgMonthlyDemand;
      }

      // Recommended stock level: 3 months of predicted demand + safety stock (20%)
      const replacementCycles = item.replacementFrequency || 12;
      const safetyMultiplier = 1.2; // 20% safety stock
      item.recommendedStockLevel = Math.round(item.predictedMonthlyDemand * 3 * safetyMultiplier);
      
      // Stock status
      item.stockStatus = item.currentStock < item.recommendedStockLevel ? 'low' : 'adequate';
      item.stockShortfall = Math.max(0, item.recommendedStockLevel - item.currentStock);

      return item;
    });

    // Sort by predicted demand (highest first)
    analyticsArray.sort((a, b) => b.predictedMonthlyDemand - a.predictedMonthlyDemand);

    // Summary
    const summary = {
      totalItemsTracked: analyticsArray.length,
      totalAllocations: analyticsArray.reduce((sum, i) => sum + i.totalAllocations, 0),
      totalFailures: analyticsArray.reduce((sum, i) => sum + i.failureCount, 0),
      itemsWithLowStock: analyticsArray.filter(i => i.stockStatus === 'low').length,
      totalStockShortfall: analyticsArray.reduce((sum, i) => sum + i.stockShortfall, 0),
      avgFailureRate: analyticsArray.length > 0
        ? (analyticsArray.reduce((sum, i) => sum + parseFloat(i.failureRate), 0) / analyticsArray.length).toFixed(2)
        : 0,
      topDemandItems: analyticsArray.slice(0, 10)
    };

    res.json({
      success: true,
      data: {
        analytics: analyticsArray,
        summary,
        dateRange: { startDate, endDate, months: parseInt(months) }
      }
    });
  } catch (error) {
    console.error('Error calculating demand forecast:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate demand forecast',
      error: error.message
    });
  }
});

module.exports = router;

