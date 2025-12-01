const { emailQueue } = require('../config/queue');
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Email transporter configuration
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    logger.error('Email transporter configuration error:', error);
  } else {
    logger.info('Email transporter is ready');
  }
});

// Low stock alert email processor
emailQueue.process('low-stock-alert', async (job) => {
  const { productId, businessId, currentStock, minThreshold, productName, businessName } = job.data;
  
  logger.info(`Processing low-stock alert for product ${productId}`, {
    productId,
    businessId,
    currentStock,
    minThreshold
  });

  try {
    // Get business admin email (you'll need to implement this function)
    const adminEmail = await getBusinessAdminEmail(businessId);
    
    if (!adminEmail) {
      throw new Error(`No admin email found for business ${businessId}`);
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@planningbord.com',
      to: adminEmail,
      subject: `Low Stock Alert: ${productName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e53e3e;">⚠️ Low Stock Alert</h2>
          <p>Hello,</p>
          <p>This is to inform you that the following product is running low on stock:</p>
          
          <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2d3748;">${productName}</h3>
            <p><strong>Current Stock:</strong> ${currentStock} units</p>
            <p><strong>Minimum Threshold:</strong> ${minThreshold} units</p>
            <p><strong>Status:</strong> <span style="color: #e53e3e; font-weight: bold;">LOW STOCK</span></p>
          </div>
          
          <p>Please consider restocking this item to avoid running out of inventory.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #718096; font-size: 14px;">
              This is an automated notification from The Planning Bord.<br>
              Business: ${businessName}
            </p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    
    logger.info(`Low-stock alert email sent successfully`, {
      productId,
      businessId,
      messageId: result.messageId
    });

    return {
      sent: true,
      messageId: result.messageId,
      timestamp: new Date().toISOString(),
      recipient: adminEmail
    };
    
  } catch (error) {
    logger.error(`Failed to send low-stock alert email`, {
      productId,
      businessId,
      error: error.message
    });
    
    throw error; // Bull will handle retries based on queue configuration
  }
});

// Task assignment email processor
emailQueue.process('task-assignment', async (job) => {
  const { employeeId, taskDetails, employeeEmail, employeeName, managerName } = job.data;
  
  logger.info(`Processing task assignment email for employee ${employeeId}`, {
    employeeId,
    taskId: taskDetails.id
  });

  try {
    if (!employeeEmail) {
      throw new Error(`No email found for employee ${employeeId}`);
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@planningbord.com',
      to: employeeEmail,
      subject: `New Task Assigned: ${taskDetails.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3182ce;">📋 New Task Assignment</h2>
          <p>Hello ${employeeName},</p>
          <p>You have been assigned a new task:</p>
          
          <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2d3748;">${taskDetails.title}</h3>
            <p><strong>Description:</strong> ${taskDetails.description}</p>
            <p><strong>Priority:</strong> <span style="color: ${getPriorityColor(taskDetails.priority)};">${taskDetails.priority}</span></p>
            <p><strong>Due Date:</strong> ${new Date(taskDetails.dueDate).toLocaleDateString()}</p>
            <p><strong>Assigned by:</strong> ${managerName}</p>
          </div>
          
          <p>Please log in to your dashboard to view the complete task details and update your progress.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/tasks" 
               style="background-color: #3182ce; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Task
            </a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #718096; font-size: 14px;">
              This is an automated notification from The Planning Bord.<br>
              If you have questions, please contact your manager.
            </p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    
    logger.info(`Task assignment email sent successfully`, {
      employeeId,
      taskId: taskDetails.id,
      messageId: result.messageId
    });

    return {
      sent: true,
      messageId: result.messageId,
      timestamp: new Date().toISOString(),
      recipient: employeeEmail
    };
    
  } catch (error) {
    logger.error(`Failed to send task assignment email`, {
      employeeId,
      taskId: taskDetails.id,
      error: error.message
    });
    
    throw error;
  }
});

// Welcome email processor
emailQueue.process('welcome', async (job) => {
  const { userEmail, userName, businessName } = job.data;
  
  logger.info(`Processing welcome email for user`, {
    userEmail,
    businessName
  });

  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@planningbord.com',
      to: userEmail,
      subject: `Welcome to The Planning Bord!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3182ce;">🎉 Welcome to The Planning Bord!</h2>
          <p>Hello ${userName},</p>
          <p>Thank you for signing up for The Planning Bord. We're excited to help you manage your business more effectively.</p>
          
          <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2d3748;">Your Business: ${businessName}</h3>
            <p>You now have access to:</p>
            <ul>
              <li>📊 Comprehensive dashboard and analytics</li>
              <li>📦 Inventory management with low-stock alerts</li>
              <li>👥 Employee management and task assignment</li>
              <li>💰 Payment tracking and financial reporting</li>
              <li>📧 Microsoft 365 integration</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
               style="background-color: #3182ce; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Get Started
            </a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #718096; font-size: 14px;">
              If you have any questions, feel free to reach out to our support team.<br>
              Welcome aboard!
            </p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    
    logger.info(`Welcome email sent successfully`, {
      userEmail,
      messageId: result.messageId
    });

    return {
      sent: true,
      messageId: result.messageId,
      timestamp: new Date().toISOString(),
      recipient: userEmail
    };
    
  } catch (error) {
    logger.error(`Failed to send welcome email`, {
      userEmail,
      error: error.message
    });
    
    throw error;
  }
});

// Helper function to get priority color
function getPriorityColor(priority) {
  const colors = {
    low: '#38a169',
    medium: '#d69e2e',
    high: '#e53e3e',
    urgent: '#c53030'
  };
  return colors[priority?.toLowerCase()] || '#4a5568';
}

// Helper function to get business admin email (placeholder - implement based on your schema)
async function getBusinessAdminEmail(businessId) {
  // This is a placeholder function. You should implement this based on your database schema
  // For now, return a demo email
  return 'admin@demo.com';
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Email worker received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Email worker received SIGINT, shutting down gracefully...');
  process.exit(0);
});

logger.info('📧 Email worker started and ready to process jobs');