# CI/CD Setup Guide

## Required Secrets & Configuration

### GitHub Actions Secrets

Go to: `Settings > Secrets and variables > Actions > New repository secret`

Add the following secrets:

```
# Kubernetes (for non-EKS clusters)
KUBECONFIG                 # Base64 encoded kubeconfig file
                          # Generate: cat ~/.kube/config | base64 -w 0
                          # Or on Windows: [Convert]::ToBase64String([System.IO.File]::ReadAllBytes("$env:USERPROFILE\.kube\config"))

# AWS EKS (for test environment on EKS)
AWS_ACCESS_KEY_ID         # AWS access key with EKS permissions
AWS_SECRET_ACCESS_KEY     # AWS secret access key
AWS_REGION                # AWS region (e.g., us-east-1)
EKS_CLUSTER_NAME          # Name of your EKS cluster

# Database URLs (Production)
EVENT_DB_URL              # postgres://user:pass@host:5432/events
BOOKING_DB_URL            # postgres://user:pass@host:5432/bookings

# Optional - for custom registry
DOCKER_REGISTRY_USER      # If using Docker Hub instead of GHCR
DOCKER_REGISTRY_TOKEN     # Docker registry token
```

## Pipeline Workflow

1. **Trigger**: Push to `main`/`release`/`development` branches
2. **Change Detection**: Only builds/tests affected services
3. **Build & Test**: Each service independently
4. **Docker Build**: Only on push (not PRs)
5. **Push Images**: To GitHub Container Registry (ghcr.io)
6. **Deploy**: 
   - `main` → production (ticketing-prod namespace) - uses static kubeconfig
   - `release` → staging (ticketing-staging namespace) - uses static kubeconfig
   - `development` → dev on AWS EKS (ticketing-dev namespace) - uses AWS credentials
7. **Migrations**: Run after successful deploy

### Service Dependencies

The pipeline handles:
- ✅ Prisma client generation
- ✅ TypeScript compilation
- ✅ Unit tests (when available)
- ✅ Docker multi-stage builds
- ✅ K8s rolling deployments
- ✅ Database migrations

## Local Development Pipeline Testing

### Test build locally:
```bash
# Test individual service build
cd EventService
npm ci
npm run prisma:generate
npm run build

# Test Docker build
docker build -t event-service:test .
docker run -p 3001:3001 event-service:test

# Test all services
docker-compose up --build
```

### Test K8s deployment locally (k3d):
```bash
# Create local cluster
k3d cluster create ticketing

# Apply manifests
kubectl apply -f k8s-infrastructure.yaml
kubectl apply -f k8s-services.yaml

# Test image update
kubectl set image deployment/eventservice eventservice=ghcr.io/yourorg/ticketing-event:latest
kubectl rollout status deployment/eventservice
```

## Docker Registry Options

### Option 1: GitHub Container Registry (Default)
- Free for public repos
- Automatic in GitHub Actions
- URL: `ghcr.io/your-username/ticketing-*`

### Option 2: Docker Hub
Change in `.github/workflows/ci-cd.yml`:
```yaml
env:
  REGISTRY: docker.io
  IMAGE_PREFIX: your-dockerhub-username/ticketing
```

Add secrets:
```
DOCKER_REGISTRY_USER=your-dockerhub-username
DOCKER_REGISTRY_TOKEN=your-access-token
```

### Option 3: AWS ECR
```yaml
- name: Log in to ECR
  uses: aws-actions/amazon-ecr-login@v2
  
- name: Build and push
  env:
    ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
    ECR_REPOSITORY: ticketing-event
  run: |
    docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$GITHUB_SHA .
    docker push $ECR_REGISTRY/$ECR_REPOSITORY:$GITHUB_SHA
```

## Deployment Strategies

### Rolling Update (Current)
- Zero downtime
- Gradual rollout
- Auto-rollback on failure

### Blue-Green Deployment
Add to deployment.yaml:
```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 100%
      maxUnavailable: 0
```

### Canary Deployment
Use Argo Rollouts or Flagger with your service mesh.

## Monitoring Deployment

```bash
# Watch deployment progress
kubectl rollout status deployment/eventservice

# Check pod status
kubectl get pods -l app=eventservice

# View logs
kubectl logs -f deployment/eventservice

# Rollback if needed
kubectl rollout undo deployment/eventservice
```

## Common Issues

### Issue: Prisma migrations fail
**Solution**: Ensure DATABASE_URL secrets are set correctly and DB is accessible from CI runner

### Issue: Docker build timeout
**Solution**: Use layer caching:
```yaml
- uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

### Issue: K8s deployment not updating
**Solution**: Force new rollout:
```bash
kubectl rollout restart deployment/eventservice
```

### Issue: Service dependencies not ready
**Solution**: Add health checks and init containers:
```yaml
initContainers:
- name: wait-for-rabbitmq
  image: busybox
  command: ['sh', '-c', 'until nc -z rabbitmq 5672; do sleep 2; done']
```

## Performance Optimizations

### 1. Parallel Builds
Services build in parallel automatically when changes detected.

### 2. Dependency Caching
```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'npm'
    cache-dependency-path: EventService/package-lock.json
```

### 3. Docker Layer Caching
Add to workflow:
```yaml
- uses: docker/setup-buildx-action@v3
- uses: docker/build-push-action@v5
  with:
    cache-from: type=registry,ref=ghcr.io/yourorg/ticketing-event:cache
    cache-to: type=registry,ref=ghcr.io/yourorg/ticketing-event:cache,mode=max
```

## Additional CI/CD Features to Consider

### 1. Load Testing in Pipeline
```yaml
load-test:
  needs: deploy
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Run K6 load tests
      run: |
        docker run --rm -v $PWD/EventService/tests/load:/scripts grafana/k6 run /scripts/load-test-scenarios.js
```

### 2. Security Scanning
```yaml
security-scan:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: '.'
```

### 3. Automated Versioning
```yaml
- name: Bump version
  uses: phips28/gh-action-bump-version@master
  with:
    tag-prefix: 'v'
```

### 4. Slack/Discord Notifications
```yaml
- name: Notify deployment
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Deployment to production completed'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Multi-Environment Setup

### Environments: Dev (EKS), Staging, Production

The workflow automatically determines the environment based on branch:
- `main` → production (ticketing-prod namespace) - uses static kubeconfig
- `release` → staging (ticketing-staging namespace) - uses static kubeconfig
- `development` → dev on AWS EKS (ticketing-dev namespace) - uses AWS credentials

### AWS EKS Setup for Development Environment

1. **Create EKS Cluster** (if not already done):
   ```bash
   aws eks create-cluster --name your-cluster-name --region us-east-1 \
     --role-arn arn:aws:iam::ACCOUNT_ID:role/EKSClusterRole \
     --resources-vpc-config subnetIds=subnet-xxx,subnet-yyy,securityGroupIds=sg-xxx
   ```

2. **Create IAM User/Role for GitHub Actions**:
   - Create IAM user or use existing one
   - Attach policy: `arn:aws:iam::aws:policy/AmazonEKSClusterPolicy`
   - Create access keys and add to GitHub secrets

3. **Configure GitHub Secrets**:
   ```
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   AWS_REGION=us-east-1
   EKS_CLUSTER_NAME=your-cluster-name
   ```

4. **Deploy to Development Environment**:
   ```bash
   git checkout development
   git push origin development
   ```
   The workflow will automatically:
   - Authenticate with AWS
   - Configure kubectl for EKS
   - Deploy to `ticketing-dev` namespace

5. **Verify Deployment**:
   ```bash
   aws eks update-kubeconfig --name your-cluster-name --region us-east-1
   kubectl get pods -n ticketing-dev
   kubectl get svc -n ticketing-dev
   ```

### Static Kubeconfig Setup (for non-EKS clusters)

For local k3d, GKE, AKS, or other Kubernetes clusters:

1. **Get kubeconfig**:
   ```bash
   # For k3d
   kubectl config view --raw > kubeconfig.yaml
   
   # For GKE
   gcloud container clusters get-credentials CLUSTER_NAME --region REGION
   kubectl config view --raw > kubeconfig.yaml
   ```

2. **Base64 encode**:
   ```bash
   # Linux/Mac
   cat kubeconfig.yaml | base64 -w 0
   
   # Windows PowerShell
   [Convert]::ToBase64String([System.IO.File]::ReadAllBytes("kubeconfig.yaml"))
   ```

3. **Add to GitHub Secrets**:
   ```
   KUBECONFIG=<base64-encoded-content>
   ```

## Next Steps

1. ✅ Push pipeline files to repo
2. ✅ Configure secrets in GitHub
3. ✅ Update deployment.yaml files with correct image references
4. ✅ Add test scripts to all package.json files
5. ✅ Set up K8s cluster and configure kubectl access
6. ✅ Create database instances and get connection strings
7. ✅ Test pipeline by pushing to develop branch
8. ✅ Monitor first deployment
9. ✅ Set up monitoring/alerting (Prometheus, Grafana)
10. ✅ Document runbooks for common operations

