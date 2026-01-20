import { Counter, Registry, Histogram } from 'prom-client';

// Create a new registry
export const register = new Registry();

// HTTP request metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

export const httpRequestErrors = new Counter({
  name: 'http_request_errors_total',
  help: 'Total number of HTTP request errors (4xx and 5xx)',
  labelNames: ['method', 'route', 'status_code', 'error_type']
});

// Authentication-specific metrics
export const loginAttempts = new Counter({
  name: 'user_login_attempts_total',
  help: 'Total number of login attempts',
  labelNames: ['status'] // success or failure
});

export const loginFailures = new Counter({
  name: 'user_login_failures_total',
  help: 'Total number of failed login attempts',
  labelNames: ['reason'] // user_not_found, invalid_password, validation_error
});

export const registrationAttempts = new Counter({
  name: 'user_registration_attempts_total',
  help: 'Total number of registration attempts',
  labelNames: ['status'] // success or failure
});

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(httpRequestErrors);
register.registerMetric(loginAttempts);
register.registerMetric(loginFailures);
register.registerMetric(registrationAttempts);
