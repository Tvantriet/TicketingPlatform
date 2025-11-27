import express from 'express';
import cors from 'cors';
import paymentRoutes from './routes/paymentRoutes.js';
import { initSender } from './messaging/sender.js';
import { startReceiver } from './messaging/receiver.js';
import { ROUTING_KEYS, QUEUES } from './messaging/messagingConfig.js';


const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'mock-payment-service' });
});

app.use('/api/payments', paymentRoutes);

// Initialize messaging, then start server
async function start() {
    await initSender(); // sender ready for outgoing messages
    await startReceiver(ROUTING_KEYS.PAYMENT_REQUEST, (msg) => {
        console.log('Received payment request:', msg);
    }, QUEUES.PAYMENT_REQUESTS); // listen for incoming payment requests
    
    app.listen(PORT, () => {
        console.log(`Mock Payment Service listening on port ${PORT}`);
    });
}

start();

