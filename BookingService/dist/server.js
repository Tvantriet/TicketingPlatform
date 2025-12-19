import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bookingRoutes from './routes/bookingRoutes.js';
import { initSender, closeSender } from './messaging/sender.js';
import { startReceiver, closeReceivers } from './messaging/receiver.js';
import { ROUTING_KEYS } from './messaging/messagingConfig.js';
import { startCron } from './cron/releaseExpiredReservations.js';
import { handlePaymentResult } from './controllers/bookingController.js';
import prisma from './db/prisma.js';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3003;
app.use(cors());
app.use(express.json());
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'booking-service' });
});
app.use('/api/bookings', bookingRoutes);
let server;
async function start() {
    try {
        await initSender(); // To send payment requests
        // Listen for payment results
        await startReceiver(ROUTING_KEYS.PAYMENT_COMPLETED, handlePaymentCompleted);
        await startReceiver(ROUTING_KEYS.PAYMENT_FAILED, handlePaymentFailed);
        // Start cron job for expiring old bookings
        startCron();
        server = app.listen(PORT, () => {
            console.log(`Booking Service running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error('Failed to start service:', error);
        process.exit(1);
    }
}
async function handlePaymentCompleted(msg) {
    console.log('Payment completed:', msg);
    await handlePaymentResult(msg.bookingId, 'confirmed');
}
async function handlePaymentFailed(msg) {
    console.log('Payment failed:', msg);
    await handlePaymentResult(msg.bookingId, 'failed');
}
async function gracefulShutdown(signal) {
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
        // Close database connections
        await prisma.$disconnect();
        console.log('Database connections closed');
        console.log('Graceful shutdown complete');
        process.exit(0);
    }
    catch (error) {
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
//# sourceMappingURL=server.js.map