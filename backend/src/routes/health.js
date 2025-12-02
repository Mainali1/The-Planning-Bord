const express = require('express');
const router = express.Router();
const { HealthService } = require('../middleware/monitoring');
const { ErrorTrackingService } = require('../services/errorTrackingService');

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const [database, redis, externalServices, systemMetrics] = await Promise.all([
      HealthService.checkDatabase(),
      HealthService.checkRedis(),
      HealthService.checkExternalServices(),
      HealthService.getSystemMetrics()
    ]);

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database,
        redis,
        external: externalServices
      },
      system: systemMetrics
    };

    // Determine overall status
    const unhealthyServices = [
      database.status === 'unhealthy' ? 'database' : null,
      redis.status === 'unhealthy' ? 'redis' : null,
      ...externalServices.filter(s => s.status === 'unhealthy').map(s => s.service)
    ].filter(Boolean);

    if (unhealthyServices.length > 0) {
      healthStatus.status = 'unhealthy';
      healthStatus.unhealthyServices = unhealthyServices;
      
      // Log to Sentry
      ErrorTrackingService.captureMessage('Health check failed', 'warning', {
        unhealthyServices,
        databaseStatus: database.status,
        redisStatus: redis.status,
        externalServices: externalServices.map(s => ({ service: s.service, status: s.status }))
      });
    }

    // Memory usage monitoring
    if (systemMetrics.node.memory.heapUsed > 500 * 1024 * 1024) { // 500MB
      ErrorTrackingService.captureMessage('High memory usage detected', 'warning', {
        memoryUsage: systemMetrics.node.memory,
        heapUsedMB: Math.round(systemMetrics.node.memory.heapUsed / 1024 / 1024)
      });
    }

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);

  } catch (error) {
    ErrorTrackingService.captureException(error, {
      location: 'health_check',
      endpoint: '/health'
    });

    res.status(503).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Readiness check (for Kubernetes)
router.get('/ready', async (req, res) => {
  try {
    const database = await HealthService.checkDatabase();
    
    const isReady = database.status === 'healthy';
    
    if (!isReady) {
      ErrorTrackingService.captureMessage('Readiness check failed', 'warning', {
        databaseStatus: database.status,
        error: database.error
      });
    }
    
    res.status(isReady ? 200 : 503).json({
      status: isReady ? 'ready' : 'not_ready',
      database: database.status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    ErrorTrackingService.captureException(error, {
      location: 'readiness_check',
      endpoint: '/ready'
    });

    res.status(503).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Liveness check (for Kubernetes)
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Metrics endpoint with Sentry integration
router.get('/metrics', async (req, res) => {
  try {
    const metrics = {
      requests: {
        total: req.app.locals.requestCount || 0,
        errors: req.app.locals.errorCount || 0,
        rate: req.app.locals.requestRate || 0
      },
      responseTime: {
        average: req.app.locals.avgResponseTime || 0,
        p95: req.app.locals.p95ResponseTime || 0,
        p99: req.app.locals.p99ResponseTime || 0
      },
      database: {
        queries: req.app.locals.dbQueryCount || 0,
        slowQueries: req.app.locals.slowQueryCount || 0,
        connectionPool: req.app.locals.dbPoolStats || {}
      },
      memory: {
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
        rss: process.memoryUsage().rss
      },
      uptime: {
        process: process.uptime(),
        system: require('os').uptime()
      },
      timestamp: new Date().toISOString()
    };

    // Alert on high error rates
    const errorRate = metrics.requests.total > 0 ? 
      (metrics.requests.errors / metrics.requests.total) * 100 : 0;
    
    if (errorRate > 5) {
      ErrorTrackingService.captureMessage('High error rate detected', 'warning', {
        errorRate,
        totalRequests: metrics.requests.total,
        errorCount: metrics.requests.errors
      });
    }

    // Alert on slow response times
    if (metrics.responseTime.p95 > 2000) {
      ErrorTrackingService.captureMessage('High response time detected', 'warning', {
        p95: metrics.responseTime.p95,
        average: metrics.responseTime.average
      });
    }

    res.json(metrics);
  } catch (error) {
    ErrorTrackingService.captureException(error, {
      location: 'metrics_endpoint',
      endpoint: '/metrics'
    });

    res.status(500).json({ error: 'Failed to collect metrics' });
  }
});

module.exports = router;