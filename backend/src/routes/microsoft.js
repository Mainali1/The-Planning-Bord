const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const microsoftController = require('../controllers/microsoftController');
const multer = require('multer');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticateToken);

// Email routes
router.post('/send-email', [
  body('to').isEmail().normalizeEmail(),
  body('subject').notEmpty().trim(),
  body('body').notEmpty(),
  body('importance').optional().isIn(['low', 'normal', 'high'])
], microsoftController.sendEmail);

// Calendar routes
router.post('/create-calendar-event', [
  body('subject').notEmpty().trim(),
  body('start').isISO8601(),
  body('end').isISO8601(),
  body('attendees').optional().isArray(),
  body('body').optional().trim()
], microsoftController.createCalendarEvent);

// OneDrive routes
router.post('/upload-file', upload.single('file'), microsoftController.uploadFile);
router.get('/files', microsoftController.getFiles);

// SharePoint routes
router.post('/create-sharepoint-item', [
  body('listName').notEmpty().trim(),
  body('itemData').isObject()
], microsoftController.createSharePointItem);

// Teams routes
router.get('/teams-messages', [
  body('teamId').notEmpty().trim(),
  body('channelId').notEmpty().trim(),
  body('limit').optional().isInt({ min: 1, max: 50 })
], microsoftController.getTeamsMessages);

router.post('/send-teams-message', [
  body('teamId').notEmpty().trim(),
  body('channelId').notEmpty().trim(),
  body('messageContent').notEmpty().trim()
], microsoftController.sendTeamsMessage);

// Business sync routes
router.post('/sync-inventory', [
  body('inventoryItems').isArray()
], microsoftController.syncInventoryToSharePoint);

router.post('/sync-employees', [
  body('employees').isArray()
], microsoftController.syncEmployeesToSharePoint);

// Status route
router.get('/status', (req, res) => {
  res.json({
    connected: !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
    features: [
      'outlook-email',
      'calendar-events',
      'onedrive-storage',
      'sharepoint-lists',
      'teams-messaging',
      'business-sync'
    ]
  });
});

module.exports = router;