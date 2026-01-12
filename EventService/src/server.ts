import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import eventRoutes from './routes/eventRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import { startReceiver, closeReceivers } from './messaging/receiver.js';
import { ROUTING_KEYS, QUEUES } from './messaging/messagingConfig.js';
import * as ticketService from './services/ticketService.js';
import prisma from './db/prisma.js';
import { extractUserContext } from './middleware/userContext.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(extractUserContext); // Extract user context from Gateway headers

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'event-service' });
});

// Routes
app.use('/api/events', eventRoutes);
app.use('/api/tickets', ticketRoutes);

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

let server: any;

async function start() {
  try {
    // Listen for ticket messages
    await startReceiver(ROUTING_KEYS.TICKET_RESERVE, handleTicketReserve, QUEUES.TICKET_RESERVES);
    await startReceiver(ROUTING_KEYS.TICKET_RELEASE, handleTicketRelease, QUEUES.TICKET_RELEASES);
    
    server = app.listen(PORT, () => {
      console.log(`Event Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start service:', error);
    process.exit(1);
  }
}

async function handleTicketReserve(msg: any) {
  try {
    const { ticketId, bookingId } = msg;
    console.log(`Received ticket reserve request for ticket ${ticketId}, booking: ${bookingId}`);
    await ticketService.reserveTicket(ticketId, bookingId);
    console.log(`Ticket ${ticketId} reserved successfully for booking ${bookingId}`);
  } catch (error) {
    console.error('Error reserving ticket:', error);
    // TODO: Send failure message back to BookingService
  }
}

async function handleTicketRelease(msg: any) {
  try {
    const { ticketId, reason } = msg;
    console.log(`Received ticket release request for ticket ${ticketId}, reason: ${reason}`);
    await ticketService.releaseTicket(ticketId);
    console.log(`Ticket ${ticketId} released successfully`);
  } catch (error) {
    console.error('Error releasing ticket:', error);
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
    
    // Close database connections
    await prisma.$disconnect();
    console.log('Database connections closed');
    
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
