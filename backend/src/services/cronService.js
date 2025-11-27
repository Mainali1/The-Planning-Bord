const cron = require('node-cron');
const Product = require('../models/Product');
const { sendRestockEmail } = require('./emailService');

const startCronJobs = () => {
  cron.schedule('0 9 * * *', async () => {
    console.log('🔄 Running daily inventory check...');
    try {
      const lowStockProducts = await Product.getLowStockProducts();
      
      if (lowStockProducts.length > 0) {
        console.log(`📦 Found ${lowStockProducts.length} products with low stock`);
        
        for (const product of lowStockProducts) {
          const result = await sendRestockEmail(product);
          if (result.success) {
            console.log(`✅ Restock email sent for ${product.name}`);
          } else {
            console.error(`❌ Failed to send restock email for ${product.name}:`, result.message);
          }
        }
      } else {
        console.log('✅ All products have sufficient stock');
      }
    } catch (error) {
      console.error('❌ Error in daily inventory check:', error);
    }
  });

  cron.schedule('0 8 * * 1', async () => {
    console.log('🔄 Running weekly salary reminder check...');
    try {
      const knex = require('../config/database');
      const today = new Date();
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const unpaidSalaries = await knex('salaries')
        .join('employees', 'salaries.employee_id', 'employees.employee_id')
        .where('salaries.payment_cycle', 'weekly')
        .andWhere('salaries.last_paid_date', '<', lastWeek)
        .select(
          'employees.first_name',
          'employees.last_name',
          'employees.email',
          'salaries.amount',
          'salaries.last_paid_date'
        );

      if (unpaidSalaries.length > 0) {
        console.log(`💰 Found ${unpaidSalaries.length} employees with unpaid weekly salaries`);
        
        for (const salary of unpaidSalaries) {
          console.log(`📧 Salary reminder: ${salary.first_name} ${salary.last_name} - $${salary.amount}`);
        }
      }
    } catch (error) {
      console.error('❌ Error in weekly salary check:', error);
    }
  });

  cron.schedule('0 9 1 * *', async () => {
    console.log('🔄 Running monthly salary reminder check...');
    try {
      const knex = require('../config/database');
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
      
      const unpaidSalaries = await knex('salaries')
        .join('employees', 'salaries.employee_id', 'employees.employee_id')
        .where('salaries.payment_cycle', 'monthly')
        .andWhere('salaries.last_paid_date', '<', lastMonth)
        .select(
          'employees.first_name',
          'employees.last_name',
          'employees.email',
          'salaries.amount',
          'salaries.last_paid_date'
        );

      if (unpaidSalaries.length > 0) {
        console.log(`💰 Found ${unpaidSalaries.length} employees with unpaid monthly salaries`);
        
        for (const salary of unpaidSalaries) {
          console.log(`📧 Salary reminder: ${salary.first_name} ${salary.last_name} - $${salary.amount}`);
        }
      }
    } catch (error) {
      console.error('❌ Error in monthly salary check:', error);
    }
  });

  console.log('⏰ Cron jobs scheduled:');
  console.log('  - Daily inventory check: 9:00 AM');
  console.log('  - Weekly salary check: 8:00 AM every Monday');
  console.log('  - Monthly salary check: 9:00 AM on 1st of each month');
};

module.exports = {
  startCronJobs
};