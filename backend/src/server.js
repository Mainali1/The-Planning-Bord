const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Monitoring and observability
const { logger, requestIdMiddleware, requestLoggerMiddleware, performanceMiddleware } = require('./utils/logger');
const { initializeSentry, errorHandler, requestContextMiddleware, performanceMonitoringMiddleware } = require('./services/errorTrackingService');
const { healthCheck, readinessCheck, livenessCheck, metrics } = require('./middleware/monitoring');

const authRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
const employeeRoutes = require('./routes/employee');
const paymentRoutes = require('./routes/payment');
const dashboardRoutes = require('./routes/dashboard');
const microsoftRoutes = require('./routes/microsoft');
const settingsRoutes = require('./routes/settings');
const databaseAdminRoutes = require('./routes/admin/database');
const healthRoutes = require('./routes/health');


const { startCronJobs } = require('./services/cronService');

// Queue monitoring with Bull Board
const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const { emailQueue, inventoryQueue, reportQueue, fileQueue } = require('./config/queue');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Sentry
initializeSentry();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});

// Request tracking middleware (must be first)
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);
app.use(performanceMiddleware);

app.use(helmet());
app.use(cors());
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Error tracking middleware
app.use(requestContextMiddleware);
app.use(performanceMonitoringMiddleware);

app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/microsoft', microsoftRoutes);
app.use('/api', settingsRoutes);
app.use('/api/admin/database', databaseAdminRoutes);

// Health and monitoring endpoints
app.use('/api', healthRoutes);

// Bull Board - Queue monitoring dashboard
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
  queues: [
    new BullAdapter(emailQueue),
    new BullAdapter(inventoryQueue),
    new BullAdapter(reportQueue),
    new BullAdapter(fileQueue)
  ],
  serverAdapter: serverAdapter,
  options: {
    uiConfig: {
      boardTitle: 'Planning Bord Queue Dashboard',
      boardLogo: {
        alt: 'Planning Bord Logo',
        path: 'https://via.placeholder.com/150x50?text=Planning+Bord'
      }
    }
  }
});

app.use('/admin/queues', serverAdapter.getRouter());

app.use(errorHandler);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  logger.info('🚀 Server started', {
    port: PORT,
    environment: process.env.NODE_ENV,
    nodeVersion: process.version,
    platform: process.platform
  });
  
  startCronJobs();
  logger.info('⏰ Cron jobs started');
  
  logger.info('📊 Bull Board queue monitoring available at', {
    url: `http://localhost:${PORT}/admin/queues`
  });
});

module.exports = app;