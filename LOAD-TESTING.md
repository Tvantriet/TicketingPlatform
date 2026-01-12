# Load Testing & Monitoring Guide

## Setup Monitoring (Prometheus + Grafana)

### 1. Deploy Prometheus & Grafana
```powershell
kubectl apply -f k8s-monitoring.yaml
```

### 2. Access Grafana Dashboard
```powershell
kubectl port-forward svc/grafana 3000:3000
```
Open: http://localhost:3000
- Username: `admin`
- Password: `admin`

### 3. Add Prometheus Data Source in Grafana
1. Go to Configuration → Data Sources
2. Add Prometheus
3. URL: `http://prometheus:9090`
4. Save & Test

### 4. Import Kubernetes Dashboard
1. Go to Dashboards → Import
2. Enter ID: `6417` (Kubernetes Cluster Monitoring)
3. Select Prometheus data source
4. Import

## Load Testing Options

### Option 1: Simple PowerShell Script (No Install Required)

**Run the test:**
```powershell
# Terminal 1: Watch pods scale
kubectl get pods -w

# Terminal 2: Watch HPA
kubectl get hpa -w

# Terminal 3: Run load test
.\simple-load-test.ps1 -DurationSeconds 180 -MaxConcurrentRequests 100
```

**Test Phases:**
- Phase 1 (30s): Ramp from 5 → 20 concurrent users
- Phase 2 (90s): Peak at 100 concurrent users (triggers scaling)
- Phase 3 (30s): Ramp down to 5 users
- Phase 4 (30s): Cool down (watch pods scale down)

### Option 2: k6 (Professional Load Testing)

**Install k6:**
```powershell
choco install k6
# Or download from: https://k6.io/docs/getting-started/installation/
```

**Run scenarios:**
```powershell
# Terminal 1: Port forward services
kubectl port-forward svc/bookingservice 3003:3003 &
kubectl port-forward svc/eventservice 3001:3001 &
kubectl port-forward svc/mockpaymentservcice 3002:3002

# Terminal 2: Watch pods scale
kubectl get pods -w

# Terminal 3: Watch HPA
kubectl get hpa -w

# Terminal 4: Run k6 test
k6 run load-test-scenarios.js
```

## What to Watch During Testing

### 1. Pod Count
```powershell
kubectl get pods -w
```
You should see new pods spin up:
```
booking-deployment-xxx   1/1     Running
booking-deployment-yyy   0/1     ContainerCreating  # New pod!
booking-deployment-yyy   1/1     Running            # Ready!
```

### 2. HPA Status
```powershell
kubectl get hpa -w
```
Watch CPU percentage increase and replicas scale:
```
NAME          REFERENCE                     TARGETS    MINPODS   MAXPODS   REPLICAS
booking-hpa   Deployment/booking-deployment  15%/50%   1         5         1
booking-hpa   Deployment/booking-deployment  65%/50%   1         5         2  # Scaled!
booking-hpa   Deployment/booking-deployment  78%/50%   1         5         3  # More!
```

### 3. Detailed Pod Metrics
```powershell
kubectl top pods
```

### 4. Live Logs
```powershell
# Watch all booking pods
kubectl logs -f -l app=booking

# Watch specific pod
kubectl logs -f booking-deployment-xxx
```

## Expected Results

### Scenario 1: Booking Service Load
- **Initial:** 1 pod
- **After 1 min:** Should scale to 2-3 pods (50+ concurrent users)
- **At peak:** Should reach 4-5 pods (100 concurrent users)
- **After ramp down:** Scale back to 1-2 pods (takes ~5 minutes)

### Scenario 2: Event Service Spike
- **Initial:** 1 pod
- **During spike:** Should rapidly scale to 3-4 pods
- **After spike:** Gradual scale down

## Grafana Dashboards to Create

### 1. HPA Overview
Query: `kube_horizontalpodautoscaler_status_current_replicas`

### 2. Request Rate
Query: `rate(http_requests_total[1m])`

### 3. Pod CPU Usage
Query: `sum(rate(container_cpu_usage_seconds_total[1m])) by (pod)`

### 4. Response Time
Query: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`

## Troubleshooting

### Pods not scaling?
1. Check metrics server is running:
   ```powershell
   kubectl top nodes
   ```
   If error, install metrics server:
   ```powershell
   kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
   ```

2. Check HPA has targets:
   ```powershell
   kubectl describe hpa booking-hpa
   ```

### Scale down too slow?
Kubernetes waits 5 minutes before scaling down by default. To speed up (for testing):
```yaml
# Add to HPA spec:
behavior:
  scaleDown:
    stabilizationWindowSeconds: 60  # Default is 300
```

## Clean Up

```powershell
# Remove monitoring
kubectl delete -f k8s-monitoring.yaml

# Stop port forwarding
Get-Job | Stop-Job
Get-Job | Remove-Job
```

