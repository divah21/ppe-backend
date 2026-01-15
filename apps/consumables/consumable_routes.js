const express = require('express');
const router = express.Router();
const { ConsumableItem, ConsumableStock, ConsumableRequest, ConsumableRequestItem, ConsumableAllocation, Section, Department, User, Employee } = require('../../models');
const { authenticate } = require('../../middlewares/auth_middleware');
const { authorize } = require('../../middlewares/role_middleware');
const { auditLog } = require('../../middlewares/audit_middleware');
const { Sequelize, Op } = require('sequelize');

// ===========================================
// CONSUMABLE ITEMS ROUTES
// ===========================================

/**
 * @route   GET /api/v1/consumables/items
 * @desc    Get all consumable items
 * @access  Private
 */
router.get('/items', authenticate, async (req, res) => {
  try {
    const { category, search, isActive = 'true' } = req.query;

    const where = {};
    if (isActive !== 'all') {
      where.isActive = isActive === 'true';
    }
    if (category) where.category = category;
    if (search) {
      where[Op.or] = [
        { productCode: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const items = await ConsumableItem.findAll({
      where,
      include: [{
        model: ConsumableStock,
        as: 'stocks',
        attributes: ['id', 'quantity', 'unitPriceUSD', 'totalValueUSD', 'location']
      }],
      order: [['description', 'ASC']]
    });

    // Aggregate stock data for each item
    const itemsWithStock = items.map(item => {
      const stockData = item.stocks || [];
      const totalQuantity = stockData.reduce((sum, s) => sum + parseFloat(s.quantity || 0), 0);
      const totalValue = stockData.reduce((sum, s) => sum + parseFloat(s.totalValueUSD || 0), 0);
      const avgPrice = stockData.length > 0 ? stockData[0].unitPriceUSD : item.unitPriceUSD;

      return {
        ...item.toJSON(),
        totalQuantity,
        totalValueUSD: totalValue,
        currentUnitPrice: avgPrice,
        stockCount: stockData.length
      };
    });

    res.json({
      success: true,
      data: itemsWithStock
    });
  } catch (error) {
    console.error('Error fetching consumable items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch consumable items',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/consumables/items
 * @desc    Create a new consumable item
 * @access  Private (Admin, Stores)
 */
router.post('/items', authenticate, authorize(['admin', 'stores']), auditLog('CREATE', 'ConsumableItem'), async (req, res) => {
  try {
    const {
      productCode,
      description,
      category,
      stockAccount,
      unit,
      unitPrice,
      unitPriceUSD,
      minLevel,
      maxLevel,
      reorderPoint,
      notes
    } = req.body;

    if (!productCode || !description || !category) {
      return res.status(400).json({
        success: false,
        message: 'Product code, description, and category are required'
      });
    }

    const existingItem = await ConsumableItem.findOne({ where: { productCode } });
    if (existingItem) {
      return res.status(400).json({
        success: false,
        message: 'Product code already exists'
      });
    }

    const item = await ConsumableItem.create({
      productCode,
      description,
      category,
      stockAccount,
      unit: unit || 'EA',
      unitPrice,
      unitPriceUSD,
      minLevel,
      maxLevel,
      reorderPoint,
      notes
    });

    res.status(201).json({
      success: true,
      message: 'Consumable item created successfully',
      data: item
    });
  } catch (error) {
    console.error('Error creating consumable item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create consumable item',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/v1/consumables/items/:id
 * @desc    Update a consumable item
 * @access  Private (Admin, Stores)
 */
router.put('/items/:id', authenticate, authorize(['admin', 'stores']), auditLog('UPDATE', 'ConsumableItem'), async (req, res) => {
  try {
    const item = await ConsumableItem.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Consumable item not found'
      });
    }

    const allowedFields = ['description', 'category', 'stockAccount', 'unit', 'unitPrice', 'unitPriceUSD', 'minLevel', 'maxLevel', 'reorderPoint', 'isActive', 'notes'];
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    await item.update(updates);

    res.json({
      success: true,
      message: 'Consumable item updated successfully',
      data: item
    });
  } catch (error) {
    console.error('Error updating consumable item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update consumable item',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/consumables/items/bulk-upload
 * @desc    Bulk upload consumable items from Excel
 * @access  Private (Admin, Stores)
 */
router.post('/items/bulk-upload', authenticate, authorize(['admin', 'stores']), auditLog('BULK_CREATE', 'ConsumableItem'), async (req, res) => {
  try {
    const { items, updateExisting = false } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required'
      });
    }

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    for (const itemData of items) {
      try {
        const { productCode, description, category, unit, unitPrice, unitPriceUSD, quantity, stockAccount } = itemData;

        if (!productCode || !description) {
          results.errors.push(`Missing required fields for item: ${productCode || 'unknown'}`);
          results.skipped++;
          continue;
        }

        let item = await ConsumableItem.findOne({ where: { productCode } });

        if (item) {
          if (updateExisting) {
            await item.update({
              description,
              category: category || item.category,
              unit: unit || item.unit,
              unitPrice: unitPrice || item.unitPrice,
              unitPriceUSD: unitPriceUSD || item.unitPriceUSD,
              stockAccount: stockAccount || item.stockAccount
            });
            results.updated++;
          } else {
            results.skipped++;
          }
        } else {
          item = await ConsumableItem.create({
            productCode,
            description,
            category: category || 'CONS',
            unit: unit || 'EA',
            unitPrice,
            unitPriceUSD,
            stockAccount: stockAccount || '710019'
          });
          results.created++;
        }

        // Create or update stock if quantity provided
        if (quantity && parseFloat(quantity) > 0) {
          let stock = await ConsumableStock.findOne({
            where: { consumableItemId: item.id }
          });

          if (stock) {
            await stock.update({
              quantity: parseFloat(quantity),
              unitPriceUSD: unitPriceUSD || stock.unitPriceUSD,
              unitPrice: unitPrice || stock.unitPrice,
              lastRestocked: new Date()
            });
          } else {
            await ConsumableStock.create({
              consumableItemId: item.id,
              quantity: parseFloat(quantity),
              unitPrice,
              unitPriceUSD,
              lastRestocked: new Date()
            });
          }
        }
      } catch (err) {
        results.errors.push(`Error processing ${itemData.productCode}: ${err.message}`);
        results.skipped++;
      }
    }

    res.json({
      success: true,
      message: `Bulk upload completed: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped`,
      data: results
    });
  } catch (error) {
    console.error('Error in bulk upload:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process bulk upload',
      error: error.message
    });
  }
});

// ===========================================
// CONSUMABLE STOCK ROUTES
// ===========================================

/**
 * @route   GET /api/v1/consumables/stock
 * @desc    Get consumable stock with aggregation
 * @access  Private
 */
router.get('/stock', authenticate, async (req, res) => {
  try {
    const { category, lowStock, search } = req.query;

    const itemWhere = {};
    if (category) itemWhere.category = category;
    if (search) {
      itemWhere[Op.or] = [
        { productCode: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const stocks = await ConsumableStock.findAll({
      include: [{
        model: ConsumableItem,
        as: 'consumableItem',
        where: Object.keys(itemWhere).length > 0 ? itemWhere : undefined
      }],
      order: [[{ model: ConsumableItem, as: 'consumableItem' }, 'description', 'ASC']]
    });

    let result = stocks.map(stock => ({
      id: stock.id,
      consumableItemId: stock.consumableItemId,
      productCode: stock.consumableItem?.productCode,
      description: stock.consumableItem?.description,
      category: stock.consumableItem?.category,
      unit: stock.consumableItem?.unit,
      quantity: parseFloat(stock.quantity || 0),
      minLevel: stock.consumableItem?.minLevel || 5,
      unitPriceUSD: parseFloat(stock.unitPriceUSD || 0),
      totalValueUSD: parseFloat(stock.totalValueUSD || 0),
      location: stock.location,
      batchNumber: stock.batchNumber,
      expiryDate: stock.expiryDate,
      lastRestocked: stock.lastRestocked
    }));

    // Filter for low stock if requested
    if (lowStock === 'true') {
      result = result.filter(s => s.quantity <= s.minLevel);
    }

    // Calculate totals
    const totalValueUSD = result.reduce((sum, s) => sum + s.totalValueUSD, 0);
    const totalItems = result.length;
    const lowStockCount = result.filter(s => s.quantity <= s.minLevel).length;

    res.json({
      success: true,
      data: {
        items: result,
        summary: {
          totalItems,
          totalValueUSD,
          lowStockCount
        }
      }
    });
  } catch (error) {
    console.error('Error fetching consumable stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch consumable stock',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/consumables/stock
 * @desc    Add stock for a consumable item
 * @access  Private (Admin, Stores)
 */
router.post('/stock', authenticate, authorize(['admin', 'stores']), auditLog('CREATE', 'ConsumableStock'), async (req, res) => {
  try {
    const { consumableItemId, quantity, unitPrice, unitPriceUSD, location, batchNumber, expiryDate, notes } = req.body;

    if (!consumableItemId || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Consumable item ID and quantity are required'
      });
    }

    const item = await ConsumableItem.findByPk(consumableItemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Consumable item not found'
      });
    }

    // Check if stock already exists for this item
    let stock = await ConsumableStock.findOne({
      where: { consumableItemId }
    });

    if (stock) {
      // Update existing stock
      const newQuantity = parseFloat(stock.quantity) + parseFloat(quantity);
      await stock.update({
        quantity: newQuantity,
        unitPrice: unitPrice || stock.unitPrice,
        unitPriceUSD: unitPriceUSD || stock.unitPriceUSD,
        location: location || stock.location,
        batchNumber: batchNumber || stock.batchNumber,
        expiryDate: expiryDate || stock.expiryDate,
        lastRestocked: new Date(),
        notes: notes || stock.notes
      });
    } else {
      // Create new stock record
      stock = await ConsumableStock.create({
        consumableItemId,
        quantity: parseFloat(quantity),
        unitPrice,
        unitPriceUSD: unitPriceUSD || item.unitPriceUSD,
        location,
        batchNumber,
        expiryDate,
        lastRestocked: new Date(),
        notes
      });
    }

    res.status(201).json({
      success: true,
      message: 'Stock added successfully',
      data: stock
    });
  } catch (error) {
    console.error('Error adding consumable stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add consumable stock',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/v1/consumables/stock/:id/adjust
 * @desc    Adjust stock quantity
 * @access  Private (Admin, Stores)
 */
router.put('/stock/:id/adjust', authenticate, authorize(['admin', 'stores']), auditLog('UPDATE', 'ConsumableStock'), async (req, res) => {
  try {
    const { type, adjustment, reason } = req.body;

    const stock = await ConsumableStock.findByPk(req.params.id);
    if (!stock) {
      return res.status(404).json({
        success: false,
        message: 'Stock record not found'
      });
    }

    let newQuantity = parseFloat(stock.quantity);
    if (type === 'add') {
      newQuantity += parseFloat(adjustment);
    } else if (type === 'remove') {
      newQuantity -= parseFloat(adjustment);
      if (newQuantity < 0) newQuantity = 0;
    } else if (type === 'set') {
      newQuantity = parseFloat(adjustment);
    }

    await stock.update({
      quantity: newQuantity,
      notes: reason ? `${stock.notes || ''}\n[${new Date().toISOString()}] ${type}: ${adjustment} - ${reason}` : stock.notes
    });

    res.json({
      success: true,
      message: 'Stock adjusted successfully',
      data: stock
    });
  } catch (error) {
    console.error('Error adjusting stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to adjust stock',
      error: error.message
    });
  }
});

// ===========================================
// CONSUMABLE REQUEST ROUTES
// ===========================================

/**
 * @route   GET /api/v1/consumables/requests
 * @desc    Get consumable requests
 * @access  Private
 */
router.get('/requests', authenticate, async (req, res) => {
  try {
    const { status, sectionId, departmentId, fromDate, toDate } = req.query;
    const user = req.user;

    const where = {};
    if (status) where.status = status;
    if (sectionId) where.sectionId = sectionId;
    if (departmentId) where.departmentId = departmentId;
    if (fromDate) where.requestDate = { [Op.gte]: new Date(fromDate) };
    if (toDate) where.requestDate = { ...where.requestDate, [Op.lte]: new Date(toDate) };

    // Role-based filtering
    if (user.role?.name === 'section-rep' && user.sectionId) {
      where.sectionId = user.sectionId;
    } else if ((user.role?.name === 'hod' || user.role?.name === 'department-rep') && user.departmentId) {
      where.departmentId = user.departmentId;
    }

    const requests = await ConsumableRequest.findAll({
      where,
      include: [
        { model: Section, as: 'section', include: [{ model: Department, as: 'department' }] },
        { model: Department, as: 'department' },
        {
          model: User,
          as: 'requestedBy',
          attributes: ['id', 'employeeId'],
          include: [{ model: Employee, as: 'employee', attributes: ['firstName', 'lastName', 'email'] }]
        },
        {
          model: User,
          as: 'hodApprover',
          attributes: ['id', 'employeeId'],
          include: [{ model: Employee, as: 'employee', attributes: ['firstName', 'lastName'] }]
        },
        {
          model: User,
          as: 'storesApprover',
          attributes: ['id', 'employeeId'],
          include: [{ model: Employee, as: 'employee', attributes: ['firstName', 'lastName'] }]
        },
        {
          model: ConsumableRequestItem,
          as: 'items',
          include: [{ model: ConsumableItem, as: 'consumableItem' }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Error fetching consumable requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch consumable requests',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/consumables/requests
 * @desc    Create a new consumable request
 * @access  Private (Section Rep)
 */
router.post('/requests', authenticate, authorize(['section-rep', 'hod', 'admin']), auditLog('CREATE', 'ConsumableRequest'), async (req, res) => {
  try {
    const { sectionId, items, priority, requiredByDate, purpose, notes } = req.body;

    if (!sectionId || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Section ID and at least one item are required'
      });
    }

    const section = await Section.findByPk(sectionId, {
      include: [{ model: Department, as: 'department' }]
    });

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }

    // Create request
    const request = await ConsumableRequest.create({
      sectionId,
      departmentId: section.departmentId,
      requestedById: req.user.id,
      priority: priority || 'normal',
      requiredByDate,
      purpose,
      notes,
      status: 'pending-hod-approval'
    });

    // Create request items
    let totalValue = 0;
    for (const item of items) {
      const consumableItem = await ConsumableItem.findByPk(item.consumableItemId);
      if (!consumableItem) continue;

      const unitPrice = consumableItem.unitPriceUSD || 0;
      const itemTotal = parseFloat(item.quantity) * unitPrice;
      totalValue += itemTotal;

      await ConsumableRequestItem.create({
        consumableRequestId: request.id,
        consumableItemId: item.consumableItemId,
        quantityRequested: item.quantity,
        unitPriceUSD: unitPrice,
        totalValueUSD: itemTotal,
        remarks: item.remarks
      });
    }

    await request.update({ totalValueUSD: totalValue });

    // Fetch complete request with items
    const fullRequest = await ConsumableRequest.findByPk(request.id, {
      include: [
        { model: Section, as: 'section', include: [{ model: Department, as: 'department' }] },
        { model: ConsumableRequestItem, as: 'items', include: [{ model: ConsumableItem, as: 'consumableItem' }] }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Consumable request created successfully',
      data: fullRequest
    });
  } catch (error) {
    console.error('Error creating consumable request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create consumable request',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/v1/consumables/requests/:id/approve-hod
 * @desc    HOD approves request
 * @access  Private (HOD)
 */
router.put('/requests/:id/approve-hod', authenticate, authorize(['hod', 'admin']), auditLog('UPDATE', 'ConsumableRequest'), async (req, res) => {
  try {
    const { comments, items } = req.body;

    const request = await ConsumableRequest.findByPk(req.params.id, {
      include: [{ model: ConsumableRequestItem, as: 'items' }]
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.status !== 'pending-hod-approval') {
      return res.status(400).json({
        success: false,
        message: 'Request is not pending HOD approval'
      });
    }

    // Update item quantities if modified by HOD
    if (items && Array.isArray(items)) {
      for (const itemUpdate of items) {
        const requestItem = request.items.find(i => i.id === itemUpdate.id);
        if (requestItem) {
          await requestItem.update({
            quantityApproved: itemUpdate.quantityApproved || requestItem.quantityRequested,
            status: 'approved'
          });
        }
      }
    } else {
      // Approve all items as requested
      for (const item of request.items) {
        await item.update({
          quantityApproved: item.quantityRequested,
          status: 'approved'
        });
      }
    }

    await request.update({
      status: 'stores-review',
      hodApproverId: req.user.id,
      hodApprovalDate: new Date(),
      hodComments: comments
    });

    res.json({
      success: true,
      message: 'Request approved by HOD',
      data: request
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
 * @route   PUT /api/v1/consumables/requests/:id/reject-hod
 * @desc    HOD rejects request
 * @access  Private (HOD)
 */
router.put('/requests/:id/reject-hod', authenticate, authorize(['hod', 'admin']), auditLog('UPDATE', 'ConsumableRequest'), async (req, res) => {
  try {
    const { comments } = req.body;

    const request = await ConsumableRequest.findByPk(req.params.id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    await request.update({
      status: 'hod-rejected',
      hodApproverId: req.user.id,
      hodApprovalDate: new Date(),
      hodComments: comments
    });

    res.json({
      success: true,
      message: 'Request rejected by HOD',
      data: request
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
 * @route   PUT /api/v1/consumables/requests/:id/fulfill
 * @desc    Stores fulfills request
 * @access  Private (Stores)
 */
router.put('/requests/:id/fulfill', authenticate, authorize(['stores', 'admin']), auditLog('UPDATE', 'ConsumableRequest'), async (req, res) => {
  try {
    const { comments, items } = req.body;

    const request = await ConsumableRequest.findByPk(req.params.id, {
      include: [
        { model: ConsumableRequestItem, as: 'items', include: [{ model: ConsumableItem, as: 'consumableItem' }] },
        { model: Section, as: 'section' }
      ]
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.status !== 'stores-review' && request.status !== 'hod-approved') {
      return res.status(400).json({
        success: false,
        message: 'Request is not ready for fulfillment'
      });
    }

    let allFulfilled = true;
    let anyFulfilled = false;

    // Process each item
    for (const requestItem of request.items) {
      const fulfillData = items?.find(i => i.id === requestItem.id);
      const quantityToFulfill = fulfillData?.quantityFulfilled || requestItem.quantityApproved || requestItem.quantityRequested;

      // Find stock
      const stock = await ConsumableStock.findOne({
        where: { consumableItemId: requestItem.consumableItemId }
      });

      if (!stock || parseFloat(stock.quantity) < parseFloat(quantityToFulfill)) {
        await requestItem.update({ status: 'partial' });
        allFulfilled = false;
        continue;
      }

      // Deduct from stock
      await stock.update({
        quantity: parseFloat(stock.quantity) - parseFloat(quantityToFulfill)
      });

      // Create allocation record
      await ConsumableAllocation.create({
        consumableRequestId: request.id,
        consumableItemId: requestItem.consumableItemId,
        sectionId: request.sectionId,
        departmentId: request.departmentId,
        issuedById: req.user.id,
        quantity: quantityToFulfill,
        unitPriceUSD: requestItem.unitPriceUSD,
        issueDate: new Date(),
        purpose: request.purpose
      });

      await requestItem.update({
        quantityFulfilled: quantityToFulfill,
        status: 'fulfilled'
      });

      anyFulfilled = true;
    }

    const newStatus = allFulfilled ? 'fulfilled' : (anyFulfilled ? 'partially-fulfilled' : 'stores-review');

    await request.update({
      status: newStatus,
      storesApproverId: req.user.id,
      storesApprovalDate: new Date(),
      storesComments: comments,
      fulfilledDate: allFulfilled ? new Date() : null
    });

    res.json({
      success: true,
      message: allFulfilled ? 'Request fulfilled successfully' : 'Request partially fulfilled',
      data: request
    });
  } catch (error) {
    console.error('Error fulfilling request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fulfill request',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/consumables/allocations
 * @desc    Get consumable allocation history
 * @access  Private
 */
router.get('/allocations', authenticate, async (req, res) => {
  try {
    const { sectionId, departmentId, fromDate, toDate } = req.query;

    const where = {};
    if (sectionId) where.sectionId = sectionId;
    if (departmentId) where.departmentId = departmentId;
    if (fromDate) where.issueDate = { [Op.gte]: new Date(fromDate) };
    if (toDate) where.issueDate = { ...where.issueDate, [Op.lte]: new Date(toDate) };

    const allocations = await ConsumableAllocation.findAll({
      where,
      include: [
        { model: ConsumableItem, as: 'consumableItem' },
        { model: Section, as: 'section', include: [{ model: Department, as: 'department' }] },
        // User model does not have a `name` column; include employee info instead
        { model: User, as: 'issuedBy', attributes: ['id', 'employeeId'], include: [{ model: Employee, as: 'employee', attributes: ['firstName', 'lastName', 'email'] }] }
      ],
      order: [['issueDate', 'DESC']]
    });

    res.json({
      success: true,
      data: allocations
    });
  } catch (error) {
    console.error('Error fetching allocations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch allocations',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/consumables/categories
 * @desc    Get distinct categories
 * @access  Private
 */
router.get('/categories', authenticate, async (req, res) => {
  try {
    const categories = await ConsumableItem.findAll({
      attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('category')), 'category']],
      raw: true
    });

    res.json({
      success: true,
      data: categories.map(c => c.category).filter(Boolean)
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
});

module.exports = router;
