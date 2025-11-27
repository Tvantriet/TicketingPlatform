import amqp from 'amqplib';
import { RABBITMQ_CONFIG, EXCHANGES } from './messagingConfig.js';

let connection: amqp.ChannelModel; 
let channel: amqp.Channel;

export async function initSender() {
    connection = await amqp.connect(RABBITMQ_CONFIG.url);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGES.PAYMENTS, 'topic', { durable: true });
    console.log('Sender initialized');
}

export async function sendMessage(message: any, routingKey: string) {
    if (!channel) throw new Error('Sender not initialized. Call initSender() first.');
    
    channel.publish(EXCHANGES.PAYMENTS, routingKey, Buffer.from(JSON.stringify(message)));
    console.log('Published:', message, 'with key:', routingKey);
}

export async function closeSender() {
    if (channel) await channel.close();
    if (connection) await connection.close();
    console.log('Sender closed');
}