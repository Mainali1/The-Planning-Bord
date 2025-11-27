const express = require('express');
const { body } = require('express-validator');
const {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  getSalaries,
  createSalary,
  updateSalary,
  getFinancialSummary
} = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const paymentValidation = [
  body('type').isIn(['supplier', 'salary', 'other']).withMessage('Payment type must be supplier, salary, or other'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('notes').optional().trim()
];

const salaryValidation = [
  body('employee_id').isInt({ min: 1 }).withMessage('Employee ID is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Salary amount must be a positive number'),
  body('payment_cycle').isIn(['monthly', 'weekly']).withMessage('Payment cycle must be monthly or weekly'),
  body('last_paid_date').optional().isISO8601()
];

router.use(authenticateToken);

router.get('/', getAllPayments);
router.get('/:id', getPaymentById);
router.post('/', paymentValidation, createPayment);
router.put('/:id', paymentValidation, updatePayment);
router.delete('/:id', deletePayment);

router.get('/salaries/all', getSalaries);
router.post('/salaries', salaryValidation, createSalary);
router.put('/salaries/:id', salaryValidation, updateSalary);

router.get('/summary', getFinancialSummary);

module.exports = router;