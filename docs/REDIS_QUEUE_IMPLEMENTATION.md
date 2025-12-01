# Redis Queue Implementation Guide

## Overview

This document outlines the implementation of Redis and background job queues for The Planning Bord to handle asynchronous tasks efficiently.

## Why Redis/Queue?

### Current Challenges
1. **Email Notifications**: Currently sent synchronously, blocking user requests
2. **Large File Processing**: CSV imports/exports block the main thread
3. **Inventory Checks**: Background sync with external systems
4. **Report Generation**: Large reports timeout during generation
5. **Microsoft 365 Sync**: Synchronous API calls slow down user actions

### Benefits
- **Improved Performance**: Non-blocking request handling
- **Better User Experience**: Faster response times
- **Scalability**: Handle increased load with job workers
- **Reliability**: Retry failed jobs automatically
- **Monitoring**: Track job status and performance

## Recommended Architecture

### Tech Stack
- **Bull**: Redis-based queue for Node.js (most popular, well-maintained)
- **Redis**: In-memory data structure store
- **Bull Board**: Web UI for monitoring queues
- **PM2**: Process manager for queue workers

### Alternative Options
- **BullMQ**: Modern rewrite of Bull with better TypeScript support
- **Agenda**: MongoDB-based queues (if you prefer to avoid Redis)
- **Kue**: Legacy solution (not recommended for new projects)

## Implementation Plan

### Phase 1: Setup and Basic Integration

1. **Install Dependencies**
```bash
npm install bull redis
npm install -D @types/bull @types/redis
```

2. **Create Queue Configuration**
```javascript
// backend/src/config/queue.js
const Queue = require('bull');
const Redis = require('redis');

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
};

// Create Redis client for health checks
const redisClient = Redis.createClient(redisConfig);

// Queue instances
const emailQueue = new Queue('email notifications', { redis: redisConfig });
const inventoryQueue = new Queue('inventory sync', { redis: redisConfig });
const reportQueue = new Queue('report generation', { redis: redisConfig });
const fileQueue = new Queue('file processing', { redis: redisConfig });

module.exports = {
  redisClient,
  emailQueue,
  inventoryQueue,
  reportQueue,
  fileQueue
};
```

3. **Add Environment Variables**
```bash
# .env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
QUEUE_CONCURRENCY=5
```

### Phase 2: Job Processors

1. **Email Job Processor**
```javascript
// backend/src/workers/emailWorker.js
const { emailQueue } = require('../config/queue');
const emailService = require('../services/emailService');

emailQueue.process('low-stock-alert', async (job) => {
  const { productId, businessId, currentStock, minThreshold } = job.data;
  
  try {
    await emailService.sendLowStockAlert({
      productId,
      businessId,
      currentStock,
      minThreshold
    });
    
    return { sent: true, timestamp: new Date() };
  } catch (error) {
    console.error('Email job failed:', error);
    throw error; // Bull will retry based on configuration
  }
});

emailQueue.process('task-assignment', async (job) => {
  const { employeeId, taskDetails } = job.data;
  
  try {
    await emailService.sendTaskAssignmentNotification({
      employeeId,
      taskDetails
    });
    
    return { sent: true, timestamp: new Date() };
  } catch (error) {
    console.error('Task assignment email failed:', error);
    throw error;
  }
});
```

2. **Inventory Sync Processor**
```javascript
// backend/src/workers/inventoryWorker.js
const { inventoryQueue } = require('../config/queue');
const inventoryService = require('../services/inventoryService');

inventoryQueue.process('sync-external', async (job) => {
  const { businessId, externalSystem } = job.data;
  
  try {
    const result = await inventoryService.syncWithExternalSystem({
      businessId,
      externalSystem
    });
    
    return { synced: true, itemsProcessed: result.count };
  } catch (error) {
    console.error('Inventory sync failed:', error);
    throw error;
  }
});

inventoryQueue.process('bulk-update', async (job) => {
  const { updates, businessId } = job.data;
  
  try {
    const result = await inventoryService.bulkUpdateStock({
      updates,
      businessId
    });
    
    return { updated: true, itemsUpdated: result.count };
  } catch (error) {
    console.error('Bulk inventory update failed:', error);
    throw error;
  }
});
```

### Phase 3: Integration with Existing Code

1. **Update Email Notifications**
```javascript
// backend/src/services/inventoryService.js
const { emailQueue } = require('../config/queue');

async function checkLowStock(productId, businessId) {
  const product = await getProduct(productId);
  
  if (product.stock <= product.minThreshold) {
    // Instead of sending email directly, queue it
    await emailQueue.add('low-stock-alert', {
      productId,
      businessId,
      currentStock: product.stock,
      minThreshold: product.minThreshold
    }, {
      delay: 5000, // 5 second delay
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
  }
}
```

2. **Update File Processing**
```javascript
// backend/src/routes/inventory.js
const { fileQueue } = require('../config/queue');

router.post('/import', upload.single('file'), async (req, res) => {
  try {
    // Queue the file processing instead of doing it synchronously
    const job = await fileQueue.add('process-inventory-import', {
      filePath: req.file.path,
      businessId: req.user.businessId,
      userId: req.user.id,
      originalName: req.file.originalname
    });
    
    res.json({
      message: 'Import queued successfully',
      jobId: job.id,
      status: 'processing'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to queue import' });
  }
});
```

### Phase 4: Monitoring and UI

1. **Add Bull Board for Monitoring**
```javascript
// backend/src/server.js
const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const { emailQueue, inventoryQueue, reportQueue, fileQueue } = require('./config/queue');

// Create Bull Board adapter
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

// Create Bull Board
createBullBoard({
  queues: [
    new BullAdapter(emailQueue),
    new BullAdapter(inventoryQueue),
    new BullAdapter(reportQueue),
    new BullAdapter(fileQueue)
  ],
  serverAdapter: serverAdapter
});

// Add to your admin routes
app.use('/admin/queues', serverAdapter.getRouter());
```

2. **Health Check Endpoint**
```javascript
// backend/src/routes/health.js
const { redisClient } = require('../config/queue');

router.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown',
      redis: 'unknown',
      queues: {}
    }
  };
  
  try {
    // Check Redis connection
    await redisClient.ping();
    health.services.redis = 'healthy';
  } catch (error) {
    health.services.redis = 'unhealthy';
    health.status = 'degraded';
  }
  
  // Check database
  try {
    await db.raw('SELECT 1');
    health.services.database = 'healthy';
  } catch (error) {
    health.services.database = 'unhealthy';
    health.status = 'degraded';
  }
  
  res.json(health);
});
```

### Phase 5: Deployment and Scaling

1. **PM2 Configuration for Workers**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'api-server',
      script: './backend/src/server.js',
      instances: 1,
      exec_mode: 'fork'
    },
    {
      name: 'email-worker',
      script: './backend/src/workers/emailWorker.js',
      instances: 2,
      exec_mode: 'cluster'
    },
    {
      name: 'inventory-worker',
      script: './backend/src/workers/inventoryWorker.js',
      instances: 2,
      exec_mode: 'cluster'
    },
    {
      name: 'report-worker',
      script: './backend/src/workers/reportWorker.js',
      instances: 1,
      exec_mode: 'fork'
    },
    {
      name: 'file-worker',
      script: './backend/src/workers/fileWorker.js',
      instances: 1,
      exec_mode: 'fork'
    }
  ]
};
```

2. **Docker Setup**
```yaml
# docker-compose.yml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  api:
    build: ./backend
    ports:
      - "5000:5000"
    depends_on:
      - redis
      - postgres
    environment:
      - REDIS_HOST=redis
      - NODE_ENV=production

  email-worker:
    build: ./backend
    command: node src/workers/emailWorker.js
    depends_on:
      - redis
    environment:
      - REDIS_HOST=redis
      - NODE_ENV=production
    deploy:
      replicas: 2

volumes:
  redis_data:
```

## Job Priority and Scheduling

### Priority Levels
- **HIGH**: Critical alerts, password resets
- **NORMAL**: Regular emails, inventory sync
- **LOW**: Reports, bulk operations

### Scheduling Options
```javascript
// Immediate execution
await queue.add('job-name', data);

// Delayed execution
await queue.add('job-name', data, { delay: 60000 }); // 1 minute delay

// Scheduled execution (using cron)
await queue.add('job-name', data, {
  repeat: {
    cron: '0 2 * * *' // Daily at 2 AM
  }
});
```

## Error Handling and Retries

### Automatic Retries
```javascript
await queue.add('job-name', data, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000 // 2 seconds, then 4, then 8
  }
});
```

### Failed Job Handling
```javascript
queue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed with error ${err.message}`);
  
  // Send to error tracking service
  errorTracker.captureException(err, {
    extra: {
      jobId: job.id,
      jobData: job.data,
      attempts: job.attemptsMade
    }
  });
});
```

## Monitoring and Alerting

### Key Metrics to Track
- Job completion rates
- Queue sizes
- Processing times
- Error rates
- Retry rates

### Integration with Existing Monitoring
- Add queue metrics to your existing monitoring dashboard
- Set up alerts for queue backlogs
- Monitor worker health and restart failed workers

## Security Considerations

1. **Redis Security**
   - Use Redis password authentication
   - Enable SSL/TLS for Redis connections
   - Restrict network access to Redis

2. **Job Data Security**
   - Don't store sensitive data in job payloads
   - Use job IDs to reference database records
   - Encrypt job data if necessary

3. **Rate Limiting**
   - Implement rate limiting for job creation
   - Prevent queue flooding attacks

## Cost Analysis

### Redis Hosting Options
- **Self-hosted**: $0 (existing infrastructure)
- **Redis Cloud**: Free tier available, $15-50/month for production
- **AWS ElastiCache**: $15-100/month depending on instance size
- **DigitalOcean Managed Redis**: $15-50/month

### Resource Requirements
- **Memory**: 1-4GB depending on queue sizes
- **CPU**: Minimal for queue management
- **Network**: Low bandwidth usage

## Next Steps

1. **Install Redis locally** and test the setup
2. **Implement email queue** as the first use case
3. **Add monitoring** with Bull Board
4. **Deploy to staging** with Docker
5. **Monitor performance** and adjust worker counts
6. **Scale gradually** to other background tasks

## Conclusion

Implementing Redis queues will significantly improve the performance and reliability of The Planning Bord. Start with email notifications as they're the most impactful and easiest to implement, then gradually migrate other background tasks.