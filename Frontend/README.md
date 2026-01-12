# Ticketing Platform Frontend

Simple React frontend for managing events and booking tickets.

## Features

- **Event Management**: Create, read, update, and delete events
- **Ticket Booking**: Browse available tickets and complete bookings with payment
- **Real-time Updates**: Polls booking status during payment processing

## Tech Stack

- React 18 + TypeScript
- Vite (build tool)
- React Router (routing)
- Native Fetch API (no axios needed)

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the dev server:
   ```bash
   npm run dev
   ```

3. Open http://localhost:5173

## API Integration

The frontend connects to the Gateway API at `http://localhost:3000` via proxy.

Make sure the following services are running:
- Gateway (port 3000)
- EventService (port 3001)
- BookingService (port 3003)
- MockPaymentService (port 3002)

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` folder.

## Docker Deployment

Build and run with Docker:

```bash
docker build -t frontend:latest .
docker run -p 8080:80 frontend:latest
```

Open http://localhost:8080

The Docker image uses nginx to serve static files and proxy API requests to the Gateway service.

## Kubernetes Deployment

Deploy to k3d cluster:

```bash
# Build and import image
docker build -t frontend:latest .
k3d image import frontend:latest -c ticketing

# Deploy
kubectl apply -f deployment.yaml

# Access via port-forward
kubectl port-forward svc/frontend 8080:80
```

