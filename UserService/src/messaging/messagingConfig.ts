export const RABBITMQ_CONFIG = {
    url: process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672',
};

export const EXCHANGES = {
    USERS: 'users',
};

export const ROUTING_KEYS = {
    USER_DELETION_REQUEST: 'user.deletion.request',
};
