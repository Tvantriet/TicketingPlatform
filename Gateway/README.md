# API Gateway

Express-based API Gateway for the Ticketing Platform.

## Setup

```bash
npm install
cp .env.example .env
npm run build
npm start
```

## Development

```bash
npm run dev
```

## Routes

All requests go through `http://localhost:3000`:

- `/api/events` → Event Service (3001)
- `/api/tickets` → Event Service (3001)
- `/api/bookings` → Booking Service (3003)
- `/api/payments` → Payment Service (3002)
- `/api/users` → User Service (3004)
- `/health` → Gateway health check

## Configuration

Edit `.env` to change service URLs or gateway port.

