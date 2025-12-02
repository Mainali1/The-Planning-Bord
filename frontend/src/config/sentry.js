import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

const initializeSentry = () => {
  if (process.env.NODE_ENV === 'production' && process.env.REACT_APP_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.REACT_APP_SENTRY_DSN,
      environment: process.env.REACT_APP_SENTRY_ENVIRONMENT || 'production',
      release: process.env.REACT_APP_VERSION || '1.0.0',
      integrations: [
        new BrowserTracing({
          tracingOrigins: [
            'localhost', 
            'api.planningbord.com',
            process.env.REACT_APP_API_URL || 'http://localhost:5000'
          ],
          routingInstrumentation: Sentry.reactRouterV6Instrumentation(
            React.useEffect,
            useLocation,
            useNavigationType,
            createRoutesFromChildren,
            matchRoutes
          ),
        }),
      ],
      tracesSampleRate: parseFloat(process.env.REACT_APP_SENTRY_TRACES_SAMPLE_RATE) || 0.1,
      beforeSend(event, hint) {
        // Filter out sensitive data
        if (event.exception) {
          const error = hint.originalException;
          if (error && error.message) {
            // Check for sensitive patterns
            const sensitivePatterns = ['password', 'token', 'api_key', 'secret'];
            if (sensitivePatterns.some(pattern => 
              error.message.toLowerCase().includes(pattern))) {
              return null; // Don't send this error
            }
          }
        }

        // Filter out user data from URLs
        if (event.request?.url) {
          event.request.url = event.request.url.replace(/\/users\/\d+/, '/users/[id]');
        }

        return event;
      },
      beforeBreadcrumb(breadcrumb) {
        // Filter sensitive data from breadcrumbs
        if (breadcrumb.category === 'console' && breadcrumb.data?.arguments) {
          breadcrumb.data.arguments = breadcrumb.data.arguments.map(arg => {
            if (typeof arg === 'string' && 
                (arg.includes('password') || arg.includes('token'))) {
              return '[FILTERED]';
            }
            return arg;
          });
        }
        return breadcrumb;
      },
    });
  }
};

export { initializeSentry, Sentry };