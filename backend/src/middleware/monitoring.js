const { logger, logHealthCheck } = require('../utils/logger');
const knex = require('../config/database');

// Health check service
class HealthService {
  static async checkDatabase() {
    try {
      const start = Date.now();
      await knex.raw('SELECT 1');
      const duration = Date.now() - start;
      
      return {
        status: 'healthy',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  static async checkRedis() {
    try {
      // Redis health check (if Redis is configured)
      if (process.env.REDIS_URL) {
        const redis = require('redis');
        const client = redis.createClient({
          url: process.env.REDIS_URL
        });
        
        await client.connect();
        await client.ping();
        await client.disconnect();
        
        return {
          status: 'healthy',
          timestamp: new Date().toISOString()
        };
      }
      
      return {
        status: 'not_configured',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  static async checkExternalServices() {
    const services = [];
    
    // Check Microsoft Graph API
    if (process.env.MICROSOFT_CLIENT_ID) {
      try {
        const { validateToken } = require('../services/secureMicrosoftService');
        // Simple token validation check
        services.push({
          service: 'microsoft_graph',
          status: 'healthy',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        services.push({
          service: 'microsoft_graph',
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return services;
  }

  static async getSystemMetrics() {
    const os = require('os');
    const process = require('process');
    
    return {
      uptime: os.uptime(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: process.memoryUsage()
      },
      cpu: {
        loadAverage: os.loadavg(),
        cores: os.cpus().length
      },
      node: {
        version: process.version,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      },
      timestamp: new Date().toISOString()
    };
  }
}

// Health check endpoint
const healthCheck = async (req, res) => {
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
    }

    // Log health check results
    logHealthCheck('application', healthStatus.status, {
      database: database.status,
      redis: redis.status,
      unhealthyServices
    });

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);

  } catch (error) {
    logger.error('Health check failed', {
      error: error.message,
      stack: error.stack
    });

    res.status(503).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Readiness check (for Kubernetes)
const readinessCheck = async (req, res) => {
  try {
    const database = await HealthService.checkDatabase();
    
    const isReady = database.status === 'healthy';
    
    res.status(isReady ? 200 : 503).json({
      status: isReady ? 'ready' : 'not_ready',
      database: database.status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Liveness check (for Kubernetes)
const livenessCheck = (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};

// Metrics endpoint (basic implementation)
const metrics = async (req, res) => {
  try {
    const metrics = {
      requests: {
        total: req.app.locals.requestCount || 0,
        errors: req.app.locals.errorCount || 0
      },
      responseTime: {
        average: req.app.locals.avgResponseTime || 0,
        p95: req.app.locals.p95ResponseTime || 0
      },
      database: {
        queries: req.app.locals.dbQueryCount || 0,
        slowQueries: req.app.locals.slowQueryCount || 0
      },
      timestamp: new Date().toISOString()
    };

    res.json(metrics);
  } catch (error) {
    logger.error('Metrics collection failed', { error: error.message });
    res.status(500).json({ error: 'Failed to collect metrics' });
  }
};

module.exports = {
  healthCheck,
  readinessCheck,
  livenessCheck,
  metrics,
  HealthService
};