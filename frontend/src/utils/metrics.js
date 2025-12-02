import { Sentry } from '../config/sentry';

export const trackPageView = (pageName, userId = null) => {
  Sentry.addBreadcrumb({
    category: 'navigation',
    message: `Page view: ${pageName}`,
    level: 'info',
    data: { 
      pageName, 
      userId, 
      timestamp: new Date().toISOString() 
    },
  });

  // Track as transaction
  const transaction = Sentry.startTransaction({
    name: `Page: ${pageName}`,
    op: 'page_view',
  });

  return transaction;
};

export const trackUserAction = (action, userId = null, data = {}) => {
  Sentry.addBreadcrumb({
    category: 'user_action',
    message: action,
    level: 'info',
    data: { 
      userId, 
      ...data, 
      timestamp: new Date().toISOString() 
    },
  });

  // Track critical user actions
  const criticalActions = ['login', 'logout', 'payment_submit', 'data_export', 'settings_change'];
  if (criticalActions.includes(action)) {
    Sentry.captureMessage(`User action: ${action}`, 'info', {
      tags: { user_action: action },
      extra: { userId, data },
    });
  }
};

export const trackPerformance = (metric, value, unit = 'ms', tags = {}) => {
  Sentry.setContext('performance', {
    [metric]: {
      value,
      unit,
      timestamp: new Date().toISOString(),
      ...tags,
    },
  });

  // Alert on poor performance
  if (metric === 'page_load_time' && value > 3000) {
    Sentry.captureMessage('Slow page load detected', 'warning', {
      extra: { metric, value, unit },
    });
  }

  if (metric === 'api_response_time' && value > 2000) {
    Sentry.captureMessage('Slow API response detected', 'warning', {
      extra: { metric, value, unit },
    });
  }
};

export const trackError = (error, context = {}) => {
  Sentry.captureException(error, {
    extra: context,
    level: 'error',
  });
};

export const trackAPIError = (error, endpoint, method, userId = null) => {
  Sentry.captureException(error, {
    tags: { 
      api_error: 'true',
      endpoint,
      method 
    },
    extra: { 
      endpoint, 
      method, 
      userId,
      timestamp: new Date().toISOString() 
    },
  });
};

export const trackBusinessEvent = (eventName, userId = null, data = {}) => {
  Sentry.addBreadcrumb({
    category: 'business',
    message: eventName,
    level: 'info',
    data: { 
      userId, 
      ...data, 
      timestamp: new Date().toISOString() 
    },
  });

  // Track critical business events
  const criticalEvents = [
    'user_registered', 
    'subscription_created', 
    'payment_failed', 
    'data_exported', 
    'integration_connected'
  ];
  
  if (criticalEvents.includes(eventName)) {
    Sentry.captureMessage(`Business event: ${eventName}`, 'info', {
      tags: { business_event: eventName },
      extra: { userId, data },
    });
  }
};

export const trackSecurityEvent = (eventType, details = {}) => {
  Sentry.captureMessage(`Security event: ${eventType}`, 'warning', {
    tags: { security_event: eventType },
    extra: details,
  });
};

// Performance monitoring utilities
export const measurePerformance = (name, fn) => {
  return async (...args) => {
    const transaction = Sentry.startTransaction({
      name,
      op: 'function',
    });

    try {
      const result = await fn(...args);
      transaction.setStatus('ok');
      return result;
    } catch (error) {
      transaction.setStatus('internal_error');
      Sentry.captureException(error);
      throw error;
    } finally {
      transaction.finish();
    }
  };
};

// User session tracking
export const trackSession = (userId, sessionData = {}) => {
  Sentry.setUser({
    id: userId,
    ...sessionData,
  });
};

// Clear user context on logout
export const clearUserContext = () => {
  Sentry.configureScope(scope => {
    scope.setUser(null);
  });
};