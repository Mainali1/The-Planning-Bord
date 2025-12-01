const { reportQueue } = require('../config/queue');
const logger = require('../utils/logger');
const knex = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

// Report generation processor
reportQueue.process('generate-report', async (job) => {
  const { businessId, reportType, filters = {}, userEmail, format = 'pdf' } = job.data;
  
  logger.info(`Processing report generation`, {
    businessId,
    reportType,
    format,
    jobId: job.id
  });

  try {
    const startTime = Date.now();
    
    // Update job progress
    await job.progress(10);
    
    // Generate report based on type
    let reportData;
    let reportTitle;
    
    switch (reportType) {
      case 'inventory-summary':
        reportData = await generateInventorySummary(businessId, filters);
        reportTitle = 'Inventory Summary Report';
        break;
        
      case 'sales-analysis':
        reportData = await generateSalesAnalysis(businessId, filters);
        reportTitle = 'Sales Analysis Report';
        break;
        
      case 'employee-attendance':
        reportData = await generateEmployeeAttendance(businessId, filters);
        reportTitle = 'Employee Attendance Report';
        break;
        
      case 'financial-summary':
        reportData = await generateFinancialSummary(businessId, filters);
        reportTitle = 'Financial Summary Report';
        break;
        
      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }
    
    await job.progress(50);
    
    // Generate the actual file
    const filePath = await generateReportFile(reportData, reportTitle, format, job.id);
    
    await job.progress(80);
    
    // Send email with report if email is provided
    if (userEmail) {
      await sendReportEmail(userEmail, reportTitle, filePath, format);
    }
    
    await job.progress(100);
    
    const duration = Date.now() - startTime;
    
    logger.info(`Report generated successfully`, {
      businessId,
      reportType,
      format,
      filePath,
      duration: `${duration}ms`,
      jobId: job.id
    });

    return {
      generated: true,
      reportType,
      format,
      filePath,
      duration,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    logger.error(`Report generation failed`, {
      businessId,
      reportType,
      error: error.message,
      jobId: job.id
    });
    
    throw error;
  }
});

// Inventory summary report generator
async function generateInventorySummary(businessId, filters) {
  logger.info(`Generating inventory summary for business ${businessId}`);
  
  // Get current inventory
  const inventory = await knex('products')
    .where({ business_id: businessId, is_active: true })
    .select('id', 'name', 'sku', 'category', 'stock_quantity', 'min_threshold', 'price')
    .orderBy('name');
  
  // Calculate summary statistics
  const totalProducts = inventory.length;
  const lowStockItems = inventory.filter(item => item.stock_quantity <= item.min_threshold).length;
  const outOfStockItems = inventory.filter(item => item.stock_quantity === 0).length;
  const totalValue = inventory.reduce((sum, item) => sum + (item.stock_quantity * item.price), 0);
  
  // Group by category
  const categoryStats = {};
  for (const item of inventory) {
    if (!categoryStats[item.category]) {
      categoryStats[item.category] = {
        count: 0,
        totalValue: 0,
        lowStock: 0
      };
    }
    
    categoryStats[item.category].count++;
    categoryStats[item.category].totalValue += item.stock_quantity * item.price;
    
    if (item.stock_quantity <= item.min_threshold) {
      categoryStats[item.category].lowStock++;
    }
  }
  
  return {
    type: 'inventory-summary',
    businessId,
    generatedAt: new Date().toISOString(),
    summary: {
      totalProducts,
      lowStockItems,
      outOfStockItems,
      totalValue: totalValue.toFixed(2)
    },
    categoryStats,
    inventory: inventory.map(item => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category,
      stockQuantity: item.stock_quantity,
      minThreshold: item.min_threshold,
      price: item.price,
      value: (item.stock_quantity * item.price).toFixed(2),
      status: item.stock_quantity === 0 ? 'out-of-stock' : 
              item.stock_quantity <= item.min_threshold ? 'low-stock' : 'ok'
    }))
  };
}

// Sales analysis report generator
async function generateSalesAnalysis(businessId, filters) {
  logger.info(`Generating sales analysis for business ${businessId}`);
  
  const { startDate, endDate } = filters;
  
  // Get sales data (you'll need to implement this based on your schema)
  // This is a placeholder implementation
  const salesData = await knex('payments')
    .where({ 
      business_id: businessId,
      status: 'completed'
    })
    .andWhereBetween('payment_date', [startDate || '2024-01-01', endDate || new Date().toISOString()])
    .select('id', 'amount', 'payment_date', 'payment_method', 'description')
    .orderBy('payment_date', 'desc');
  
  // Calculate summary statistics
  const totalSales = salesData.reduce((sum, sale) => sum + parseFloat(sale.amount), 0);
  const totalTransactions = salesData.length;
  const averageTransaction = totalSales / totalTransactions;
  
  // Group by payment method
  const methodStats = {};
  for (const sale of salesData) {
    if (!methodStats[sale.payment_method]) {
      methodStats[sale.payment_method] = {
        count: 0,
        total: 0
      };
    }
    
    methodStats[sale.payment_method].count++;
    methodStats[sale.payment_method].total += parseFloat(sale.amount);
  }
  
  return {
    type: 'sales-analysis',
    businessId,
    generatedAt: new Date().toISOString(),
    dateRange: { startDate, endDate },
    summary: {
      totalSales: totalSales.toFixed(2),
      totalTransactions,
      averageTransaction: averageTransaction.toFixed(2)
    },
    methodStats,
    sales: salesData.map(sale => ({
      id: sale.id,
      amount: sale.amount,
      date: sale.payment_date,
      method: sale.payment_method,
      description: sale.description
    }))
  };
}

// Employee attendance report generator
async function generateEmployeeAttendance(businessId, filters) {
  logger.info(`Generating employee attendance for business ${businessId}`);
  
  const { startDate, endDate, employeeId } = filters;
  
  // Get attendance data
  let query = knex('employees')
    .where({ business_id: businessId, is_active: true });
  
  if (employeeId) {
    query = query.where({ id: employeeId });
  }
  
  const employees = await query.select('id', 'first_name', 'last_name', 'position', 'email');
  
  // Get attendance records (you'll need to implement this based on your schema)
  // This is a placeholder implementation
  const attendanceData = [];
  
  return {
    type: 'employee-attendance',
    businessId,
    generatedAt: new Date().toISOString(),
    dateRange: { startDate, endDate },
    summary: {
      totalEmployees: employees.length,
      presentDays: 0,
      absentDays: 0
    },
    employees: employees.map(emp => ({
      id: emp.id,
      name: `${emp.first_name} ${emp.last_name}`,
      position: emp.position,
      email: emp.email
    })),
    attendance: attendanceData
  };
}

// Financial summary report generator
async function generateFinancialSummary(businessId, filters) {
  logger.info(`Generating financial summary for business ${businessId}`);
  
  const { startDate, endDate } = filters;
  
  // Get payment data
  const payments = await knex('payments')
    .where({ business_id: businessId })
    .andWhereBetween('payment_date', [startDate || '2024-01-01', endDate || new Date().toISOString()])
    .select('id', 'amount', 'payment_date', 'payment_method', 'status', 'description', 'type')
    .orderBy('payment_date', 'desc');
  
  // Calculate summary statistics
  const totalPayments = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
  const completedPayments = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const pendingPayments = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + parseFloat(p.amount), 0);
  
  // Group by payment type
  const typeStats = {};
  for (const payment of payments) {
    if (!typeStats[payment.type]) {
      typeStats[payment.type] = {
        count: 0,
        total: 0
      };
    }
    
    typeStats[payment.type].count++;
    typeStats[payment.type].total += parseFloat(payment.amount);
  }
  
  return {
    type: 'financial-summary',
    businessId,
    generatedAt: new Date().toISOString(),
    dateRange: { startDate, endDate },
    summary: {
      totalPayments: totalPayments.toFixed(2),
      completedPayments: completedPayments.toFixed(2),
      pendingPayments: pendingPayments.toFixed(2),
      totalTransactions: payments.length
    },
    typeStats,
    payments: payments.map(payment => ({
      id: payment.id,
      amount: payment.amount,
      date: payment.payment_date,
      method: payment.payment_method,
      status: payment.status,
      type: payment.type,
      description: payment.description
    }))
  };
}

// Generate report file
async function generateReportFile(reportData, reportTitle, format, jobId) {
  const reportsDir = path.join(__dirname, '../../reports');
  
  // Ensure reports directory exists
  await fs.mkdir(reportsDir, { recursive: true });
  
  const fileName = `${reportData.type}-${jobId}-${Date.now()}.${format}`;
  const filePath = path.join(reportsDir, fileName);
  
  if (format === 'json') {
    await fs.writeFile(filePath, JSON.stringify(reportData, null, 2));
  } else if (format === 'csv') {
    // Simple CSV generation for tabular data
    let csvContent = '';
    
    if (reportData.inventory) {
      // CSV header
      csvContent = 'Name,SKU,Category,Stock Quantity,Min Threshold,Price,Value,Status\n';
      
      // CSV rows
      for (const item of reportData.inventory) {
        csvContent += `"${item.name}","${item.sku}","${item.category}",${item.stockQuantity},${item.minThreshold},${item.price},${item.value},"${item.status}"\n`;
      }
    }
    
    await fs.writeFile(filePath, csvContent);
  } else {
    // For PDF, you'd typically use a library like puppeteer or pdfkit
    // For now, generate JSON and note that PDF generation would be implemented
    await fs.writeFile(filePath, JSON.stringify(reportData, null, 2));
    
    // Add a note about PDF format
    reportData.format_note = 'PDF generation would be implemented using puppeteer or similar library';
  }
  
  return filePath;
}

// Send report email
async function sendReportEmail(userEmail, reportTitle, filePath, format) {
  try {
    const QueueService = require('../services/queueService');
    
    // Queue the email instead of sending directly
    await QueueService.addReportEmail({
      userEmail,
      reportTitle,
      filePath,
      format
    });
    
    logger.info(`Report email queued successfully`, {
      userEmail,
      reportTitle,
      filePath
    });
  } catch (error) {
    logger.error(`Failed to queue report email`, {
      userEmail,
      reportTitle,
      error: error.message
    });
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Report worker received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Report worker received SIGINT, shutting down gracefully...');
  process.exit(0);
});

logger.info('📊 Report worker started and ready to process jobs');