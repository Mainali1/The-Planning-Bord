# Monitoring Configuration Guide

## Overview
This document provides comprehensive monitoring setup for The Planning Board application, including Sentry integration, performance monitoring, and alerting configuration.

## Sentry Integration

### Backend Sentry Setup

#### 1. Install Sentry SDK
```bash
cd backend
npm install @sentry/node @sentry/profiling-node
```

#### 2. Configuration (backend/src/config/sentry.js)
```javascript
const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

const initializeSentry = () => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      release: process.env.npm_package_version,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express({
          app: require('../server'),
        }),
        nodeProfilingIntegration,
      ],
      tracesSampleRate: 0.1, // Capture 10% of transactions
      profilesSampleRate: 0.1, // Capture 10% of profiles
      beforeSend(event, hint) {
        // Filter out sensitive data
        if (event.request?.headers?.authorization) {
          delete event.request.headers.authorization;
        }
        return event;
      },
    });
  }
};

module.exports = { initializeSentry, Sentry };
```

#### 3. Express Integration (backend/src/server.js)
```javascript
const { initializeSentry, Sentry } = require('./config/sentry');

// Initialize Sentry before anything else
initializeSentry();

// The request handler must be the first middleware on the app
app.use(Sentry.Handlers.requestHandler());

// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler());

// Your existing middleware...

// The error handler must be before any other error middleware and after all controllers
app.use(Sentry.Handlers.errorHandler());
```

### Frontend Sentry Setup

#### 1. Install Sentry SDK
```bash
cd frontend
npm install @sentry/react @sentry/browser @sentry/tracing
```

#### 2. Configuration (frontend/src/config/sentry.js)
```javascript
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

const initializeSentry = () => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.REACT_APP_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      release: process.env.REACT_APP_VERSION,
      integrations: [
        new BrowserTracing({
          tracingOrigins: ['localhost', 'api.planningbord.com'],
          routingInstrumentation: Sentry.reactRouterV6Instrumentation(
            React.useEffect,
            useLocation,
            useNavigationType,
            createRoutesFromChildren,
            matchRoutes
          ),
        }),
      ],
      tracesSampleRate: 0.1,
      beforeSend(event, hint) {
        // Filter out sensitive data
        if (event.exception) {
          const error = hint.originalException;
          if (error && error.message) {
            // Check for sensitive patterns
            if (error.message.includes('password') || error.message.includes('token')) {
              return null; // Don't send this error
            }
          }
        }
        return event;
      },
    });
  }
};

export { initializeSentry, Sentry };
```

#### 3. React Integration (frontend/src/index.js)
```javascript
import { initializeSentry, Sentry } from './config/sentry';

// Initialize Sentry
initializeSentry();

// Wrap your app with ErrorBoundary
const AppWithSentry = Sentry.withErrorBoundary(App, {
  fallback: ({ error }) => (
    <div className="error-boundary">
      <h1>Something went wrong</h1>
      <p>We've been notified and are working on a fix.</p>
    </div>
  ),
});
```

## Application Performance Monitoring (APM)

### Key Metrics to Track

#### 1. Response Time Metrics
- **API Response Time**: Average response time for each endpoint
- **Database Query Time**: Slow query identification
- **Page Load Time**: Frontend performance metrics
- **Background Job Processing**: Queue processing times

#### 2. Error Rates
- **HTTP Error Rate**: 4xx and 5xx error percentages
- **JavaScript Error Rate**: Frontend error tracking
- **Database Error Rate**: Connection and query failures
- **Queue Error Rate**: Background job failures

#### 3. Business Metrics
- **User Registration Rate**: New user signups
- **Active Users**: Daily/Monthly active users
- **Feature Usage**: Most used features
- **Payment Processing**: Transaction success rates

### Custom Metrics Implementation

#### Backend Metrics (backend/src/utils/metrics.js)
```javascript
const { Sentry } = require('../config/sentry');

class MetricsCollector {
  static trackAPICall(endpoint, method, duration, statusCode) {
    Sentry.addBreadcrumb({
      category: 'api',
      message: `${method} ${endpoint}`,
      level: 'info',
      data: {
        duration,
        statusCode,
        timestamp: new Date().toISOString(),
      },
    });

    // Custom metric for performance monitoring
    if (duration > 1000) {
      Sentry.captureMessage(`Slow API call: ${method} ${endpoint}`, 'warning');
    }
  }

  static trackDatabaseQuery(query, duration, error = null) {
    const transaction = Sentry.getCurrentHub().getScope().getTransaction();
    if (transaction) {
      const span = transaction.startChild({
        op: 'db',
        description: query,
      });
      span.finish();
    }

    if (error) {
      Sentry.captureException(error, {
        tags: { query_type: 'database' },
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
  }
}

module.exports = MetricsCollector;
```

#### Frontend Metrics (frontend/src/utils/metrics.js)
```javascript
import { Sentry } from '../config/sentry';

export const trackPageView = (pageName, userId) => {
  Sentry.addBreadcrumb({
    category: 'navigation',
    message: `Page view: ${pageName}`,
    level: 'info',
    data: { userId, timestamp: new Date().toISOString() },
  });
};

export const trackUserAction = (action, userId, data = {}) => {
  Sentry.addBreadcrumb({
    category: 'user_action',
    message: action,
    level: 'info',
    data: { userId, ...data, timestamp: new Date().toISOString() },
  });
};

export const trackPerformance = (metric, value, unit = 'ms') => {
  Sentry.setContext('performance', {
    [metric]: { value, unit, timestamp: new Date().toISOString() },
  });
};
```

## Health Checks and Monitoring

### Backend Health Check (backend/src/routes/health.js)
```javascript
const express = require('express');
const router = express.Router();
const { Sentry } = require('../config/sentry');

router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {},
  };

  try {
    // Database health check
    await db.raw('SELECT 1');
    health.services.database = 'healthy';
  } catch (error) {
    health.services.database = 'unhealthy';
    health.status = 'degraded';
    Sentry.captureException(error, { tags: { health_check: 'database' } });
  }

  try {
    // Redis health check
    await redis.ping();
    health.services.redis = 'healthy';
  } catch (error) {
    health.services.redis = 'unhealthy';
    health.status = 'degraded';
    Sentry.captureException(error, { tags: { health_check: 'redis' } });
  }

  // Memory usage check
  const memoryUsage = process.memoryUsage();
  health.memory = {
    used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
    total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
    percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
  };

  if (health.memory.percentage > 90) {
    health.status = 'degraded';
    Sentry.captureMessage('High memory usage detected', 'warning');
  }

  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

module.exports = router;
```

### Frontend Health Monitoring (frontend/src/utils/health.js)
```javascript
import { Sentry } from '../config/sentry';

export const checkFrontendHealth = () => {
  const health = {
    timestamp: new Date().toISOString(),
    connection: navigator.onLine ? 'online' : 'offline',
    performance: {
      loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
      domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
    },
  };

  // Check API connectivity
  fetch('/api/health')
    .then(response => response.json())
    .then(data => {
      health.api = data.status;
    })
    .catch(error => {
      health.api = 'unreachable';
      Sentry.captureException(error, { tags: { health_check: 'api' } });
    });

  // Track performance metrics
  if (health.performance.loadTime > 3000) {
    Sentry.captureMessage('Slow page load detected', 'warning', {
      extra: { loadTime: health.performance.loadTime },
    });
  }

  return health;
};
```

## Alerting Configuration

### Sentry Alert Rules

#### 1. High Error Rate Alert
- **Condition**: Error rate > 5% in 5 minutes
- **Action**: Send email to on-call team
- **Severity**: Critical

#### 2. Slow Response Time Alert
- **Condition**: P95 response time > 2 seconds
- **Action**: Slack notification
- **Severity**: Warning

#### 3. Database Connection Issues
- **Condition**: Database connection failures > 3 in 10 minutes
- **Action**: PagerDuty alert
- **Severity**: Critical

#### 4. Memory Usage Alert
- **Condition**: Memory usage > 90% for 5 minutes
- **Action**: Email notification
- **Severity**: Warning

### Custom Alert Implementation
```javascript
// Alert for business-critical issues
const checkBusinessMetrics = () => {
  const alerts = [];

  // Check payment processing failures
  if (paymentFailureRate > 0.05) {
    alerts.push({
      type: 'business_critical',
      message: 'High payment failure rate detected',
      severity: 'critical',
      data: { failureRate: paymentFailureRate },
    });
  }

  // Check user registration anomalies
  if (registrationRate < baseline * 0.5) {
    alerts.push({
      type: 'business_warning',
      message: 'Unusual drop in user registrations',
      severity: 'warning',
      data: { currentRate: registrationRate, baseline },
    });
  }

  alerts.forEach(alert => {
    Sentry.captureMessage(alert.message, alert.severity, {
      tags: { alert_type: alert.type },
      extra: alert.data,
    });
  });
};
```

## Environment Variables

### Required Sentry Configuration
```bash
# Backend
SENTRY_DSN=your_sentry_dsn_here
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1

# Frontend
REACT_APP_SENTRY_DSN=your_sentry_dsn_here
REACT_APP_SENTRY_ENVIRONMENT=production
REACT_APP_VERSION=1.0.0
```

### Optional Monitoring Configuration
```bash
# Performance monitoring
ENABLE_APM=true
METRICS_COLLECTION_INTERVAL=60000
HEALTH_CHECK_INTERVAL=30000

# Alerting thresholds
ERROR_RATE_THRESHOLD=0.05
RESPONSE_TIME_THRESHOLD=2000
MEMORY_USAGE_THRESHOLD=90
```

## Best Practices

1. **Sensitive Data Filtering**: Always filter sensitive data before sending to monitoring services
2. **Sampling Rates**: Use appropriate sampling rates to balance detail vs. performance
3. **Alert Fatigue**: Configure alerts carefully to avoid notification fatigue
4. **Context Information**: Include relevant context in error reports
5. **Regular Review**: Review monitoring data regularly to identify trends
6. **Performance Impact**: Monitor the performance impact of monitoring itself

## Dashboard Setup

Create custom dashboards in Sentry to monitor:
- Error rates by endpoint
- Response time trends
- User satisfaction metrics
- Business KPI trends
- Infrastructure health status

For detailed dashboard configuration, see [Sentry Dashboard Setup Guide](docs/SENTRY_DASHBOARDS.md).