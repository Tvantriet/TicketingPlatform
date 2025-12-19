import express from 'express';
import cors from 'cors';
import paymentRoutes from './routes/paymentRoutes.js';
import { initSender, closeSender } from './messaging/sender.js';
import { startReceiver, closeReceivers } from './messaging/receiver.js';
import { ROUTING_KEYS, QUEUES } from './messaging/messagingConfig.js';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'mock-payment-service' });
});

app.use('/api/payments', paymentRoutes);

let server: any;

async function start() {
    try {
        await initSender();
        await startReceiver(ROUTING_KEYS.PAYMENT_REQUEST, (msg) => {
            console.log('Received payment request:', msg);
        }, QUEUES.PAYMENT_REQUESTS);
        
        server = app.listen(PORT, () => {
            console.log(`Mock Payment Service listening on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start service:', error);
        process.exit(1);
    }
}

async function gracefulShutdown(signal: string) {
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    
    // Stop accepting new requests
    if (server) {
        server.close(() => {
            console.log('HTTP server closed');
        });
    }
    
    try {
        // Close RabbitMQ connections
        await closeReceivers();
        await closeSender();
        
        console.log('Graceful shutdown complete');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

start();

