const express = require('express');
const {
  getDashboardStats,
  getInventoryTrends,
  getAttendanceStats,
  getPaymentStats
} = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/stats', getDashboardStats);
router.get('/inventory-trends', getInventoryTrends);
router.get('/attendance-stats', getAttendanceStats);
router.get('/payment-stats', getPaymentStats);

module.exports = router;