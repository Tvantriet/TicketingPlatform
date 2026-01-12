/**
 * Service URL configuration
 */
export const SERVICE_URLS = {
  EVENT_SERVICE: process.env.EVENT_SERVICE_URL || 'http://localhost:3001',
  PAYMENT_SERVICE: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3002',
  BOOKING_SERVICE: process.env.BOOKING_SERVICE_URL || 'http://localhost:3003',
  USER_SERVICE: process.env.USER_SERVICE_URL || 'http://localhost:3004',
} as const;

export const PORT = process.env.PORT || 3000;
