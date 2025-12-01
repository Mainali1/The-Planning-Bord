# Redis Queue Implementation Guide

This guide covers the Redis queue implementation for background job processing in The Planning Bord application.

## Overview

The application uses **Bull** (Redis-based queue) for handling background jobs including:
- Email notifications
- Inventory synchronization
- Report generation
- File processing (imports/exports)
- Scheduled tasks

## Architecture

### Components

1. **Queue Configuration** (`backend/src/config/queue.js`)
   - Centralized queue setup
   - Redis connection management
   - Queue definitions

2. **Workers** (`backend/src/workers/`)
   - `emailWorker.js` - Email notifications
   - `inventoryWorker.js` - Inventory sync and updates
   - `reportWorker.js` - Report generation
   - `fileWorker.js` - File imports/exports

3. **Queue Service** (`backend/src/services/queueService.js`)
   - High-level API for queueing jobs
   - Job status checking
   - Job cancellation

4. **Monitoring** (Bull Board)
   - Web-based queue monitoring
   - Job inspection and management

## Setup

### 1. Install Dependencies

```bash
# Install Redis queue dependencies
cd backend
npm install bull redis @bull-board/api @bull-board/express

# Install PM2 for process management (production)
npm install pm2 --save-dev
```

### 2. Start Redis

**Option A: Using Docker Compose**
```bash
# Start Redis with Redis Commander UI
docker-compose -f docker-compose.redis.yml up -d

# Redis will be available at localhost:6379
# Redis Commander UI at http://localhost:8081 (admin/password)
```

**Option B: Local Redis Installation**
```bash
# Install Redis (Ubuntu/Debian)
sudo apt-get install redis-server

# Start Redis
redis-server redis.conf
```

### 3. Environment Variables

Add to your `.env` file:
```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Queue Settings
QUEUE_PREFIX=planning-bord
QUEUE_DEFAULT_ATTEMPTS=3
QUEUE_DEFAULT_BACKOFF=2000

# File Processing
MAX_FILE_SIZE=10485760  # 10MB in bytes
UPLOAD_DIR=uploads
EXPORTS_DIR=exports
```

## Usage

### Queueing Jobs

Use the QueueService for easy job queueing:

```javascript
const QueueService = require('./services/queueService');

// Send email notification
await QueueService.addWelcomeEmail({
  userEmail: 'user@example.com',
  userName: 'John Doe'
});

// Queue inventory sync
await QueueService.addInventorySync({
  businessId: 123,
  externalSystem: 'supplier-api',
  syncType: 'full'
});

// Generate report
await QueueService.addReportGeneration({
  businessId: 123,
  reportType: 'inventory-summary',
  userEmail: 'manager@business.com'
});
```

### Processing Jobs

**Development Mode:**
```bash
# Start individual workers
npm run worker:email
npm run worker:inventory
npm run worker:report
npm run worker:file
```

**Production Mode:**
```bash
# Start all workers with PM2
npm run workers:start

# Or start specific workers
pm2 start ecosystem.config.js --only planning-bord-email-worker
pm2 start ecosystem.config.js --only planning-bord-inventory-worker
```

## Queue Types

### 1. Email Queue (`emailQueue`)
**Jobs:**
- `welcome-email` - New user welcome emails
- `password-reset` - Password reset emails
- `low-stock-alert` - Inventory low stock notifications
- `report-ready` - Report generation completion emails

**Priority:** High (1) for alerts, Normal (5) for regular emails

### 2. Inventory Queue (`inventoryQueue`)
**Jobs:**
- `sync-external` - Sync with external inventory systems
- `bulk-update` - Bulk inventory updates
- `stock-check` - Periodic stock level checks

**Priority:** High (1) for critical syncs, Normal (5) for regular updates

### 3. Report Queue (`reportQueue`)
**Jobs:**
- `generate-report` - Generate various business reports
- `cleanup-reports` - Clean up old report files

**Priority:** Normal (5)

### 4. File Queue (`fileQueue`)
**Jobs:**
- `process-inventory-import` - Process CSV inventory imports
- `process-inventory-export` - Generate CSV/JSON exports
- `cleanup-exports` - Clean up old export files

**Priority:** Normal (5)

## Job Configuration

### Retry Policy
```javascript
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000
  }
}
```

### Priority Levels
```javascript
1: High priority (alerts, critical notifications)
5: Normal priority (regular processing)
10: Low priority (cleanup, maintenance)
```

### Job Options
```javascript
{
  priority: 1,              // Job priority
  delay: 5000,             // Delay before processing (ms)
  attempts: 3,               // Number of retry attempts
  backoff: {                // Retry backoff strategy
    type: 'exponential',
    delay: 2000
  },
  removeOnComplete: 100,     // Keep completed jobs
  removeOnFail: 50          // Keep failed jobs
}
```

## Monitoring

### Bull Board
Access the queue monitoring dashboard at: `http://localhost:5000/admin/queues`

**Features:**
- View all queues and jobs
- Inspect job details and data
- Retry failed jobs
- Delete jobs
- Monitor queue statistics

### Health Checks
Check worker health:
```bash
# Check if workers are running
pm2 status

# Check worker logs
pm2 logs planning-bord-email-worker
pm2 logs planning-bord-inventory-worker
```

### Metrics
Key metrics to monitor:
- Job processing rate
- Queue length
- Failed job count
- Worker memory usage
- Redis connection health

## Error Handling

### Job Failures
Jobs that fail are automatically retried based on the retry policy:
- 3 attempts by default
- Exponential backoff (2s, 4s, 8s delays)
- Failed jobs are logged with full error details

### Worker Errors
Workers handle errors gracefully:
- Continue processing other jobs
- Log errors with context
- Send alerts for critical failures
- Support graceful shutdown

### Recovery
```bash
# Restart failed workers
pm2 restart planning-bord-email-worker

# Retry failed jobs manually (via Bull Board)
# Or programmatically:
await job.retry();
```

## Performance Optimization

### Redis Tuning
```bash
# Memory optimization
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence tuning
save 900 1
save 300 10
save 60 10000
```

### Worker Scaling
```javascript
// Scale workers based on queue load
// In ecosystem.config.js:
{
  name: 'planning-bord-email-worker',
  instances: 2,  // Scale up for high email volume
  exec_mode: 'cluster'
}
```

### Job Batching
```javascript
// Process jobs in batches for better performance
const batchSize = 100;
const jobs = [];

for (let i = 0; i < items.length; i += batchSize) {
  const batch = items.slice(i, i + batchSize);
  jobs.push(
    QueueService.addBulkUpdate({
      businessId,
      items: batch
    })
  );
}
```

## Security

### Redis Security
```bash
# Enable Redis password authentication
requirepass your-strong-password

# Bind to localhost in production
bind 127.0.0.1
```

### Job Data Security
- Sanitize job data before queueing
- Don't include sensitive data in job payloads
- Use secure file storage for uploaded files
- Validate file types and sizes

## Testing

### Local Testing
```bash
# Start Redis in Docker
docker-compose -f docker-compose.redis.yml up -d

# Start workers
npm run worker:email &
npm run worker:inventory &

# Test job processing
node test-queue.js
```

### Test Script Example
```javascript
// test-queue.js
const QueueService = require('./backend/src/services/queueService');

async function testQueue() {
  console.log('Testing queue system...');
  
  // Test email queue
  await QueueService.addWelcomeEmail({
    userEmail: 'test@example.com',
    userName: 'Test User'
  });
  
  console.log('✅ Test job queued successfully');
  process.exit(0);
}

testQueue().catch(console.error);
```

## Troubleshooting

### Common Issues

**1. Redis Connection Errors**
```bash
# Check Redis status
docker ps | grep redis
redis-cli ping

# Check Redis logs
docker logs planning-bord-redis
```

**2. Worker Not Processing Jobs**
```bash
# Check worker logs
pm2 logs planning-bord-email-worker

# Restart worker
pm2 restart planning-bord-email-worker
```

**3. High Memory Usage**
```bash
# Monitor Redis memory
redis-cli info memory

# Check worker memory
pm2 monit
```

**4. Job Failures**
- Check Bull Board for failed jobs
- Review worker logs for error details
- Verify job data format
- Check external service availability

### Debug Mode
```bash
# Enable debug logging
DEBUG=bull:* npm run worker:email

# Or set in environment
DEBUG=bull:* node src/workers/emailWorker.js
```

## Maintenance

### Regular Tasks
1. **Monitor queue health** - Daily
2. **Clean up old jobs** - Weekly
3. **Review failed jobs** - Daily
4. **Check Redis memory usage** - Weekly
5. **Update worker logs** - Monthly

### Cleanup Scripts
```javascript
// Clean up old completed jobs
await emailQueue.clean(24 * 60 * 60 * 1000); // 24 hours
await inventoryQueue.clean(7 * 24 * 60 * 60 * 1000); // 7 days
```

## Integration Examples

### Email Notifications
```javascript
// In your user registration service
const QueueService = require('./services/queueService');

async function registerUser(userData) {
  // Create user...
  
  // Queue welcome email
  await QueueService.addWelcomeEmail({
    userEmail: userData.email,
    userName: userData.name
  });
}
```

### Inventory Updates
```javascript
// In your inventory service
async function updateInventory(businessId, updates) {
  // Update inventory...
  
  // Queue sync with external system
  await QueueService.addInventorySync({
    businessId,
    externalSystem: 'supplier-api',
    syncType: 'incremental'
  });
}
```

### Report Generation
```javascript
// In your reporting service
async function generateMonthlyReport(businessId) {
  await QueueService.addReportGeneration({
    businessId,
    reportType: 'sales-analysis',
    filters: {
      startDate: '2024-01-01',
      endDate: '2024-01-31'
    },
    userEmail: 'manager@business.com'
  });
}
```

This implementation provides a robust, scalable background job processing system that can handle various types of asynchronous tasks efficiently.