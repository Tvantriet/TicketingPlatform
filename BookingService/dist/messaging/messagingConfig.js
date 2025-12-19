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
    PAYMENT_REFUNDED: 'payment.refunded',
    TICKET_RESERVE: 'ticket.reserve',
    TICKET_RELEASE: 'ticket.release',
};
export const QUEUES = {
// BookingService doesn't need a named queue, will use exclusive queue for listening
};
//# sourceMappingURL=messagingConfig.js.map