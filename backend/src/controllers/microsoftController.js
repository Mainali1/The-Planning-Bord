const microsoftService = require('../services/microsoftService');
const { validationResult } = require('express-validator');

class MicrosoftController {
  async sendEmail(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { to, subject, body, importance } = req.body;
      
      const result = await microsoftService.sendEmail(to, subject, body, importance);
      res.json(result);
    } catch (error) {
      console.error('Send email error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async createCalendarEvent(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { subject, start, end, attendees, body } = req.body;
      
      const event = await microsoftService.createCalendarEvent(subject, start, end, attendees, body);
      res.json({ success: true, event });
    } catch (error) {
      console.error('Create calendar event error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async uploadFile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { folderPath } = req.body;
      const fileName = req.file.originalname;
      const fileContent = req.file.buffer;
      
      const result = await microsoftService.uploadFileToOneDrive(fileName, fileContent, folderPath);
      res.json({ success: true, result });
    } catch (error) {
      console.error('Upload file error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getFiles(req, res) {
    try {
      const { folderPath } = req.query;
      
      const files = await microsoftService.getFilesFromOneDrive(folderPath);
      res.json({ success: true, files });
    } catch (error) {
      console.error('Get files error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async createSharePointItem(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { listName, itemData } = req.body;
      
      const item = await microsoftService.createSharePointListItem(listName, itemData);
      res.json({ success: true, item });
    } catch (error) {
      console.error('Create SharePoint item error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getTeamsMessages(req, res) {
    try {
      const { teamId, channelId, limit } = req.query;
      
      const messages = await microsoftService.getTeamsChannelMessages(teamId, channelId, limit);
      res.json({ success: true, messages });
    } catch (error) {
      console.error('Get Teams messages error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async sendTeamsMessage(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { teamId, channelId, messageContent } = req.body;
      
      const message = await microsoftService.sendTeamsMessage(teamId, channelId, messageContent);
      res.json({ success: true, message });
    } catch (error) {
      console.error('Send Teams message error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async syncInventoryToSharePoint(req, res) {
    try {
      const { inventoryItems } = req.body;
      
      if (!Array.isArray(inventoryItems)) {
        return res.status(400).json({ error: 'inventoryItems must be an array' });
      }

      const results = [];
      for (const item of inventoryItems) {
        const itemData = {
          Title: item.name,
          Quantity: item.quantity,
          Price: item.price,
          Category: item.category,
          LowStockThreshold: item.low_stock_threshold,
          Supplier: item.supplier
        };
        
        const result = await microsoftService.createSharePointListItem('Inventory', itemData);
        results.push(result);
      }
      
      res.json({ success: true, results });
    } catch (error) {
      console.error('Sync inventory to SharePoint error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async syncEmployeesToSharePoint(req, res) {
    try {
      const { employees } = req.body;
      
      if (!Array.isArray(employees)) {
        return res.status(400).json({ error: 'employees must be an array' });
      }

      const results = [];
      for (const employee of employees) {
        const itemData = {
          Title: `${employee.first_name} ${employee.last_name}`,
          Email: employee.email,
          Phone: employee.phone,
          Position: employee.position,
          Department: employee.department,
          Salary: employee.salary,
          HireDate: employee.hire_date
        };
        
        const result = await microsoftService.createSharePointListItem('Employees', itemData);
        results.push(result);
      }
      
      res.json({ success: true, results });
    } catch (error) {
      console.error('Sync employees to SharePoint error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new MicrosoftController();