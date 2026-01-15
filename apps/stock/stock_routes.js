const express = require('express');
const router = express.Router();
const { Stock, PPEItem } = require('../../models');
const { sequelize } = require('../../database/db');
const { authenticate } = require('../../middlewares/auth_middleware');
const { requireRole } = require('../../middlewares/role_middleware');
const { auditLog } = require('../../middlewares/audit_middleware');
const { body, param } = require('express-validator');
const { validate } = require('../../middlewares/validation_middleware');
const { Op } = require('sequelize');
const { validateRequestedSize } = require('../../middlewares/size_validation');

/**
 * @route   GET /api/v1/stock
 * @desc    Get all stock items (grouped by PPE item with size variants)
 * @access  Private
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { ppeItemId, lowStock, search, page = 1, limit = 50, grouped = 'true' } = req.query;

    // If not grouped, return flat list (for backward compatibility)
    if (grouped !== 'true') {
      const where = {};
      if (ppeItemId) where.ppeItemId = ppeItemId;

      const include = [{
        model: PPEItem,
        as: 'ppeItem',
        ...(search && {
          where: {
            [Op.or]: [
              { name: { [Op.iLike]: `%${search}%` } },
              { itemCode: { [Op.iLike]: `%${search}%` } },
              { category: { [Op.iLike]: `%${search}%` } }
            ]
          }
        })
      }];

      const offset = (page - 1) * limit;
      const { count, rows: stockItems } = await Stock.findAndCountAll({
        where,
        include,
        limit: parseInt(limit),
        offset,
        order: [['updatedAt', 'DESC']]
      });

      return res.json({
        success: true,
        data: stockItems,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      });
    }

    // Grouped mode: aggregate stock by PPE item
    const ppeWhere = {};
    if (search) {
      ppeWhere[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { itemCode: { [Op.iLike]: `%${search}%` } },
        { category: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Get all stock items with their PPE items
    const allStock = await Stock.findAll({
      include: [{
        model: PPEItem,
        as: 'ppeItem',
        where: ppeWhere,
        required: true
      }],
      order: [['ppeItemId', 'ASC'], ['size', 'ASC']]
    });

    // Group by PPE item
    const groupedStock = {};
    allStock.forEach(stock => {
      const ppeId = stock.ppeItemId;
      if (!groupedStock[ppeId]) {
        groupedStock[ppeId] = {
          ppeItemId: ppeId,
          ppeItem: stock.ppeItem,
          totalQuantity: 0,
          minLevel: stock.minLevel,
          location: stock.location,
          unitCost: stock.unitCost,
          unitPriceUSD: stock.unitPriceUSD,
          stockAccount: stock.stockAccount,
          sizeVariants: [],
          lastRestocked: stock.lastRestocked,
          lastStockTake: stock.lastStockTake
        };
      }

      groupedStock[ppeId].totalQuantity += stock.quantity || 0;
      groupedStock[ppeId].sizeVariants.push({
        id: stock.id,
        size: stock.size,
        color: stock.color,
        quantity: stock.quantity,
        binLocation: stock.binLocation,
        batchNumber: stock.batchNumber,
        expiryDate: stock.expiryDate,
        notes: stock.notes
      });

      // Update latest dates
      if (stock.lastRestocked && (!groupedStock[ppeId].lastRestocked || stock.lastRestocked > groupedStock[ppeId].lastRestocked)) {
        groupedStock[ppeId].lastRestocked = stock.lastRestocked;
      }
      if (stock.lastStockTake && (!groupedStock[ppeId].lastStockTake || stock.lastStockTake > groupedStock[ppeId].lastStockTake)) {
        groupedStock[ppeId].lastStockTake = stock.lastStockTake;
      }
    });

    // Convert to array and apply pagination
    let groupedArray = Object.values(groupedStock);

    // Apply low stock filter if needed
    if (lowStock === 'true') {
      groupedArray = groupedArray.filter(item => item.totalQuantity <= item.minLevel);
    }

    const total = groupedArray.length;
    const offset = (page - 1) * limit;
    const paginatedItems = groupedArray.slice(offset, offset + parseInt(limit));

    res.json({
      success: true,
      data: paginatedItems,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/stock/stats
 * @desc    Get overall stock statistics (for all stock, not paginated)
 * @access  Private
 */
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    // Get all stock items aggregated
    const allStock = await Stock.findAll({
      include: [{
        model: PPEItem,
        as: 'ppeItem',
        required: true
      }]
    });

    // Group by PPE item to count unique items
    const groupedStock = {};
    let totalUnits = 0;
    let totalValue = 0;

    allStock.forEach(stock => {
      const ppeId = stock.ppeItemId;
      totalUnits += stock.quantity || 0;
      const unitPrice = parseFloat(stock.unitPriceUSD) || 0;
      totalValue += unitPrice * (stock.quantity || 0);

      if (!groupedStock[ppeId]) {
        groupedStock[ppeId] = {
          ppeItemId: ppeId,
          totalQuantity: 0,
          minLevel: stock.minLevel || 10
        };
      }
      groupedStock[ppeId].totalQuantity += stock.quantity || 0;
    });

    // Count low stock items
    const groupedArray = Object.values(groupedStock);
    const lowStockCount = groupedArray.filter(item => item.totalQuantity <= item.minLevel).length;

    res.json({
      success: true,
      data: {
        totalPPEItems: groupedArray.length,
        totalUnits,
        totalValue,
        lowStockItems: lowStockCount
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/stock/low-stock
 * @desc    Get low stock items
 * @access  Private (Stores)
 */
router.get('/low-stock', authenticate, requireRole('stores', 'admin'), async (req, res, next) => {
  try {
    const stockItems = await Stock.findAll({
      include: [{
        model: PPEItem,
        as: 'ppeItem'
      }],
      order: [
        [sequelize.literal('quantity - "minLevel"'), 'ASC']
      ]
    });

    const lowStock = stockItems.filter(item => item.quantity <= item.minLevel);

    res.json({
      success: true,
      data: lowStock,
      meta: {
        totalLowStock: lowStock.length,
        criticalStock: lowStock.filter(item => item.quantity === 0).length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/stock/out-of-stock
 * @desc    Get PPE items that are out of stock - includes both:
 *          1. Items that have been allocated but don't exist in stock
 *          2. Items needed for pending requests (approved, ready to fulfill) but have insufficient stock
 * @access  Private (Stores, Admin)
 */
router.get('/out-of-stock', authenticate, requireRole('stores', 'admin'), async (req, res, next) => {
  try {
    const { Allocation, Request, RequestItem } = require('../../models');
    
    // ============================================
    // 1. Get items from past allocations with no stock
    // ============================================
    const allocatedPPEItems = await Allocation.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('ppe_item_id')), 'ppeItemId']],
      raw: true
    });
    const allocatedPPEIds = allocatedPPEItems.map(a => a.ppeItemId).filter(Boolean);

    // Get all PPE items that have stock records with their quantities
    const stockRecords = await Stock.findAll({
      attributes: [
        'ppeItemId',
        'size',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity']
      ],
      group: ['ppeItemId', 'size'],
      raw: true
    });

    // Build stock map: ppeItemId -> { total: X, bySize: { size: qty } }
    const stockMap = {};
    stockRecords.forEach(s => {
      if (!stockMap[s.ppeItemId]) {
        stockMap[s.ppeItemId] = { total: 0, bySize: {} };
      }
      const qty = parseInt(s.totalQuantity) || 0;
      stockMap[s.ppeItemId].total += qty;
      if (s.size) {
        stockMap[s.ppeItemId].bySize[s.size] = (stockMap[s.ppeItemId].bySize[s.size] || 0) + qty;
      }
    });

    const stockedPPEIds = new Set(Object.keys(stockMap));

    // Find PPE items that are allocated but not in stock at all
    const noStockPPEIds = allocatedPPEIds.filter(id => !stockedPPEIds.has(id));

    // ============================================
    // 2. Get items from pending requests with insufficient stock
    // ============================================
    const pendingRequests = await Request.findAll({
      where: { 
        status: { [Op.in]: ['approved', 'stores-review'] } // Ready to fulfill or being reviewed by stores
      },
      include: [{
        model: RequestItem,
        as: 'items',
        include: [{
          model: PPEItem,
          as: 'ppeItem'
        }]
      }]
    });

    // Track items needed from pending requests that have insufficient stock
    const insufficientStockItems = new Map(); // ppeItemId:size -> { item, neededQty, availableQty, pendingRequests }
    
    for (const request of pendingRequests) {
      for (const reqItem of (request.items || [])) {
        if (!reqItem.ppeItem) continue;
        
        const ppeId = reqItem.ppeItemId;
        const neededQty = reqItem.approvedQuantity || reqItem.quantity || 1;
        const size = reqItem.size;
        
        // Check available stock - must match the exact size requested
        let availableQty = 0;
        if (stockMap[ppeId]) {
          if (size) {
            // If a specific size is requested, only count stock for that exact size
            availableQty = stockMap[ppeId].bySize[size] || 0;
          } else {
            // If no size specified, use total stock
            availableQty = stockMap[ppeId].total;
          }
        }
        
        // If insufficient stock for this item (size-specific)
        if (availableQty < neededQty) {
          const key = size ? `${ppeId}:${size}` : `${ppeId}:any`;
          
          if (!insufficientStockItems.has(key)) {
            insufficientStockItems.set(key, {
              ppeItem: reqItem.ppeItem,
              size: size,
              neededQty: 0,
              availableQty: availableQty,
              pendingRequestCount: 0,
              shortfall: 0
            });
          }
          
          const entry = insufficientStockItems.get(key);
          entry.neededQty += neededQty;
          entry.pendingRequestCount += 1;
          entry.shortfall = Math.max(0, entry.neededQty - entry.availableQty);
        }
      }
    }

    // ============================================
    // 3. Combine both sources of out-of-stock items
    // ============================================
    const outOfStockPPEIds = [...new Set([...noStockPPEIds, ...Array.from(insufficientStockItems.values()).map(i => i.ppeItem.id)])];

    if (outOfStockPPEIds.length === 0 && insufficientStockItems.size === 0) {
      return res.json({
        success: true,
        data: [],
        meta: {
          totalOutOfStock: 0,
          pendingRequestsBlocked: 0,
          message: 'All items have sufficient stock'
        }
      });
    }

    // Get details for out-of-stock PPE items
    const outOfStockItems = await PPEItem.findAll({
      where: { id: { [Op.in]: outOfStockPPEIds } },
      order: [['name', 'ASC']]
    });

    // Get allocation counts per item
    const allocationCounts = await Allocation.findAll({
      where: { ppeItemId: { [Op.in]: outOfStockPPEIds } },
      attributes: [
        'ppeItemId',
        [sequelize.fn('COUNT', sequelize.col('Allocation.id')), 'allocationCount'],
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalAllocated']
      ],
      group: ['ppeItemId'],
      raw: true
    });

    const allocationMap = {};
    allocationCounts.forEach(a => {
      allocationMap[a.ppeItemId] = {
        allocationCount: parseInt(a.allocationCount) || 0,
        totalAllocated: parseInt(a.totalAllocated) || 0
      };
    });

    // Format response - prioritize items needed for pending requests
    const formattedItems = [];
    const addedIds = new Set();

    // First add items with pending requests (more urgent)
    for (const [key, data] of insufficientStockItems) {
      const item = data.ppeItem;
      const itemKey = data.size ? `${item.id}:${data.size}` : item.id;
      
      if (!addedIds.has(itemKey)) {
        addedIds.add(itemKey);
        formattedItems.push({
          id: item.id,
          name: item.name,
          itemCode: item.itemCode,
          category: item.category,
          description: item.description,
          sizeScale: item.sizeScale,
          availableSizes: item.availableSizes,
          targetGender: item.targetGender,
          size: data.size || null,
          stockStatus: data.availableQty === 0 ? 'out_of_stock' : 'insufficient_stock',
          quantity: data.availableQty,
          neededQty: data.neededQty,
          shortfall: data.shortfall,
          minLevel: 10,
          allocationCount: allocationMap[item.id]?.allocationCount || 0,
          totalAllocated: allocationMap[item.id]?.totalAllocated || 0,
          pendingRequestCount: data.pendingRequestCount,
          needsReorder: true,
          urgent: true // Flag for pending requests
        });
      }
    }

    // Then add items from allocations that have no stock at all
    for (const item of outOfStockItems) {
      if (!addedIds.has(item.id) && noStockPPEIds.includes(item.id)) {
        addedIds.add(item.id);
        formattedItems.push({
          id: item.id,
          name: item.name,
          itemCode: item.itemCode,
          category: item.category,
          description: item.description,
          sizeScale: item.sizeScale,
          availableSizes: item.availableSizes,
          targetGender: item.targetGender,
          size: null,
          stockStatus: 'out_of_stock',
          quantity: 0,
          neededQty: 0,
          shortfall: 0,
          minLevel: 10,
          allocationCount: allocationMap[item.id]?.allocationCount || 0,
          totalAllocated: allocationMap[item.id]?.totalAllocated || 0,
          pendingRequestCount: 0,
          needsReorder: true,
          urgent: false
        });
      }
    }

    // Sort: urgent items first, then by name
    formattedItems.sort((a, b) => {
      if (a.urgent && !b.urgent) return -1;
      if (!a.urgent && b.urgent) return 1;
      return a.name.localeCompare(b.name);
    });

    const pendingRequestsBlocked = new Set(pendingRequests.filter(r => 
      (r.items || []).some(item => {
        const ppeId = item.ppeItemId;
        const size = item.size;
        const needed = item.approvedQuantity || item.quantity || 1;
        const available = stockMap[ppeId] 
          ? (size && stockMap[ppeId].bySize[size] !== undefined ? stockMap[ppeId].bySize[size] : stockMap[ppeId].total)
          : 0;
        return available < needed;
      })
    ).map(r => r.id)).size;

    res.json({
      success: true,
      data: formattedItems,
      meta: {
        totalOutOfStock: formattedItems.length,
        totalAllocationsWithoutStock: formattedItems.filter(i => !i.urgent).reduce((sum, i) => sum + i.allocationCount, 0),
        pendingRequestsBlocked,
        urgentItems: formattedItems.filter(i => i.urgent).length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/stock/:id
 * @desc    Get stock item by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const stock = await Stock.findByPk(req.params.id, {
      include: [{
        model: PPEItem,
        as: 'ppeItem'
      }]
    });

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: 'Stock item not found'
      });
    }

    res.json({
      success: true,
      data: stock
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/stock
 * @desc    Add stock item
 * @access  Private (Stores, Admin)
 */
router.post(
  '/',
  authenticate,
  requireRole('stores', 'admin'),
  [
    body('ppeItemId').isUUID().withMessage('Invalid PPE item ID'),
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a positive integer'),
    body('minLevel').isInt({ min: 0 }).withMessage('Min level must be a positive integer'),
    body('maxLevel').optional({ nullable: true }).isInt({ min: 0 }).withMessage('Max level must be a positive integer'),
    body('reorderPoint').optional({ nullable: true }).isInt({ min: 0 }).withMessage('Reorder point must be a positive integer'),
    body('unitCost').optional({ nullable: true }).custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      return !isNaN(parseFloat(value));
    }).withMessage('Unit cost must be a valid decimal'),
    body('unitPriceUSD').isDecimal({ decimal_digits: '0,2' }).withMessage('Unit price USD must be a valid decimal'),
    body('size').optional({ nullable: true }).isString().withMessage('Size must be a string'),
    body('color').optional({ nullable: true }).custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      return typeof value === 'string';
    }).withMessage('Color must be a string'),
    body('location').optional({ nullable: true }).isString().withMessage('Location must be a string'),
    body('binLocation').optional({ nullable: true }).isString().withMessage('Bin location must be a string'),
    body('supplier').optional({ nullable: true }).trim(),
    body('batchNumber').optional({ nullable: true }).trim(),
    body('expiryDate').optional({ nullable: true }).custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      return !isNaN(Date.parse(value));
    }).withMessage('Expiry date must be a valid date'),
    body('stockAccount').optional().isString().withMessage('Stock account must be a string'),
    body('notes').optional({ nullable: true }).isString().withMessage('Notes must be a string'),
    body('eligibleDepartments').optional().isArray().withMessage('Eligible departments must be an array'),
    body('eligibleDepartments.*').optional().isUUID().withMessage('Each department ID must be a UUID'),
    body('eligibleSections').optional().isArray().withMessage('Eligible sections must be an array'),
    body('eligibleSections.*').optional().isUUID().withMessage('Each section ID must be a UUID')
  ],
  validate,
  auditLog('CREATE', 'Stock'),
  async (req, res, next) => {
    try {
      const { 
        ppeItemId, quantity, minLevel, maxLevel, reorderPoint, unitCost, unitPriceUSD,
        supplier, batchNumber, size, color, location, binLocation, expiryDate, 
        stockAccount, notes, eligibleDepartments, eligibleSections 
      } = req.body;

      // Check if PPE item exists
      const ppeItem = await PPEItem.findByPk(ppeItemId);
      if (!ppeItem) {
        return res.status(404).json({
          success: false,
          message: 'PPE item not found'
        });
      }

      // Validate size against item's size scale
      if (size !== undefined) {
        const result = await validateRequestedSize(ppeItem, size);
        if (!result.valid) {
          return res.status(400).json({ success: false, message: result.message });
        }
      }

      // Check if stock entry already exists for this variant
      const existing = await Stock.findOne({ where: { ppeItemId, size: size || null, color: color || null, location: location || 'Main Store' } });
      
      let stock;
      let isUpdate = false;
      
      if (existing) {
        // Add quantity to existing stock entry
        // If new price differs from existing, update to new price (FIFO or weighted average can be implemented later)
        const updatedData = {
          quantity: existing.quantity + quantity,
          minLevel: minLevel || existing.minLevel,
          maxLevel: maxLevel || existing.maxLevel,
          reorderPoint: reorderPoint || existing.reorderPoint,
        };
        
        // Update price if provided (use latest price)
        if (unitPriceUSD) {
          updatedData.unitPriceUSD = unitPriceUSD;
        }
        if (unitCost) {
          updatedData.unitCost = unitCost;
        }
        if (supplier) {
          updatedData.supplier = supplier;
        }
        if (batchNumber) {
          updatedData.batchNumber = batchNumber;
        }
        if (expiryDate) {
          updatedData.expiryDate = expiryDate;
        }
        if (binLocation) {
          updatedData.binLocation = binLocation;
        }
        if (stockAccount) {
          updatedData.stockAccount = stockAccount;
        }
        if (notes) {
          updatedData.notes = notes;
        }
        if (eligibleDepartments) {
          updatedData.eligibleDepartments = eligibleDepartments;
        }
        if (eligibleSections) {
          updatedData.eligibleSections = eligibleSections;
        }
        
        await existing.update(updatedData);
        stock = existing;
        isUpdate = true;
      } else {
        // Create new stock entry
        stock = await Stock.create({
          ppeItemId,
          quantity,
          minLevel,
          maxLevel: maxLevel || null,
          reorderPoint: reorderPoint || null,
          unitCost: unitCost || null,
          unitPriceUSD,
          supplier: supplier || null,
          batchNumber: batchNumber || null,
          size: size || null,
          color: color || null,
          location: location || 'Main Store',
          binLocation: binLocation || null,
          expiryDate: expiryDate || null,
          stockAccount: stockAccount || null,
          notes: notes || null,
          eligibleDepartments: eligibleDepartments || null,
          eligibleSections: eligibleSections || null
        });
      }

      const createdStock = await Stock.findByPk(stock.id, {
        include: [{ model: PPEItem, as: 'ppeItem' }]
      });

      res.status(isUpdate ? 200 : 201).json({
        success: true,
        message: isUpdate ? 'Stock quantity added to existing entry' : 'Stock item created successfully',
        data: createdStock,
        wasUpdate: isUpdate
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/stock/:id
 * @desc    Update stock item
 * @access  Private (Stores, Admin)
 */
router.put(
  '/:id',
  authenticate,
  requireRole('stores', 'admin'),
  [
    param('id').isUUID().withMessage('Invalid stock ID'),
    body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be a positive integer'),
    body('minLevel').optional().isInt({ min: 0 }).withMessage('Min level must be a positive integer'),
    body('unitCost').optional().isDecimal({ decimal_digits: '0,2' }).withMessage('Unit cost must be a valid decimal'),
    body('supplier').optional().trim(),
    body('batchNumber').optional().trim()
  ],
  validate,
  auditLog('UPDATE', 'Stock'),
  async (req, res, next) => {
    try {
      const stock = await Stock.findByPk(req.params.id);

      if (!stock) {
        return res.status(404).json({
          success: false,
          message: 'Stock item not found'
        });
      }

      await stock.update(req.body);

      const updatedStock = await Stock.findByPk(stock.id, {
        include: [{ model: PPEItem, as: 'ppeItem' }]
      });

      res.json({
        success: true,
        message: 'Stock item updated successfully',
        data: updatedStock
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/stock/:id/adjust
 * @desc    Adjust stock quantity (add or remove)
 * @access  Private (Stores, Admin)
 */
router.put(
  '/:id/adjust',
  authenticate,
  requireRole('stores', 'admin'),
  [
    param('id').isUUID().withMessage('Invalid stock ID'),
    body('adjustment').isInt().withMessage('Adjustment must be an integer'),
    body('reason').trim().notEmpty().withMessage('Reason is required')
  ],
  validate,
  auditLog('UPDATE', 'Stock'),
  async (req, res, next) => {
    try {
      const { adjustment, reason } = req.body;

      const stock = await Stock.findByPk(req.params.id, {
        include: [{ model: PPEItem, as: 'ppeItem' }]
      });

      if (!stock) {
        return res.status(404).json({
          success: false,
          message: 'Stock item not found'
        });
      }

      const newQuantity = stock.quantity + adjustment;

      if (newQuantity < 0) {
        return res.status(400).json({
          success: false,
          message: 'Adjustment would result in negative stock'
        });
      }

      await stock.update({ quantity: newQuantity });

      res.json({
        success: true,
        message: `Stock adjusted successfully. ${adjustment > 0 ? 'Added' : 'Removed'} ${Math.abs(adjustment)} units.`,
        data: stock,
        meta: {
          adjustment,
          reason,
          previousQuantity: stock.quantity - adjustment,
          newQuantity: stock.quantity
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/stock/:id
 * @desc    Delete stock item
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('admin','stores',),
  auditLog('DELETE', 'Stock'),
  async (req, res, next) => {
    try {
      const stock = await Stock.findByPk(req.params.id);

      if (!stock) {
        return res.status(404).json({
          success: false,
          message: 'Stock item not found'
        });
      }

      await stock.destroy();

      res.json({
        success: true,
        message: 'Stock item deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/stock/bulk-delete
 * @desc    Bulk delete stock items (for deleting all variants of an item)
 * @access  Private (Admin only)
 */
router.post(
  '/bulk-delete',
  authenticate,
  requireRole('admin','stores'),
  [
    body('ids').isArray({ min: 1 }).withMessage('IDs must be a non-empty array'),
    body('ids.*').isUUID().withMessage('Each ID must be a valid UUID')
  ],
  validate,
  auditLog('BULK_DELETE', 'Stock'),
  async (req, res, next) => {
    try {
      const { ids } = req.body;

      const deletedCount = await Stock.destroy({
        where: {
          id: ids
        }
      });

      res.json({
        success: true,
        message: `Successfully deleted ${deletedCount} stock item(s)`,
        data: { deletedCount }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/stock/bulk-upload
 * @desc    Bulk upload inventory stock from Excel data
 * @access  Private (Stores, Admin)
 * 
 * Expected Excel columns:
 * - ITMREF_0: Item Reference Code (matches ppeItem.itemRefCode)
 * - ITMDES1_0: Full description with size/color variant info
 * - Product Name: Generic product name
 * - Category: Unit of measure (EA, KG, M, UN)
 * - Acc Code: Account code (PPEQ, PSS05, etc.)
 * - DES_0: Account description
 * - Quantity: Stock quantity (optional, default 0)
 * - Unit Price: Unit price in USD (optional)
 * - Min Level: Minimum stock level (optional, default 10)
 * - Location: Storage location (optional, default 'Main Store')
 * - Expiry Date: Expiry/replacement date (optional)
 */
router.post(
  '/bulk-upload',
  authenticate,
  requireRole('stores', 'admin'),
  [
    body('items').isArray({ min: 1 }).withMessage('Items array is required'),
    body('items.*.itemRefCode').trim().notEmpty().withMessage('Item reference code (ITMREF_0) is required'),
    body('updateExisting').optional().isBoolean().withMessage('updateExisting must be a boolean'),
  ],
  validate,
  auditLog('BULK_UPLOAD', 'Stock'),
  async (req, res, next) => {
    try {
      const { items, updateExisting = false } = req.body;

      const results = {
        created: [],
        updated: [],
        skipped: [],
        errors: [],
        catalogCreated: []  // Track auto-created PPE catalogue items
      };

      // Size patterns to extract from descriptions
      const sizePatterns = [
        // Numeric sizes like "SIZE 38", "SIZE 40", etc.
        /SIZE\s*(\d+)/i,
        // Alpha sizes like "SIZE MEDIUM", "SIZE LARGE", etc.
        /SIZE\s*(SMALL|S|MEDIUM|M|LARGE|L|XL|XXL|XXXL|XXXXL|X-LARGE|XX-LARGE)/i,
        // Foot sizes at the end like "SIZE 6", "SIZE 7", etc.
        /SIZE\s*(\d+)$/i,
        // Sizes in parentheses like "(medium)", "(large)", "(X-large)"
        /\((SMALL|MEDIUM|LARGE|X-LARGE|XL|XXL|XXXL|S|M|L)\)/i,
      ];

      // Color patterns
      const colorKeywords = [
        'NAVY', 'BLUE', 'GREEN', 'WHITE', 'RED', 'YELLOW', 'ORANGE', 'BLACK', 
        'GRAY', 'GREY', 'LIME', 'PINK', 'BROWN', 'CLEAR', 'DARK'
      ];

      // Helper function to extract size from description
      const extractSize = (description) => {
        if (!description) return null;
        const upperDesc = description.toUpperCase();
        
        for (const pattern of sizePatterns) {
          const match = upperDesc.match(pattern);
          if (match) {
            return match[1].toUpperCase();
          }
        }
        return null;
      };

      // Helper function to extract color from description
      const extractColor = (description) => {
        if (!description) return null;
        const upperDesc = description.toUpperCase();
        
        for (const color of colorKeywords) {
          if (upperDesc.includes(color)) {
            return color.charAt(0) + color.slice(1).toLowerCase();
          }
        }
        return null;
      };

      // Normalize size value for consistency
      const normalizeSize = (size) => {
        if (!size) return null;
        const upper = size.toUpperCase().trim();
        
        // Map text sizes to standard codes
        const sizeMap = {
          'SMALL': 'S',
          'MEDIUM': 'M',
          'LARGE': 'L',
          'X-LARGE': 'XL',
          'XX-LARGE': 'XXL',
          'XXX-LARGE': 'XXXL',
          'XXXX-LARGE': 'XXXXL',
        };
        
        return sizeMap[upper] || upper;
      };

      for (const item of items) {
        try {
          const { 
            itemRefCode, 
            fullDescription,  // ITMDES1_0
            productName,      // Product Name
            unit,             // Category (actually unit of measure)
            accountCode,      // Acc Code
            accountDescription, // DES_0
            quantity = 0,
            unitPrice,
            minLevel = 10,
            location = 'Main Store',
            expiryDate,
            batchNumber,
            size: itemSize,    // Size from Excel
            color: itemColor   // Color from Excel
          } = item;

          // Find the PPE item using multiple matching strategies
          let ppeItem = null;
          let matchedBy = '';

          // Strategy 1: Try exact match by itemRefCode
          if (itemRefCode) {
            ppeItem = await PPEItem.findOne({ where: { itemRefCode } });
            if (ppeItem) matchedBy = 'itemRefCode';
          }

          // Strategy 2: Try exact match by itemCode
          if (!ppeItem && itemRefCode) {
            ppeItem = await PPEItem.findOne({ where: { itemCode: itemRefCode } });
            if (ppeItem) matchedBy = 'itemCode';
          }

          // Strategy 3: Try matching by product name (exact match, case insensitive)
          if (!ppeItem && productName) {
            const cleanProductName = productName.trim().toUpperCase();
            ppeItem = await PPEItem.findOne({ 
              where: sequelize.where(
                sequelize.fn('UPPER', sequelize.col('name')), 
                cleanProductName
              )
            });
            if (ppeItem) matchedBy = 'exactName';
          }

          // Strategy 4: Try partial match on product name (contains)
          if (!ppeItem && productName) {
            // Remove size info from product name for better matching
            const baseProductName = productName
              .replace(/SIZE\s*\d+/gi, '')
              .replace(/SIZE\s*(S|M|L|XL|XXL|XXXL|SMALL|MEDIUM|LARGE)/gi, '')
              .replace(/\s+/g, ' ')
              .trim()
              .toUpperCase();
            
            if (baseProductName.length > 3) {
              ppeItem = await PPEItem.findOne({ 
                where: sequelize.where(
                  sequelize.fn('UPPER', sequelize.col('name')), 
                  { [Op.like]: `%${baseProductName}%` }
                )
              });
              if (ppeItem) matchedBy = 'partialName';
            }
          }

          // Strategy 5: Try matching by description keywords
          if (!ppeItem && fullDescription) {
            // Extract key product words from description
            const descWords = fullDescription
              .toUpperCase()
              .replace(/[,()]/g, ' ')
              .split(/\s+/)
              .filter(w => w.length > 3)
              .slice(0, 3)  // Take first 3 significant words
              .join('%');
            
            if (descWords.length > 3) {
              ppeItem = await PPEItem.findOne({ 
                where: sequelize.where(
                  sequelize.fn('UPPER', sequelize.col('name')), 
                  { [Op.like]: `%${descWords}%` }
                )
              });
              if (ppeItem) matchedBy = 'description';
            }
          }

          // If PPE item not found, auto-create it in the catalogue
          if (!ppeItem) {
            try {
              // Determine category from common PPE types based on product name
              const determinePPECategory = (name, description) => {
                const text = `${name || ''} ${description || ''}`.toUpperCase();
                
                if (text.includes('GLOVE') || text.includes('MITTEN')) return 'HANDS';
                if (text.includes('SHOE') || text.includes('BOOT') || text.includes('GUMBOOT') || text.includes('GUM SHOE') || text.includes('SPAT')) return 'FEET';
                if (text.includes('HELMET') || text.includes('HARD HAT') || text.includes('CAP') || text.includes('VISOR') || text.includes('LINER')) return 'HEAD';
                if (text.includes('GLASS') || text.includes('GOGGLE') || text.includes('SHIELD') || text.includes('FACE')) return 'EYES/FACE';
                if (text.includes('EAR') || text.includes('MUFF') || text.includes('PLUG')) return 'EARS';
                if (text.includes('MASK') || text.includes('RESPIRATOR') || text.includes('FILTER')) return 'RESPIRATORY';
                if (text.includes('WORKSUIT') || text.includes('OVERALL') || text.includes('JACKET') || text.includes('TROUSER') || text.includes('SHIRT') || text.includes('APRON') || text.includes('SUIT')) return 'BODY/TORSO';
                if (text.includes('BELT') || text.includes('KIDNEY')) return 'BODY/TORSO';
                if (text.includes('LIFE JACKET') || text.includes('THERMAL')) return 'FULL BODY';
                return 'GENERAL';
              };

              // Determine if item has size variants based on product type
              const determineHasSizes = (name, description) => {
                const text = `${name || ''} ${description || ''}`.toUpperCase();
                
                // Items that typically have sizes
                if (text.includes('WORKSUIT') || text.includes('OVERALL') || text.includes('JACKET') || 
                    text.includes('TROUSER') || text.includes('SHIRT') || text.includes('SHOE') || 
                    text.includes('BOOT') || text.includes('GLOVE') || text.includes('SUIT')) {
                  return true;
                }
                return false;
              };

              // Generate a unique item code if not provided
              const generateItemCode = async (baseName) => {
                const prefix = baseName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
                const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
                const code = `${prefix}-${randomSuffix}`;
                
                // Check if code exists
                const existing = await PPEItem.findOne({ where: { itemCode: code } });
                if (existing) {
                  // Retry with different suffix
                  const newSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
                  return `${prefix}-${newSuffix}`;
                }
                return code;
              };

              const category = determinePPECategory(productName, fullDescription);
              const hasSizeVariants = determineHasSizes(productName, fullDescription);
              const itemCode = await generateItemCode(productName || 'PPE');

              // Create the PPE catalogue item
              ppeItem = await PPEItem.create({
                itemCode,
                itemRefCode: itemRefCode || null,
                name: productName || fullDescription?.substring(0, 100) || 'Unknown Item',
                productName: fullDescription?.substring(0, 255) || productName,
                itemType: 'PPE',
                category,
                description: fullDescription,
                unit: unit || 'EA',
                accountCode: accountCode || 'PPEQ',
                accountDescription: accountDescription || 'Personal Protective Equipment',
                hasSizeVariants,
                hasColorVariants: false,
                isActive: true
              });

              matchedBy = 'auto-created';
              results.catalogCreated.push({
                id: ppeItem.id,
                itemCode: ppeItem.itemCode,
                itemRefCode: ppeItem.itemRefCode,
                name: ppeItem.name,
                category: ppeItem.category,
                hasSizeVariants: ppeItem.hasSizeVariants
              });
            } catch (createError) {
              results.errors.push({
                itemRefCode,
                fullDescription,
                productName,
                error: `Failed to auto-create PPE catalogue item: ${createError.message}`
              });
              continue;
            }
          }

          // Extract size and color - prefer Excel values over extracted from description
          const extractedSize = normalizeSize(itemSize) || normalizeSize(extractSize(fullDescription)) || null;
          const extractedColor = itemColor || extractColor(fullDescription) || null;
          
          // Parse expiry date properly (handles Excel date formats)
          let parsedExpiryDate = null;
          if (expiryDate) {
            // Handle various date formats from Excel
            if (typeof expiryDate === 'number') {
              // Excel serial date number
              const date = new Date((expiryDate - 25569) * 86400 * 1000);
              if (!isNaN(date.getTime())) {
                parsedExpiryDate = date;
              }
            } else if (typeof expiryDate === 'string' && expiryDate.trim()) {
              const date = new Date(expiryDate);
              if (!isNaN(date.getTime())) {
                parsedExpiryDate = date;
              }
            } else if (expiryDate instanceof Date) {
              parsedExpiryDate = expiryDate;
            }
          }

          // Check if stock entry already exists for this variant
          // Use itemRefCode as batchNumber for uniqueness - each Excel row with unique ITMREF_0 gets its own stock entry
          const stockBatchNumber = itemRefCode || batchNumber || null;
          
          const existingStock = await Stock.findOne({
            where: {
              ppeItemId: ppeItem.id,
              size: extractedSize,
              color: extractedColor,
              location: location || 'Main Store',
              batchNumber: stockBatchNumber
            }
          });

          if (existingStock) {
            if (updateExisting) {
              // Update existing stock
              await existingStock.update({
                quantity: parseInt(quantity) || existingStock.quantity,
                unitPriceUSD: unitPrice ? parseFloat(unitPrice) : existingStock.unitPriceUSD,
                unitCost: unitPrice ? parseFloat(unitPrice) : existingStock.unitCost,
                minLevel: parseInt(minLevel) || existingStock.minLevel,
                stockAccount: accountCode || existingStock.stockAccount,
                expiryDate: parsedExpiryDate || existingStock.expiryDate,
                batchNumber: batchNumber || existingStock.batchNumber,
                lastRestocked: new Date()
              });
              results.updated.push({
                itemRefCode,
                ppeItemName: ppeItem.name,
                matchedBy,
                size: extractedSize,
                color: extractedColor,
                quantity: parseInt(quantity) || existingStock.quantity
              });
            } else {
              results.skipped.push({
                itemRefCode,
                ppeItemName: ppeItem.name,
                matchedBy,
                size: extractedSize,
                color: extractedColor,
                reason: 'Stock entry already exists for this variant. Enable "Update Existing" to modify.'
              });
            }
          } else {
            // Create new stock entry
            // Use itemRefCode as batchNumber to ensure each unique ITMREF_0 creates a separate stock entry
            const newStock = await Stock.create({
              ppeItemId: ppeItem.id,
              quantity: parseInt(quantity) || 0,
              minLevel: parseInt(minLevel) || 10,
              unitCost: unitPrice ? parseFloat(unitPrice) : null,
              unitPriceUSD: unitPrice ? parseFloat(unitPrice) : 0,
              size: extractedSize,
              color: extractedColor,
              location: location || 'Main Store',
              stockAccount: accountCode || null,
              expiryDate: parsedExpiryDate,
              batchNumber: stockBatchNumber,
              notes: fullDescription || null,
              lastRestocked: quantity > 0 ? new Date() : null
            });

            results.created.push({
              id: newStock.id,
              itemRefCode,
              ppeItemName: ppeItem.name,
              matchedBy,
              size: extractedSize,
              color: extractedColor,
              quantity: parseInt(quantity) || 0,
              unitPrice: unitPrice ? parseFloat(unitPrice) : 0
            });
          }
        } catch (err) {
          results.errors.push({
            itemRefCode: item.itemRefCode,
            fullDescription: item.fullDescription,
            error: err.message
          });
        }
      }

      res.status(201).json({
        success: true,
        message: `Bulk upload completed: ${results.created.length} stock created, ${results.updated.length} updated, ${results.skipped.length} skipped, ${results.catalogCreated.length} PPE items auto-created, ${results.errors.length} errors`,
        data: results,
        summary: {
          total: items.length,
          created: results.created.length,
          updated: results.updated.length,
          skipped: results.skipped.length,
          catalogCreated: results.catalogCreated.length,
          errors: results.errors.length
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/stock/bulk-topup
 * @desc    Bulk top-up existing stock items (for restocking from new orders)
 * @access  Private (Stores, Admin)
 * 
 * Expected columns:
 * - Stock ID: UUID of the stock variant to top up
 * - Item Name: For reference (not used for matching if stockId provided)
 * - Size: Size variant (used if stockId not provided)
 * - Color: Color variant (used if stockId not provided)
 * - Top Up Qty: Quantity to add
 * - Reason: Reason for top-up
 */
router.post(
  '/bulk-topup',
  authenticate,
  requireRole('stores', 'admin'),
  [
    body('items').isArray({ min: 1 }).withMessage('Items array is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  ],
  validate,
  auditLog('BULK_TOPUP', 'Stock'),
  async (req, res, next) => {
    try {
      const { items } = req.body;

      const results = {
        success: [],
        notFound: [],
        errors: []
      };

      for (const item of items) {
        try {
          const { stockId, itemName, size, color, quantity, reason = 'Bulk top-up' } = item;

          let stock = null;

          // Strategy 1: Find by stockId (most accurate)
          if (stockId) {
            stock = await Stock.findByPk(stockId, {
              include: [{ model: PPEItem, as: 'ppeItem' }]
            });
          }

          // Strategy 2: Find by itemName + size + color
          if (!stock && itemName) {
            // First find the PPE item
            const ppeItem = await PPEItem.findOne({
              where: sequelize.where(
                sequelize.fn('UPPER', sequelize.col('name')),
                { [Op.like]: `%${itemName.toUpperCase()}%` }
              )
            });

            if (ppeItem) {
              const whereClause = {
                ppeItemId: ppeItem.id,
              };
              
              if (size) whereClause.size = size;
              if (color) whereClause.color = color;

              stock = await Stock.findOne({
                where: whereClause,
                include: [{ model: PPEItem, as: 'ppeItem' }]
              });
            }
          }

          if (!stock) {
            results.notFound.push({
              stockId,
              itemName,
              size,
              color,
              quantity,
              error: 'Stock item not found'
            });
            continue;
          }

          // Update stock quantity
          const previousQty = stock.quantity || 0;
          const newQuantity = previousQty + parseInt(quantity);

          await stock.update({
            quantity: newQuantity,
            lastRestocked: new Date(),
            notes: stock.notes 
              ? `${stock.notes}\n[${new Date().toISOString().split('T')[0]}] ${reason}: +${quantity}`
              : `[${new Date().toISOString().split('T')[0]}] ${reason}: +${quantity}`
          });

          results.success.push({
            stockId: stock.id,
            itemName: stock.ppeItem?.name || itemName,
            size: stock.size,
            color: stock.color,
            previousQty,
            addedQty: parseInt(quantity),
            newQuantity,
            reason
          });

        } catch (err) {
          results.errors.push({
            stockId: item.stockId,
            itemName: item.itemName,
            error: err.message
          });
        }
      }

      res.status(200).json({
        success: true,
        message: `Bulk top-up completed: ${results.success.length} topped up, ${results.notFound.length} not found, ${results.errors.length} errors`,
        data: results,
        summary: {
          total: items.length,
          success: results.success.length,
          notFound: results.notFound.length,
          errors: results.errors.length
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
