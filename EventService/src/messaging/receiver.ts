import amqp from 'amqplib';
import { RABBITMQ_CONFIG, EXCHANGES } from './messagingConfig.js';

interface ReceiverConfig {
    routingKeyPattern: string;
    handler: (msg: any) => void;
    queueName?: string;
}

let receiverConnection: amqp.ChannelModel | null = null;
let receiverChannels: amqp.Channel[] = [];
let reconnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 30000;
const receivers: ReceiverConfig[] = [];

async function connectReceiver(): Promise<void> {
    if (reconnecting) {
        console.log('Receiver already reconnecting, skipping...');
        return;
    }
    
    reconnecting = true;
    
    try {
        console.log('Connecting receiver to RabbitMQ...');
        receiverConnection = await amqp.connect(RABBITMQ_CONFIG.url);
        
        // Reset reconnect attempts on successful connection
        reconnectAttempts = 0;
        
        // Setup all receivers
        for (const config of receivers) {
            await setupReceiver(config);
        }
        
        // Handle connection errors
        receiverConnection.on('error', (err) => {
            console.error('RabbitMQ receiver connection error:', err);
            receiverConnection = null;
            receiverChannels = [];
        });
        
        // Handle connection close
        receiverConnection.on('close', async () => {
            console.log('RabbitMQ receiver connection closed');
            receiverConnection = null;
            receiverChannels = [];
            reconnecting = false;
            await scheduleReconnect();
        });
        
        console.log('RabbitMQ receiver connected successfully');
    } catch (error) {
        console.error('Failed to connect receiver to RabbitMQ:', error);
        receiverConnection = null;
        receiverChannels = [];
        reconnecting = false;
        await scheduleReconnect();
    } finally {
        reconnecting = false;
    }
}

async function setupReceiver(config: ReceiverConfig): Promise<void> {
    if (!receiverConnection) {
        throw new Error('No receiver connection available');
    }
    
    const channel = await receiverConnection.createChannel();
    
    await channel.assertExchange(EXCHANGES.TICKETS, 'topic', { durable: true });
    
    // Use named queue or exclusive queue
    const queueName = config.queueName || '';
    const q = await channel.assertQueue(queueName, { 
        exclusive: queueName === '',
        durable: queueName !== ''
    });
    
    await channel.bindQueue(q.queue, EXCHANGES.TICKETS, config.routingKeyPattern);
    
    console.log(`Receiver listening for pattern: ${config.routingKeyPattern}`);

    channel.consume(q.queue, (msg) => {
        if (msg) {
            try {
                const content = JSON.parse(msg.content.toString());
                config.handler(content);
                channel.ack(msg);
            } catch (error) {
                console.error('Error processing message:', error);
                channel.nack(msg, false, false);
            }
        }
    });
    
    receiverChannels.push(channel);
}

async function scheduleReconnect(): Promise<void> {
    reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), MAX_RECONNECT_DELAY);
    console.log(`Scheduling receiver reconnect attempt ${reconnectAttempts} in ${delay}ms`);
    setTimeout(() => connectReceiver(), delay);
}

export async function startReceiver(
    routingKeyPattern: string, 
    handler: (msg: any) => void,
    queueName: string = ''
): Promise<void> {
    const config: ReceiverConfig = {
        routingKeyPattern,
        handler,
        queueName
    };
    
    // Store config for reconnection
    receivers.push(config);
    
    // Connect if not already connected
    if (!receiverConnection) {
        await connectReceiver();
    } else {
        await setupReceiver(config);
    }
}

export async function closeReceivers(): Promise<void> {
    try {
        for (const channel of receiverChannels) {
            await channel.close();
        }
        if (receiverConnection) {
            await receiverConnection.close();
        }
        console.log('Receivers closed');
    } catch (error) {
        console.error('Error closing receivers:', error);
    } finally {
        receiverChannels = [];
        receiverConnection = null;
    }
}

