const Sentry = require('@sentry/node');
const { logger } = require('../utils/logger');

// Initialize Sentry if DSN is provided
const initializeSentry = () => {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.npm_package_version,
      integrations: [
        // HTTP integration for automatic request/response capture
        new Sentry.Integrations.Http({ tracing: true }),
        // Express integration
        new Sentry.Integrations.Express({
          // to trace all requests to the default router
          app: undefined, // Will be set when middleware is applied
          // alternatively, you can specify the routes you want to trace:
          // router: someRouter,
        }),
      ],
      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      // Profiling
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    });

    logger.info('Sentry error tracking initialized', {
      environment: process.env.NODE_ENV,
      release: process.env.npm_package_version
    });
  }
};

// Error tracking service
class ErrorTrackingService {
  static captureException(error, context = {}) {
    // Log to Winston first
    logger.error('Exception captured', {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });

    // Send to Sentry if configured
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error, {
        contexts: {
          custom: context
        },
        tags: {
          service: 'planning-bord-api',
          environment: process.env.NODE_ENV
        }
      });
    }
  }

  static captureMessage(message, level = 'info', context = {}) {
    // Log to Winston first
    logger.log(level, 'Message captured', {
      message,
      context,
      timestamp: new Date().toISOString()
    });

    // Send to Sentry if configured
    if (process.env.SENTRY_DSN) {
      Sentry.captureMessage(message, level, {
        contexts: {
          custom: context
        },
        tags: {
          service: 'planning-bord-api',
          environment: process.env.NODE_ENV
        }
      });
    }
  }

  static setContext(key, context) {
    if (process.env.SENTRY_DSN) {
      Sentry.setContext(key, context);
    }
  }

  static setUser(user) {
    if (process.env.SENTRY_DSN) {
      Sentry.setUser(user);
    }
  }

  static setTag(key, value) {
    if (process.env.SENTRY_DSN) {
      Sentry.setTag(key, value);
    }
  }

  static addBreadcrumb(breadcrumb) {
    if (process.env.SENTRY_DSN) {
      Sentry.addBreadcrumb({
        ...breadcrumb,
        timestamp: Date.now() / 1000
      });
    }
  }
}

// Express error handler middleware
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  // Capture in error tracking service
  ErrorTrackingService.captureException(err, {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const errorResponse = {
    error: {
      message: err.message || 'Internal Server Error',
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    }
  };

  if (isDevelopment) {
    errorResponse.error.stack = err.stack;
  }

  res.status(err.statusCode || 500).json(errorResponse);
};

// Request context middleware
const requestContextMiddleware = (req, res, next) => {
  // Set Sentry user context if authenticated
  if (req.user) {
    ErrorTrackingService.setUser({
      id: req.user.id,
      email: req.user.email,
      username: req.user.name
    });
  }

  // Set request context
  ErrorTrackingService.setContext('request', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  next();
};

// Performance monitoring middleware
const performanceMonitoringMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Add breadcrumb for request completion
    ErrorTrackingService.addBreadcrumb({
      category: 'request',
      message: `${req.method} ${req.url} completed`,
      level: res.statusCode >= 400 ? 'error' : 'info',
      data: {
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        requestId: req.requestId
      }
    });

    // Alert on slow requests
    if (duration > 5000) {
      ErrorTrackingService.captureMessage(`Slow request detected: ${req.method} ${req.url}`, 'warning', {
        duration: `${duration}ms`,
        requestId: req.requestId,
        method: req.method,
        url: req.url
      });
    }
  });
  
  next();
};

// Memory monitoring
const memoryMonitoring = () => {
  const memoryUsage = process.memoryUsage();
  
  // Alert on high memory usage
  if (memoryUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
    ErrorTrackingService.captureMessage('High memory usage detected', 'warning', {
      memoryUsage: {
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`
      }
    });
  }
};

// Start memory monitoring
if (process.env.NODE_ENV === 'production') {
  setInterval(memoryMonitoring, 60000); // Check every minute
}

module.exports = {
  initializeSentry,
  ErrorTrackingService,
  errorHandler,
  requestContextMiddleware,
  performanceMonitoringMiddleware
};