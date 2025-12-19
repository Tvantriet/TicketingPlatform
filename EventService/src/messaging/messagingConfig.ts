export const RABBITMQ_CONFIG = {
    url: process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672',
};

export const EXCHANGES = {
    TICKETS: 'tickets',
};

export const ROUTING_KEYS = {
    TICKET_RESERVE: 'ticket.reserve',
    TICKET_RELEASE: 'ticket.release',
};

export const QUEUES = {
    TICKET_RESERVES: 'ticket-reserves',
    TICKET_RELEASES: 'ticket-releases',
};

