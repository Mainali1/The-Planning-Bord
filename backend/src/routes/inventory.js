const express = require('express');
const { body } = require('express-validator');
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  updateProductQuantity,
  triggerAutoRestock
} = require('../controllers/inventoryController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const productValidation = [
  body('name').trim().isLength({ min: 1 }).withMessage('Product name is required'),
  body('category_id').isInt({ min: 1 }).withMessage('Category ID must be a positive integer'),
  body('supplier_id').isInt({ min: 1 }).withMessage('Supplier ID must be a positive integer'),
  body('current_quantity').isInt({ min: 0 }).withMessage('Current quantity must be a non-negative integer'),
  body('min_quantity').isInt({ min: 1 }).withMessage('Minimum quantity must be a positive integer'),
  body('auto_order_quantity').isInt({ min: 1 }).withMessage('Auto-order quantity must be a positive integer'),
  body('unit_price').optional().isFloat({ min: 0 }).withMessage('Unit price must be a non-negative number')
];

const quantityValidation = [
  body('quantityChange').isInt().withMessage('Quantity change must be an integer'),
  body('changeType').isIn(['sale', 'add', 'restock', 'return']).withMessage('Invalid change type'),
  body('notes').optional().trim()
];

router.use(authenticateToken);

router.get('/', getAllProducts);
router.get('/low-stock', getLowStockProducts);
router.get('/:id', getProductById);
router.post('/', productValidation, createProduct);
router.put('/:id', productValidation, updateProduct);
router.delete('/:id', deleteProduct);
router.post('/:id/quantity', quantityValidation, updateProductQuantity);
router.post('/auto-restock', triggerAutoRestock);

module.exports = router;