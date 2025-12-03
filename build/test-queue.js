#!/usr/bin/env node

/**
 * Test script for Redis queue implementation
 * Run this to verify your Redis queue setup is working correctly
 */

const QueueService = require('./backend/src/services/queueService');
const { emailQueue, inventoryQueue, reportQueue, fileQueue } = require('./backend/src/config/queue');
const logger = require('./backend/src/utils/logger');

async function testQueues() {
  console.log('🚀 Starting Redis queue test...\n');

  try {
    // Test 1: Queue connection
    console.log('📡 Testing queue connections...');
    
    // Test email queue
    await emailQueue.isReady();
    console.log('✅ Email queue connected');
    
    // Test inventory queue
    await inventoryQueue.isReady();
    console.log('✅ Inventory queue connected');
    
    // Test report queue
    await reportQueue.isReady();
    console.log('✅ Report queue connected');
    
    // Test file queue
    await fileQueue.isReady();
    console.log('✅ File queue connected');

    // Test 2: Queue job processing
    console.log('\n📤 Testing job queueing...');
    
    // Test email job
    const emailJob = await QueueService.addWelcomeEmail({
      userEmail: 'test@example.com',
      userName: 'Test User'
    });
    console.log(`✅ Email job queued: ${emailJob.id}`);
    
    // Test inventory job
    const inventoryJob = await QueueService.addInventorySync({
      businessId: 123,
      externalSystem: 'test-system',
      syncType: 'test'
    });
    console.log(`✅ Inventory job queued: ${inventoryJob.id}`);
    
    // Test report job
    const reportJob = await QueueService.addReportGeneration({
      businessId: 123,
      reportType: 'inventory-summary',
      userEmail: 'manager@example.com'
    });
    console.log(`✅ Report job queued: ${reportJob.id}`);

    // Test 3: Job status checking
    console.log('\n📊 Testing job status...');
    
    // Wait a moment for jobs to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const emailStatus = await QueueService.getJobStatus(emailJob.id, 'email');
    console.log(`✅ Email job status: ${emailStatus}`);
    
    const inventoryStatus = await QueueService.getJobStatus(inventoryJob.id, 'inventory');
    console.log(`✅ Inventory job status: ${inventoryStatus}`);
    
    const reportStatus = await QueueService.getJobStatus(reportJob.id, 'report');
    console.log(`✅ Report job status: ${reportStatus}`);

    // Test 4: Queue statistics
    console.log('\n📈 Testing queue statistics...');
    
    const emailStats = await emailQueue.getJobCounts();
    console.log('📧 Email queue stats:', emailStats);
    
    const inventoryStats = await inventoryQueue.getJobCounts();
    console.log('📦 Inventory queue stats:', inventoryStats);
    
    const reportStats = await reportQueue.getJobCounts();
    console.log('📊 Report queue stats:', reportStats);
    
    const fileStats = await fileQueue.getJobCounts();
    console.log('📁 File queue stats:', fileStats);

    console.log('\n🎉 All queue tests completed successfully!');
    console.log('\n📚 Next steps:');
    console.log('1. Start your workers: npm run worker:email &');
    console.log('2. Check Bull Board monitoring: http://localhost:5000/admin/queues');
    console.log('3. Monitor worker logs: npm run workers:logs');
    
  } catch (error) {
    console.error('❌ Queue test failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Check if Redis is running: npm run redis:up');
    console.error('2. Verify Redis connection: redis-cli ping');
    console.error('3. Check Redis logs: npm run redis:logs');
    console.error('4. Ensure all dependencies are installed: npm install');
    process.exit(1);
  }
}

// Run the test
testQueues().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Test script error:', error);
  process.exit(1);
});