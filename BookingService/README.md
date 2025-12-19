# Booking Service

Handles ticket reservations and payment processing via RabbitMQ.

## Features
- 10-minute ticket reservation hold
- Async payment processing
- Status polling endpoint

## API Endpoints

### Create Booking
```bash
POST /api/bookings
{
  "ticketId": "ticket-123",
  "userId": "user-456",
  "paymentDetails": {
    "amount": 75.00,
    "cardNumber": "4111111111111111"
  }
}

# Response
{
  "bookingId": "booking-1234567890-abc123",
  "status": "pending",
  "message": "Booking created. Poll /bookings/:bookingId for payment status"
}
```

### Check Booking Status
```bash
GET /api/bookings/:bookingId

# Response
{
  "bookingId": "booking-1234567890-abc123",
  "ticketId": "ticket-123",
  "userId": "user-456",
  "status": "confirmed",  // or "pending", "failed", "expired"
  "createdAt": "2024-12-04T10:30:00Z",
  "expiresAt": "2024-12-04T10:40:00Z"
}
```

## Frontend Integration

### Option 1: Polling (Simple)

```javascript
async function createBooking(ticketId, userId, paymentDetails) {
  // Create booking
  const response = await fetch('http://localhost:3003/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticketId, userId, paymentDetails })
  });
  
  const { bookingId } = await response.json();
  
  // Poll for status every 2 seconds
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      const statusRes = await fetch(`http://localhost:3003/api/bookings/${bookingId}`);
      const booking = await statusRes.json();
      
      if (booking.status === 'confirmed') {
        clearInterval(interval);
        resolve(booking);
      } else if (booking.status === 'failed' || booking.status === 'expired') {
        clearInterval(interval);
        reject(new Error(`Payment ${booking.status}`));
      }
    }, 2000);
    
    // Timeout after 10 minutes
    setTimeout(() => {
      clearInterval(interval);
      reject(new Error('Booking timeout'));
    }, 10 * 60 * 1000);
  });
}

// Usage
try {
  const booking = await createBooking('ticket-123', 'user-456', {
    amount: 75.00,
    cardNumber: '4111111111111111'
  });
  console.log('Payment successful!', booking);
} catch (error) {
  console.error('Payment failed:', error);
}
```

### Option 2: WebSockets (Better UX - TODO)

For real-time updates without polling, add WebSocket support:

```javascript
// Server side (add to server.ts)
import { Server } from 'socket.io';

const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  socket.on('subscribe:booking', (bookingId) => {
    socket.join(`booking:${bookingId}`);
  });
});

// Emit when status changes
io.to(`booking:${bookingId}`).emit('booking:updated', booking);

// Client side
const socket = io('http://localhost:3003');

socket.on('connect', () => {
  socket.emit('subscribe:booking', bookingId);
});

socket.on('booking:updated', (booking) => {
  if (booking.status === 'confirmed') {
    console.log('Payment successful!', booking);
  }
});
```

## Message Flow

1. Frontend → `POST /bookings` → BookingService
2. BookingService → `payment.request` → RabbitMQ
3. MockPaymentService processes payment
4. MockPaymentService → `payment.completed/failed` → RabbitMQ
5. BookingService receives message, updates status
6. Frontend polls or receives WebSocket event

