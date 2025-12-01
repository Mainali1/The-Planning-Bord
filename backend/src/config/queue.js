const Queue = require('bull');
const Redis = require('redis');

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  family: 4,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined
};

// Create Redis client for health checks and general use
const redisClient = Redis.createClient(redisConfig);

// Queue instances with different priorities
const emailQueue = new Queue('email notifications', { 
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 10, // Keep last 10 completed jobs
    removeOnFail: 5,    // Keep last 5 failed jobs
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});

const inventoryQueue = new Queue('inventory sync', { 
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 20,
    removeOnFail: 10,
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 5000
    }
  }
});

const reportQueue = new Queue('report generation', { 
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 5,
    removeOnFail: 3,
    attempts: 2,
    delay: 1000, // 1 second delay for reports
    backoff: {
      type: 'exponential',
      delay: 10000 // 10 seconds
    }
  }
});

const fileQueue = new Queue('file processing', { 
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000
    }
  }
});

// Event listeners for monitoring
const setupQueueEvents = (queue, queueName) => {
  queue.on('completed', (job, result) => {
    console.log(`✅ ${queueName} job ${job.id} completed`, result);
  });

  queue.on('failed', (job, err) => {
    console.error(`❌ ${queueName} job ${job.id} failed:`, err.message);
  });

  queue.on('stalled', (job) => {
    console.warn(`⚠️ ${queueName} job ${job.id} stalled`);
  });

  queue.on('progress', (job, progress) => {
    console.log(`🔄 ${queueName} job ${job.id} progress:`, progress);
  });
};

// Setup event listeners for all queues
setupQueueEvents(emailQueue, 'Email');
setupQueueEvents(inventoryQueue, 'Inventory');
setupQueueEvents(reportQueue, 'Report');
setupQueueEvents(fileQueue, 'File');

// Health check function
async function checkRedisHealth() {
  try {
    await redisClient.ping();
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
  }
}

// Queue statistics
async function getQueueStats() {
  const stats = {};
  
  const queues = [
    { name: 'email', queue: emailQueue },
    { name: 'inventory', queue: inventoryQueue },
    { name: 'report', queue: reportQueue },
    { name: 'file', queue: fileQueue }
  ];

  for (const { name, queue } of queues) {
    try {
      const jobCounts = await queue.getJobCounts();
      stats[name] = {
        waiting: jobCounts.waiting,
        active: jobCounts.active,
        completed: jobCounts.completed,
        failed: jobCounts.failed,
        delayed: jobCounts.delayed,
        paused: jobCounts.paused
      };
    } catch (error) {
      stats[name] = { error: error.message };
    }
  }

  return stats;
}

// Graceful shutdown
async function closeAllQueues() {
  console.log('🔄 Closing all queue connections...');
  
  const queues = [emailQueue, inventoryQueue, reportQueue, fileQueue];
  
  for (const queue of queues) {
    try {
      await queue.close();
      console.log(`✅ Closed queue: ${queue.name}`);
    } catch (error) {
      console.error(`❌ Error closing queue ${queue.name}:`, error.message);
    }
  }

  try {
    await redisClient.quit();
    console.log('✅ Closed Redis client');
  } catch (error) {
    console.error('❌ Error closing Redis client:', error.message);
  }
}

// Handle application termination
process.on('SIGTERM', async () => {
  await closeAllQueues();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await closeAllQueues();
  process.exit(0);
});

module.exports = {
  redisClient,
  emailQueue,
  inventoryQueue,
  reportQueue,
  fileQueue,
  checkRedisHealth,
  getQueueStats,
  closeAllQueues
};