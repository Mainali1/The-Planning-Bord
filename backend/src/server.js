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

const { errorHandler } = require('./middleware/errorHandler');
const { startCronJobs } = require('./services/cronService');

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
app.get('/api/health', healthCheck);
app.get('/api/health/ready', readinessCheck);
app.get('/api/health/live', livenessCheck);
app.get('/api/metrics', metrics);

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
});

module.exports = app;