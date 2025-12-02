const { Sentry } = require('../config/sentry');

class MetricsCollector {
  static trackAPICall(endpoint, method, duration, statusCode, userId = null) {
    const transaction = Sentry.getCurrentHub().getScope().getTransaction();
    
    if (transaction) {
      const span = transaction.startChild({
        op: 'http',
        description: `${method} ${endpoint}`,
        tags: {
          method,
          endpoint,
          status_code: statusCode,
        },
      });
      span.finish();
    }

    Sentry.addBreadcrumb({
      category: 'api',
      message: `${method} ${endpoint}`,
      level: statusCode >= 400 ? 'error' : 'info',
      data: {
        duration,
        statusCode,
        userId,
        timestamp: new Date().toISOString(),
      },
    });

    // Alert on slow API calls
    if (duration > 2000) {
      Sentry.captureMessage(`Slow API call: ${method} ${endpoint} (${duration}ms)`, 'warning');
    }

    // Alert on high error rates
    if (statusCode >= 500) {
      Sentry.captureMessage(`Server error: ${method} ${endpoint} (${statusCode})`, 'error');
    }
  }

  static trackDatabaseQuery(query, duration, error = null, userId = null) {
    const transaction = Sentry.getCurrentHub().getScope().getTransaction();
    
    if (transaction) {
      const span = transaction.startChild({
        op: 'db',
        description: query,
        tags: {
          query_type: query.split(' ')[0].toUpperCase(),
        },
      });
      span.finish();
    }

    if (error) {
      Sentry.captureException(error, {
        tags: { query_type: 'database' },
        extra: { query, duration, userId },
        level: 'error',
      });
    }

    // Alert on slow queries
    if (duration > 1000) {
      Sentry.captureMessage(`Slow database query detected (${duration}ms)`, 'warning', {
        extra: { query, duration },
      });
    }
  }

  static trackBusinessEvent(eventName, userId, data = {}) {
    Sentry.addBreadcrumb({
      category: 'business',
      message: eventName,
      level: 'info',
      data: {
        userId,
        ...data,
        timestamp: new Date().toISOString(),
      },
    });

    // Track critical business events
    const criticalEvents = ['user_registered', 'payment_processed', 'subscription_cancelled'];
    if (criticalEvents.includes(eventName)) {
      Sentry.captureMessage(`Business event: ${eventName}`, 'info', {
        tags: { business_event: eventName },
        extra: { userId, data },
      });
    }
  }

  static trackError(error, context = {}) {
    Sentry.captureException(error, {
      extra: context,
      level: 'error',
    });
  }

  static trackPerformance(metric, value, unit = 'ms', tags = {}) {
    Sentry.setContext('performance', {
      [metric]: {
        value,
        unit,
        timestamp: new Date().toISOString(),
        ...tags,
      },
    });
  }

  static trackSecurityEvent(eventType, details = {}) {
    Sentry.captureMessage(`Security event: ${eventType}`, 'warning', {
      tags: { security_event: eventType },
      extra: details,
    });
  }

  static trackQueueJob(jobType, status, duration, error = null) {
    const level = error ? 'error' : status === 'completed' ? 'info' : 'warning';
    
    Sentry.addBreadcrumb({
      category: 'queue',
      message: `Job ${status}: ${jobType}`,
      level,
      data: {
        jobType,
        status,
        duration,
        error: error?.message,
        timestamp: new Date().toISOString(),
      },
    });

    if (error) {
      Sentry.captureException(error, {
        tags: { job_type: jobType, job_status: status },
        extra: { duration },
      });
    }
  }
}

module.exports = MetricsCollector;