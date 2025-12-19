import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
// Service URLs
const EVENT_SERVICE = process.env.EVENT_SERVICE_URL || 'http://localhost:3001';
const PAYMENT_SERVICE = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3002';
const BOOKING_SERVICE = process.env.BOOKING_SERVICE_URL || 'http://localhost:3003';
const USER_SERVICE = process.env.USER_SERVICE_URL || 'http://localhost:3004';
// Middleware
app.use(cors());
app.use(express.json());
// Gateway health check
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'api-gateway',
        timestamp: new Date().toISOString()
    });
});
// Proxy options with error handling
const proxyOptions = {
    changeOrigin: true,
    onError: (err, req, res) => {
        console.error('Proxy error:', err.message);
        res.status(502).json({
            error: 'Bad Gateway',
            message: 'Service temporarily unavailable'
        });
    },
    onProxyReq: (proxyReq, req) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} -> ${proxyReq.path}`);
    }
};
// Route to Event Service (events and tickets)
app.use('/api/events', createProxyMiddleware({
    target: EVENT_SERVICE,
    ...proxyOptions
}));
app.use('/api/tickets', createProxyMiddleware({
    target: EVENT_SERVICE,
    ...proxyOptions
}));
// Route to Payment Service
app.use('/api/payments', createProxyMiddleware({
    target: PAYMENT_SERVICE,
    ...proxyOptions
}));
// Route to Booking Service
app.use('/api/bookings', createProxyMiddleware({
    target: BOOKING_SERVICE,
    ...proxyOptions
}));
// Route to User Service (if implemented)
app.use('/api/users', createProxyMiddleware({
    target: USER_SERVICE,
    ...proxyOptions
}));
// 404 handler
app.use((_req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource does not exist'
    });
});
app.listen(PORT, () => {
    console.log(`\n🚀 API Gateway running on port ${PORT}`);
    console.log(`\nProxying to:`);
    console.log(`  - Events/Tickets: ${EVENT_SERVICE}`);
    console.log(`  - Payments: ${PAYMENT_SERVICE}`);
    console.log(`  - Bookings: ${BOOKING_SERVICE}`);
    console.log(`  - Users: ${USER_SERVICE}`);
    console.log(`\nHealth check: http://localhost:${PORT}/health\n`);
});
//# sourceMappingURL=server.js.map