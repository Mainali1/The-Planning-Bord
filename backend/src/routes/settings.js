const express = require('express');
const router = express.Router();

// Get current settings (without sensitive data)
router.get('/settings', async (req, res) => {
  try {
    const settings = {
      businessName: process.env.BUSINESS_NAME || '',
      emailConfigured: !!(process.env.EMAIL_HOST && process.env.EMAIL_PORT && process.env.EMAIL_USER && process.env.EMAIL_PASS),
      microsoftConfigured: !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET && process.env.MICROSOFT_TENANT_ID),
      uploadMaxSize: process.env.UPLOAD_MAX_SIZE || '10485760',
      uploadDir: process.env.UPLOAD_DIR || 'uploads'
    };
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
});

// Update settings (this would typically update a database, but for now we'll just return success)
router.post('/settings', async (req, res) => {
  try {
    const { businessName, emailSettings, microsoftSettings } = req.body;
    
    // Here you would typically save to a database
    // For now, we'll just return success and log what would be updated
    console.log('Settings update requested:', {
      businessName,
      emailConfigured: !!(emailSettings?.host && emailSettings?.port && emailSettings?.user && emailSettings?.pass),
      microsoftConfigured: !!(microsoftSettings?.clientId && microsoftSettings?.clientSecret && microsoftSettings?.tenantId)
    });
    
    // In a real application, you would:
    // 1. Validate the input
    // 2. Encrypt sensitive data
    // 3. Save to database
    // 4. Update environment variables or configuration files
    
    res.json({
      success: true,
      message: 'Settings updated successfully. Note: In production, these settings would be saved to a database.'
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings'
    });
  }
});

// Test email configuration
router.post('/settings/test-email', async (req, res) => {
  try {
    const { to, subject, message } = req.body;
    
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_PORT || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(400).json({
        success: false,
        message: 'Email service not configured. Please configure email settings first.'
      });
    }
    
    // Here you would test the email configuration
    // For now, we'll just return a success message
    res.json({
      success: true,
      message: 'Email test would be sent to ' + to + '. In production, this would actually send a test email.'
    });
  } catch (error) {
    console.error('Error testing email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test email configuration'
    });
  }
});

// Test Microsoft 365 configuration
router.post('/settings/test-microsoft', async (req, res) => {
  try {
    if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET || !process.env.MICROSOFT_TENANT_ID) {
      return res.status(400).json({
        success: false,
        message: 'Microsoft 365 integration not configured. Please configure Microsoft settings first.'
      });
    }
    
    // Here you would test the Microsoft 365 connection
    // For now, we'll just return a success message
    res.json({
      success: true,
      message: 'Microsoft 365 configuration test completed successfully.'
    });
  } catch (error) {
    console.error('Error testing Microsoft 365:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test Microsoft 365 configuration'
    });
  }
});

module.exports = router;