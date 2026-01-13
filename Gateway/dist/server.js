import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import proxyRoutes from './routes/proxyRoutes.js';
import { PORT, SERVICE_URLS } from './config/services.js';
dotenv.config();
const app = express();
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
// Proxy routes
app.use('/api', proxyRoutes);
// 404 handler
app.use((_req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource does not exist'
    });
});
app.listen(PORT, () => {
    console.log(`\n API Gateway running on port ${PORT}`);
    console.log(`\nProxying to:`);
    console.log(`  - Events/Tickets: ${SERVICE_URLS.EVENT_SERVICE}`);
    console.log(`  - Payments: ${SERVICE_URLS.PAYMENT_SERVICE}`);
    console.log(`  - Bookings: ${SERVICE_URLS.BOOKING_SERVICE}`);
    console.log(`  - Users: ${SERVICE_URLS.USER_SERVICE}`);
    console.log(`\nHealth check: http://localhost:${PORT}/health\n`);
});
//# sourceMappingURL=server.js.map