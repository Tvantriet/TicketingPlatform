import amqp from 'amqplib';
import { RABBITMQ_CONFIG, EXCHANGES } from './messagingConfig.js';

export async function startReceiver(
    routingKeyPattern: string, 
    handler: (msg: any) => void,
    queueName: string = ''
) {
    const conn = await amqp.connect(RABBITMQ_CONFIG.url);
    const channel = await conn.createChannel();
    
    await channel.assertExchange(EXCHANGES.PAYMENTS, 'topic', { durable: true });
    
    // If queueName is empty, creates exclusive queue (auto-deleted when connection closes)
    const q = await channel.assertQueue(queueName, { 
        exclusive: queueName === '',
        durable: queueName !== ''
    });
    
    await channel.bindQueue(q.queue, EXCHANGES.PAYMENTS, routingKeyPattern);
    
    console.log(`Receiver started. Listening for messages with pattern: ${routingKeyPattern}`);

    channel.consume(q.queue, (msg) => {
        if (msg) {
            try {
                const content = JSON.parse(msg.content.toString());
                handler(content);
                channel.ack(msg);
            } catch (error) {
                console.error('Error processing message:', error);
                channel.nack(msg, false, false); // reject, don't requeue
            }
        }
    });
}