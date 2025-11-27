const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// Placeholder routes for Microsoft 365 integration
router.get('/status', (req, res) => {
  res.json({
    connected: false,
    message: 'Microsoft 365 integration not yet implemented'
  });
});

router.post('/connect', (req, res) => {
  res.json({
    message: 'Microsoft 365 connection endpoint - implementation pending'
  });
});

router.post('/sync-onedrive', (req, res) => {
  res.json({
    message: 'OneDrive sync endpoint - implementation pending'
  });
});

router.post('/send-outlook-email', (req, res) => {
  res.json({
    message: 'Outlook email endpoint - implementation pending'
  });
});

module.exports = router;