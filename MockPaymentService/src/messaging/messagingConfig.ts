// file to configure the messaging system like the exchange, queue, etc.

export const RABBITMQ_CONFIG = {
    url: process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672',
};

export const EXCHANGES = {
    PAYMENTS: 'payments',
    NOTIFICATIONS: 'notifications',
};

export const ROUTING_KEYS = {
    PAYMENT_REQUEST: 'payment.request',
    PAYMENT_COMPLETED: 'payment.completed',
    PAYMENT_FAILED: 'payment.failed',
    PAYMENT_REFUNDED: 'payment.refunded',
};

export const QUEUES = {
    PAYMENT_REQUESTS: 'payment-requests',
    // Event services will create their own queues for status updates
};