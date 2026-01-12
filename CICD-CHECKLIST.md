# CI/CD Setup Checklist

Complete this checklist to set up your CI/CD pipeline.

## Prerequisites ✅

- [ ] Git repository on GitHub
- [ ] Kubernetes cluster (GKE, EKS, AKS, or k3d for local)
- [ ] PostgreSQL databases (for EventService and BookingService)
- [ ] RabbitMQ instance
- [ ] Container registry access (GitHub Container Registry, Docker Hub, or AWS ECR)

## Phase 1: Local Setup (10 mins)

- [ ] Install dependencies: `make install`
- [ ] Build all services: `make build`
- [ ] Test locally: `make docker-up`
- [ ] Verify services running: `docker ps`
- [ ] Stop services: `make docker-down`

## Phase 2: Repository Setup (5 mins)

- [ ] Pipeline file created in `.github/workflows/ci-cd.yml`
- [ ] Review and customize workflow as needed

## Phase 3: Secrets Configuration (15 mins)

### GitHub Secrets (`Settings > Secrets and variables > Actions`):
```
Required:
- [ ] KUBECONFIG (base64 encoded)
- [ ] EVENT_DB_URL (postgres connection string)
- [ ] BOOKING_DB_URL (postgres connection string)

Optional (if not using GitHub Container Registry):
- [ ] DOCKER_REGISTRY_USER
- [ ] DOCKER_REGISTRY_TOKEN
```

**Generate KUBECONFIG secret:**
```bash
cat ~/.kube/config | base64 -w 0
# Or on Mac:
cat ~/.kube/config | base64
```


## Phase 4: Update Configuration Files (10 mins)

- [ ] Update `.github/workflows/ci-cd.yml` line 7-8 with your registry details:
```yaml
env:
  REGISTRY: ghcr.io
  IMAGE_PREFIX: your-github-username/ticketing
```

- [ ] Update `scripts/update-k8s-images.sh` with your registry

- [ ] Update deployment YAML files with correct image names:
  - [ ] `EventService/deployment.yaml`
  - [ ] `BookingService/deployment.yaml`
  - [ ] `MockPaymentService/deployment.yaml`

Example:
```yaml
spec:
  containers:
  - name: eventservice
    image: ghcr.io/your-username/ticketing-event:latest
```

## Phase 5: Add Test Scripts (15 mins)

Update `package.json` in each service to add real test commands:

- [ ] EventService/package.json
- [ ] BookingService/package.json
- [ ] MockPaymentService/package.json
- [ ] Gateway/package.json
- [ ] UserService/package.json

Replace:
```json
"test": "echo \"Error: no test specified\" && exit 1"
```

With (using your test framework):
```json
"test": "jest --coverage",
"test:watch": "jest --watch"
```

Or just make tests pass for now:
```json
"test": "echo \"Tests not implemented yet\" && exit 0"
```

## Phase 6: Kubernetes Setup (20 mins)

### Local K8s (k3d):
```bash
- [ ] k3d cluster create ticketing
- [ ] kubectl apply -f k8s-infrastructure.yaml
- [ ] kubectl apply -f k8s-monitoring.yaml
- [ ] kubectl apply -f k8s-services.yaml
- [ ] make k8s-deploy
```

### Production K8s:
- [ ] Create namespace: `kubectl create namespace ticketing-prod`
- [ ] Create secrets for database URLs
```bash
kubectl create secret generic event-db-secret \
  --from-literal=DATABASE_URL=$EVENT_DB_URL \
  -n ticketing-prod
```
- [ ] Apply infrastructure: `kubectl apply -f k8s-infrastructure.yaml -n ticketing-prod`
- [ ] Apply services: `kubectl apply -f k8s-services.yaml -n ticketing-prod`

## Phase 7: First Pipeline Run (5 mins)

- [ ] Create a new branch: `git checkout -b test-pipeline`
- [ ] Make a small change (e.g., update README)
- [ ] Commit and push: `git add . && git commit -m "test: CI/CD setup" && git push`
- [ ] Go to Actions/Pipelines tab and watch the pipeline run
- [ ] Verify:
  - [ ] Build jobs pass
  - [ ] Test jobs run (may fail if no tests yet)
  - [ ] Docker images built (on main branch)

## Phase 8: First Deployment (10 mins)

- [ ] Merge test branch to `main`
- [ ] Watch deployment in pipeline
- [ ] Verify pods running: `kubectl get pods`
- [ ] Check service endpoints: `kubectl get services`
- [ ] Test service: `curl http://<service-ip>:3001/health` (or equivalent)

## Phase 9: Database Migrations (5 mins)

If migrations in pipeline failed:
```bash
# Run manually first time
cd EventService
npx prisma migrate deploy --schema=./prisma/schema.prisma

cd ../BookingService
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

Then migrations will work automatically in pipeline.

## Phase 10: Monitoring & Validation (10 mins)

- [ ] Check deployment status:
```bash
kubectl rollout status deployment/eventservice
kubectl rollout status deployment/bookingservice
kubectl rollout status deployment/mockpaymentservice
```

- [ ] View logs:
```bash
kubectl logs -f deployment/eventservice
```

- [ ] Test services are responding:
```bash
kubectl port-forward service/eventservice 3001:3001
curl http://localhost:3001/health
```

## Optional Enhancements

### Security Scanning:
- [ ] Add Trivy scan to pipeline
- [ ] Add dependency vulnerability scanning
- [ ] Add SAST tools (Snyk, SonarQube)

### Testing:
- [ ] Add unit tests to all services
- [ ] Add integration tests
- [ ] Add load testing to pipeline (K6 or Artillery)
- [ ] Add E2E tests

### Monitoring:
- [ ] Set up Prometheus metrics endpoints
- [ ] Configure Grafana dashboards
- [ ] Add alerting (PagerDuty, Slack)
- [ ] Set up log aggregation (ELK, Loki)

### Deployment:
- [ ] Implement blue-green deployments
- [ ] Add canary releases
- [ ] Configure auto-scaling (HPA)
- [ ] Add deployment approval gates

### Developer Experience:
- [ ] Install husky: `npm install -D husky && npx husky install`
- [ ] Enable pre-commit hooks
- [ ] Add commit message linting
- [ ] Configure VS Code debugging for Docker/K8s

## Troubleshooting

### Pipeline fails at "Build Docker image"
**Fix**: Check Dockerfile syntax, ensure all dependencies in package.json

### Pipeline fails at "Deploy to K8s"
**Fix**: Verify KUBECONFIG secret is correct, check cluster connectivity

### Pipeline fails at "Prisma migrations"
**Fix**: Ensure DATABASE_URL secrets are set, verify DB accessibility

### Images not updating in K8s
**Fix**: Check image pull policy is not "Never", verify registry access

### Services crashing after deployment
**Fix**: Check environment variables, verify database/RabbitMQ connectivity

## Quick Commands Reference

```bash
# Local development
make help                 # Show all commands
make install              # Install all dependencies
make build                # Build all services
make docker-up            # Start with docker-compose
make ci-test              # Simulate full CI pipeline

# Kubernetes
make k8s-deploy           # Deploy to K8s
make k8s-status           # Check status
kubectl logs -f <pod>     # View logs
kubectl describe pod <pod> # Debug pod issues

# Manual deployment
docker build -t service:tag ServiceDir
docker push registry/service:tag
kubectl set image deployment/service service=registry/service:tag
kubectl rollout status deployment/service

# Rollback
kubectl rollout undo deployment/service
kubectl rollout history deployment/service
```

## Success Criteria ✅

Your CI/CD pipeline is working when:

- [ ] Code pushed to any branch triggers build + test
- [ ] Code merged to `main` triggers full deployment
- [ ] Only changed services are built (monorepo optimization)
- [ ] Docker images are built and pushed to registry
- [ ] K8s deployments update automatically
- [ ] Prisma migrations run successfully
- [ ] Services start and pass health checks
- [ ] Rollback works if deployment fails
- [ ] Team can see deployment status in pipeline UI

## Next Steps After Setup

1. **Add proper tests** - Replace placeholder test scripts
2. **Set up staging environment** - Add `develop` branch → staging deployment
3. **Configure monitoring** - Prometheus + Grafana
4. **Add alerts** - For deployment failures, service health
5. **Document deployment process** - For your team
6. **Set up backup/restore** - For databases
7. **Configure auto-scaling** - HPA based on metrics
8. **Implement feature flags** - For gradual rollouts

## Support

- GitHub Actions docs: https://docs.github.com/en/actions
- Kubernetes docs: https://kubernetes.io/docs/home/
- Prisma migrations: https://www.prisma.io/docs/concepts/components/prisma-migrate

Estimated total setup time: **90-120 minutes**

