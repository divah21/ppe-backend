const express = require('express');
const router = express.Router();
const { Stock, PPEItem } = require('../../models');
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
        quantity: {
          [Sequelize.Op.lte]: Sequelize.col('reorder_point')
        }
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
      reorderPoint: stock.reorderPoint,
      minLevel: stock.minLevel,
      maxLevel: stock.maxLevel,
      unit: stock.ppeItem.unit,
      location: stock.location,
      size: stock.size,
      color: stock.color,
      unitPriceUSD: parseFloat(stock.unitPriceUSD || 0),
      stockAccount: stock.stockAccount,
      deficit: stock.reorderPoint - stock.quantity
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

module.exports = router;
