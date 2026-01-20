import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import userRoutes from './routes/userRoutes.js';
import { metricsMiddleware } from './middleware/metrics.js';
import { register } from './utils/metrics.js';
import { initSender } from './messaging/sender.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);

app.set('trust proxy', true);

// Prometheus metrics endpoint
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Routes
app.use('/api/users', userRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'user-service' });
});

// Initialize messaging
async function initializeMessaging() {
  try {
    await initSender();
    console.log('Messaging initialized');
  } catch (error) {
    console.error('Failed to initialize messaging:', error);
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`UserService running on port ${PORT}`);
  initializeMessaging();
});
