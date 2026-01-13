# K3D Setup Guide for Ticketing Platform

## Prerequisites
- Docker Desktop running
- k3d installed

## Step-by-Step Setup

### 1. Create k3d cluster
```powershell
k3d cluster create ticketing --api-port 6550 --port "8080:80@loadbalancer"
```

```powershell
kubectl config set-cluster k3d-ticketing --server=https://127.0.0.1:6550
```

Verify the connection:
```powershell
kubectl cluster-info
```

### 2. Build Docker images
```powershell
# Build Gateway
cd Gateway
docker build -t gateway:latest .
cd ..

# Build BookingService
cd BookingService
docker build -t bookingservice:latest .
cd ..

# Build EventService
cd EventService
docker build -t eventservice:latest .
cd ..

# Build MockPaymentService
cd MockPaymentService
docker build -t mockpaymentservice:latest .
cd ..

# Build Frontend
cd Frontend
docker build -t frontend:latest .
cd ..
```

### 3. Import images into k3d
```powershell
k3d image import gateway:latest bookingservice:latest eventservice:latest mockpaymentservice:latest frontend:latest -c ticketing
```

### 4. Deploy infrastructure (RabbitMQ only)
```powershell
kubectl apply -f k8s-infrastructure.yaml
```

Wait for RabbitMQ to be ready:
```powershell
kubectl get pods -w
```
(Press Ctrl+C when RabbitMQ shows "Running")

Example:
```yaml
env:
  - name: DATABASE_URL
    value: "postgresql://user:pass@your-cloud-host:5432/dbname"
```

### 6. Deploy services
```powershell
kubectl apply -f k8s-services.yaml
kubectl apply -f Gateway/deployment.yaml
kubectl apply -f BookingService/deployment.yaml
kubectl apply -f EventService/deployment.yaml
kubectl apply -f MockPaymentService/deployment.yaml
kubectl apply -f Frontend/deployment.yaml
```

### 7. Verify everything is running
```powershell
kubectl get pods
kubectl get svc
kubectl get hpa
```

### 8. Test autoscaling
```powershell
# Watch HPA status
kubectl get hpa -w

# Generate load (in another terminal)
kubectl run -it --rm load-generator --image=busybox --restart=Never -- /bin/sh -c "while true; do wget -q -O- http://bookingservice:3003/health; done"
```

## Useful Commands

```powershell
# View logs
kubectl logs -f deployment/frontend-deployment
kubectl logs -f deployment/gateway-deployment
kubectl logs -f deployment/booking-deployment
kubectl logs -f deployment/eventservice-deployment
kubectl logs -f deployment/mockpaymentservice-deployment

# Delete cluster
k3d cluster delete ticketing

# Rebuild and redeploy a service
cd BookingService
docker build -t bookingservice:latest .
k3d image import bookingservice:latest -c ticketing
kubectl rollout restart deployment/booking-deployment

# Rebuild and redeploy frontend
cd Frontend
docker build -t frontend:latest .
k3d image import frontend:latest -c ticketing
kubectl rollout restart deployment/frontend-deployment
```

## Port Forwarding (for local access)

```powershell
# Access Frontend (Web UI)
kubectl port-forward svc/frontend 8080:80
# Then open: http://localhost:8080

# Access RabbitMQ management UI
kubectl port-forward svc/rabbitmq 15672:15672
# Then open: http://localhost:15672 (admin/admin)

# Access Gateway
kubectl port-forward svc/gateway 3000:3000

# Access BookingService
kubectl port-forward svc/bookingservice 3003:3003

# Access EventService
kubectl port-forward svc/eventservice 3001:3001

# Access MockPaymentService
kubectl port-forward svc/mockpaymentservice 3002:3002
```

## Troubleshooting

### kubectl Connection Issues

If `kubectl cluster-info` fails with connection errors:

1. **Check if the cluster is running:**
   ```powershell
   k3d cluster list
   ```

2. **Verify the API port:**
   ```powershell
   kubectl config view
   ```
   Look for the server URL under the cluster configuration.

3. **Manually set the cluster server URL:**
   ```powershell
   kubectl config set-cluster k3d-ticketing --server=https://127.0.0.1:6550
   ```

4. **If using a different API port, recreate the cluster:**
   ```powershell
   k3d cluster delete ticketing
   k3d cluster create ticketing --api-port 6550 --port "8080:80@loadbalancer"
   ```

5. **Verify KUBECONFIG environment variable (if needed):**
   ```powershell
   $env:KUBECONFIG = "C:\Users\$env:USERNAME\.kube\config"
   ```

### Common Issues

- **"No connection could be made"**: The cluster might not be running or the API port is incorrect
- **"host.docker.internal" errors**: Use `127.0.0.1` instead of `0.0.0.0` or `host.docker.internal` for the server URL
- **Port conflicts**: Ensure ports 6550 (API) and 8080 (loadbalancer) are not in use

