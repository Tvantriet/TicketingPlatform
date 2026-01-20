import amqp from 'amqplib';
import { RABBITMQ_CONFIG, EXCHANGES } from './messagingConfig.js';

let connection: amqp.ChannelModel | null = null;
let channel: amqp.Channel | null = null;
let reconnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 30000;

async function connect(): Promise<void> {
    if (reconnecting) {
        console.log('Already reconnecting, skipping...');
        return;
    }
    
    reconnecting = true;
    
    try {
        console.log('Connecting to RabbitMQ...');
        connection = await amqp.connect(RABBITMQ_CONFIG.url);
        channel = await connection.createChannel();
        
        await channel.assertExchange(EXCHANGES.USERS, 'topic', { durable: true });
        
        reconnectAttempts = 0;
        
        connection.on('error', (err: any) => {
            console.error('RabbitMQ connection error:', err);
            connection = null;
            channel = null;
        });
        
        connection.on('close', async () => {
            console.log('RabbitMQ connection closed');
            connection = null;
            channel = null;
            reconnecting = false;
            await scheduleReconnect();
        });
        
        console.log('RabbitMQ sender connected successfully');
    } catch (error) {
        console.error('Failed to connect to RabbitMQ:', error);
        connection = null;
        channel = null;
        reconnecting = false;
        await scheduleReconnect();
    } finally {
        reconnecting = false;
    }
}

async function scheduleReconnect(): Promise<void> {
    reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), MAX_RECONNECT_DELAY);
    console.log(`Scheduling reconnect attempt ${reconnectAttempts} in ${delay}ms`);
    setTimeout(() => connect(), delay);
}

export async function initSender(): Promise<void> {
    await connect();
}

export async function sendMessage(message: any, routingKey: string): Promise<void> {
    if (!channel) {
        console.warn('Channel not available, attempting to reconnect...');
        await connect();
    }
    
    if (!channel) {
        throw new Error('Unable to send message: RabbitMQ channel not available');
    }
    
    try {
        channel.publish(EXCHANGES.USERS, routingKey, Buffer.from(JSON.stringify(message)), { persistent: true });
        console.log(`Published to ${EXCHANGES.USERS}:`, message, 'with key:', routingKey);
    } catch (error) {
        console.error('Error publishing message:', error);
        channel = null;
        throw error;
    }
}

export async function closeSender(): Promise<void> {
    try {
        if (channel) await channel.close();
        if (connection) await connection.close();
        console.log('Sender closed');
    } catch (error) {
        console.error('Error closing sender:', error);
    } finally {
        channel = null;
        connection = null;
    }
}
