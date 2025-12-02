const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

const initializeSentry = () => {
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      release: process.env.npm_package_version || '1.0.0',
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express({
          app: require('../server'),
        }),
        nodeProfilingIntegration,
      ],
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1,
      profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE) || 0.1,
      beforeSend(event, hint) {
        // Filter out sensitive data
        if (event.request?.headers?.authorization) {
          delete event.request.headers.authorization;
        }
        if (event.request?.headers?.['x-api-key']) {
          delete event.request.headers['x-api-key'];
        }
        if (event.request?.cookies) {
          delete event.request.cookies;
        }
        
        return event;
      },
      beforeBreadcrumb(breadcrumb) {
        // Filter out sensitive data from breadcrumbs
        if (breadcrumb.category === 'console' && breadcrumb.data?.arguments) {
          breadcrumb.data.arguments = breadcrumb.data.arguments.map(arg => {
            if (typeof arg === 'string' && (arg.includes('password') || arg.includes('token'))) {
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

module.exports = { initializeSentry, Sentry };