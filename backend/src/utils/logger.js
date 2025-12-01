const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

// Custom format for structured logging
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, requestId, userId, method, url, duration, stack }) => {
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(requestId && { requestId }),
      ...(userId && { userId }),
      ...(method && { method }),
      ...(url && { url }),
      ...(duration && { duration: `${duration}ms` }),
      ...(stack && { stack })
    };
    return JSON.stringify(logEntry);
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: {
    service: 'planning-bord-api',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      )
    }),
    
    // File transports
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ]
});

// Request ID middleware
const requestIdMiddleware = (req, res, next) => {
  req.requestId = req.headers['x-request-id'] || uuidv4();
  res.setHeader('x-request-id', req.requestId);
  next();
};

// Request logging middleware
const requestLoggerMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  logger.info('Incoming request', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user?.id
  });
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    
    logger.info('Request completed', {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id
    });
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Error logging middleware
const errorLoggerMiddleware = (err, req, res, next) => {
  logger.error('Request error', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    error: err.message,
    stack: err.stack,
    userId: req.user?.id,
    statusCode: err.statusCode || 500
  });
  
  next(err);
};

// Performance monitoring middleware
const performanceMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = duration > 1000 ? 'warn' : 'info';
    
    logger.log(logLevel, 'Request performance', {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id,
      slowRequest: duration > 1000
    });
  });
  
  next();
};

// Health check logging
const logHealthCheck = (service, status, details = {}) => {
  const logLevel = status === 'healthy' ? 'info' : 'error';
  logger.log(logLevel, 'Health check', {
    service,
    status,
    ...details,
    timestamp: new Date().toISOString()
  });
};

// Database query logging
const logDatabaseQuery = (query, duration, error = null) => {
  const logLevel = error ? 'error' : duration > 500 ? 'warn' : 'info';
  
  logger.log(logLevel, 'Database query', {
    query: query.sql,
    bindings: query.bindings,
    duration: `${duration}ms`,
    slowQuery: duration > 500,
    error: error?.message
  });
};

// External API call logging
const logExternalAPICall = (service, method, url, duration, statusCode, error = null) => {
  const logLevel = error ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  
  logger.log(logLevel, 'External API call', {
    service,
    method,
    url,
    duration: `${duration}ms`,
    statusCode,
    error: error?.message,
    success: statusCode >= 200 && statusCode < 300
  });
};

module.exports = {
  logger,
  requestIdMiddleware,
  requestLoggerMiddleware,
  errorLoggerMiddleware,
  performanceMiddleware,
  logHealthCheck,
  logDatabaseQuery,
  logExternalAPICall
};