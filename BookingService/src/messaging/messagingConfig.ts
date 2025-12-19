export const RABBITMQ_CONFIG = {
    url: process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672',
};

export const EXCHANGES = {
    PAYMENTS: 'payments',
    TICKETS: 'tickets',
};

export const ROUTING_KEYS = {
    PAYMENT_REQUEST: 'payment.request',
    PAYMENT_COMPLETED: 'payment.completed',
    PAYMENT_FAILED: 'payment.failed',
    TICKET_RESERVE: 'ticket.reserve',
    TICKET_RELEASE: 'ticket.release',
};
    
export const QUEUES = {
    PAYMENT_COMPLETED: 'booking-payment-completed',
    PAYMENT_FAILED: 'booking-payment-failed',
};

