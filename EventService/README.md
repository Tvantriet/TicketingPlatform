# Event Service

Express.js microservice for managing events in the Ticketing Platform.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

- `GET /health` - Health check
- `GET /api/events` - Get all events
- `GET /api/events/:id` - Get event by ID
- `POST /api/events` - Create new event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

## Quick Use Case Example

### Create an Event
```bash
curl -X POST http://localhost:3001/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Summer Music Festival",
    "description": "Annual outdoor music festival",
    "venue": "Central Park",
    "date": "2024-07-15T18:00:00Z",
    "capacity": 5000,
    "price": 75.00
  }'
```

### Get All Events
```bash
curl http://localhost:3001/api/events
```

### Get Event by ID
```bash
curl http://localhost:3001/api/events/1
```

