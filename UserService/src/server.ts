import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import userRoutes from './routes/userRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Trust proxy for accurate IP addresses
app.set('trust proxy', true);

// Routes
app.use('/api/users', userRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'user-service' });
});

// Start server
app.listen(PORT, () => {
  console.log(`UserService running on port ${PORT}`);
});
