const nodemailer = require('nodemailer');

let transporter = null;
let isEmailConfigured = false;

// Initialize email transporter only if all required credentials are present
if (process.env.EMAIL_HOST && process.env.EMAIL_PORT && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  try {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    isEmailConfigured = true;
    console.log('Email service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize email service:', error.message);
    isEmailConfigured = false;
  }
} else {
  console.log('Email service not configured - credentials missing');
}

const sendRestockEmail = async (product) => {
  if (!isEmailConfigured) {
    console.log('📧 Email service not configured - skipping restock email');
    return { success: false, message: 'Email service not configured' };
  }
  
  try {
    const businessName = process.env.BUSINESS_NAME || 'Your Business';
    const businessEmail = process.env.EMAIL_USER;
    
    const mailOptions = {
      from: `"${businessName}" <${businessEmail}>`,
      to: product.supplier_email,
      subject: `Restock Request: ${product.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Inventory Restock Request</h2>
          
          <p>Dear ${product.supplier_name},</p>
          
          <p>We hope this email finds you well. We are writing to request a restock of the following item:</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #555;">Product Details</h3>
            <p><strong>Product Name:</strong> ${product.name}</p>
            <p><strong>Current Stock:</strong> ${product.current_quantity} units</p>
            <p><strong>Minimum Required:</strong> ${product.min_quantity} units</p>
            <p><strong>Quantity to Order:</strong> ${product.auto_order_quantity} units</p>
          </div>
          
          <p><strong>Business Information:</strong></p>
          <p>${businessName}</p>
          <p>Email: ${businessEmail}</p>
          
          <p><strong>Preferred Delivery Date:</strong> ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
          
          <p>Please confirm the availability and pricing for this order at your earliest convenience.</p>
          
          <p>Best regards,<br>${businessName}</p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="font-size: 12px; color: #888;">
            This is an automated message from our inventory management system. 
            Please do not reply to this email directly.
          </p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    
    console.log(`📧 Restock email sent for ${product.name} to ${product.supplier_email}`);
    
    return {
      success: true,
      message: 'Email sent successfully',
      messageId: result.messageId
    };
  } catch (error) {
    console.error('❌ Error sending restock email:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

const sendTaskNotification = async (employee, task) => {
  if (!isEmailConfigured) {
    console.log('📧 Email service not configured - skipping task notification');
    return { success: false, message: 'Email service not configured' };
  }
  
  try {
    const mailOptions = {
      from: `"${process.env.BUSINESS_NAME || 'Your Business'}" <${process.env.EMAIL_USER}>`,
      to: employee.email,
      subject: `New Task Assigned: ${task.task_title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Task Assignment</h2>
          
          <p>Dear ${employee.first_name} ${employee.last_name},</p>
          
          <p>You have been assigned a new task:</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #555;">${task.task_title}</h3>
            <p>${task.task_description}</p>
            <p><strong>Due Date:</strong> ${new Date(task.due_date).toLocaleDateString()}</p>
          </div>
          
          <p>Please log in to your dashboard to view the complete details and update the task status.</p>
          
          <p>Best regards,<br>${process.env.BUSINESS_NAME || 'Your Business'}</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Task notification sent to ${employee.email}`);
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending task notification:', error);
    return { success: false, message: error.message };
  }
};

module.exports = {
  sendRestockEmail,
  sendTaskNotification,
  transporter
};