# CertaintyAI Deployment Guide

This guide covers the complete deployment process for CertaintyAI, including CI/CD pipeline setup, blue-green deployments, monitoring, and rollback procedures.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [CI/CD Pipeline Setup](#cicd-pipeline-setup)
3. [Blue-Green Deployment](#blue-green-deployment)
4. [Monitoring and Validation](#monitoring-and-validation)
5. [Rollback Procedures](#rollback-procedures)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

### Infrastructure Requirements

- Kubernetes cluster (v1.24+)
- Container registry (GitHub Container Registry)
- Monitoring stack (Prometheus, Grafana)
- Load balancer with health check support

### Required Secrets

Configure the following secrets in your CI/CD environment:

```bash
# GitHub Secrets
KUBE_CONFIG_STAGING      # Base64 encoded kubeconfig for staging
KUBE_CONFIG_PRODUCTION   # Base64 encoded kubeconfig for production
STAGING_URL              # Staging environment URL
PRODUCTION_URL           # Production environment URL
```

### Kubernetes Secrets

```bash
# Create namespace
kubectl create namespace certaintyai

# Create application secrets
kubectl create secret generic app-secrets -n certaintyai \
  --from-literal=jwt-secret="your-jwt-secret" \
  --from-literal=db-password="your-db-password" \
  --from-literal=redis-password="your-redis-password"

# Create TLS certificates
kubectl create secret tls certaintyai-tls -n certaintyai \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key
```

## CI/CD Pipeline Setup

### Pipeline Overview

The CI/CD pipeline consists of the following stages:

1. **Code Quality**: ESLint, TypeScript checks, security audit
2. **Testing**: Unit tests, integration tests, coverage reporting
3. **E2E Testing**: End-to-end verification workflows
4. **Performance Testing**: Response time and throughput validation
5. **Security Testing**: Penetration testing and vulnerability scanning
6. **Build**: Docker image creation and registry push
7. **Deploy**: Blue-green deployment to staging/production
8. **Validation**: Smoke tests and deployment verification

### Triggering Deployments

- **Staging**: Automatic deployment on push to `develop` branch
- **Production**: Automatic deployment on push to `main` branch
- **Manual**: Use GitHub Actions workflow dispatch

### Pipeline Configuration

The pipeline is defined in `.github/workflows/ci-cd.yml` and includes:

- Parallel test execution for faster feedback
- Comprehensive security scanning
- Artifact generation (SBOM, test reports)
- Blue-green deployment strategy
- Automatic rollback on failure

## Blue-Green Deployment

### Overview

Blue-green deployment ensures zero-downtime updates by maintaining two identical production environments:

- **Blue Environment**: Currently active production
- **Green Environment**: New version being deployed

### Deployment Process

1. **Preparation**: Determine current active environment
2. **Deploy**: Deploy new version to inactive environment
3. **Validate**: Run health checks and smoke tests
4. **Switch**: Update load balancer to route traffic to new environment
5. **Monitor**: Validate deployment success
6. **Cleanup**: Scale down old environment after validation period

### Manual Deployment

```bash
# Deploy using the blue-green script
./scripts/blue-green-deploy.sh v1.2.3

# Monitor deployment progress
kubectl get deployments -n certaintyai -w

# Check deployment status
kubectl rollout status deployment/api-gateway-green -n certaintyai
```

### Deployment Validation

The deployment process includes multiple validation steps:

#### Health Checks

- Application health endpoint (`/api/v1/health`)
- Database connectivity
- Redis connectivity
- External service availability

#### Performance Validation

- Response time < 2 seconds
- Success rate > 95%
- Error rate < 5%

#### Security Validation

- Required security headers present
- TLS configuration correct
- Authentication working properly

#### Functional Validation

- API endpoints responding correctly
- Authentication and authorization working
- Core verification functionality operational

## Monitoring and Validation

### Deployment Monitoring

The system includes comprehensive monitoring for deployments:

#### Prometheus Metrics

- Deployment status and replica counts
- HTTP request metrics (rate, duration, errors)
- Application-specific metrics (verification success rate)

#### Alerting Rules

- **DeploymentFailed**: Unavailable replicas detected
- **HighErrorRate**: Error rate > 10%
- **HighResponseTime**: 95th percentile > 2 seconds
- **PodCrashLooping**: Frequent pod restarts
- **LowSuccessRate**: Success rate < 95%

#### Continuous Validation

A deployment validator runs continuously to monitor:

- Health endpoint availability
- Response time performance
- Security header presence
- API functionality

### Smoke Tests

Automated smoke tests validate critical functionality:

```bash
# Run smoke tests against staging
npm run test:smoke -- https://staging.certaintyai.com

# Run smoke tests against production
npm run test:smoke -- https://certaintyai.com
```

Smoke tests cover:

- Health check endpoint
- API availability and authentication
- Basic verification workflow
- Error handling
- Performance benchmarks
- Security headers

## Rollback Procedures

### Automatic Rollback

The CI/CD pipeline includes automatic rollback triggers:

- Failed health checks during deployment
- Smoke test failures
- Performance degradation detection

### Manual Rollback

#### Blue-Green Rollback

```bash
# Quick rollback using blue-green script
./scripts/rollback.sh --type blue-green

# Manual traffic switch
kubectl patch service api-gateway-active -n certaintyai \
  -p '{"spec":{"selector":{"version":"blue"}}}'
```

#### Deployment History Rollback

```bash
# Rollback to previous revision
./scripts/rollback.sh --type history

# Manual rollback
kubectl rollout undo deployment/api-gateway -n certaintyai
```

### Rollback Validation

After rollback, the system automatically:

1. Validates health checks pass
2. Runs smoke tests
3. Monitors error rates
4. Sends notifications

## Troubleshooting

### Common Issues

#### Deployment Stuck in Pending

```bash
# Check pod status
kubectl describe pods -n certaintyai

# Check resource availability
kubectl top nodes
kubectl describe nodes
```

#### Health Checks Failing

```bash
# Check application logs
kubectl logs -f deployment/api-gateway -n certaintyai

# Check service endpoints
kubectl get endpoints -n certaintyai

# Test health endpoint directly
kubectl run debug --rm -i --restart=Never --image=curlimages/curl -- \
  curl -v http://api-gateway-active/api/v1/health
```

#### Performance Issues

```bash
# Check resource usage
kubectl top pods -n certaintyai

# Check HPA status
kubectl get hpa -n certaintyai

# Review metrics
kubectl port-forward svc/prometheus 9090:9090
# Open http://localhost:9090
```

#### Database Connection Issues

```bash
# Check database pod status
kubectl get pods -l app=postgres -n certaintyai

# Test database connectivity
kubectl run db-test --rm -i --restart=Never --image=postgres:15 -- \
  psql -h postgres -U postgres -d certaintyai -c "SELECT 1"
```

### Emergency Procedures

#### Complete Service Outage

1. Check cluster status: `kubectl cluster-info`
2. Verify namespace: `kubectl get all -n certaintyai`
3. Check ingress: `kubectl get ingress -n certaintyai`
4. Review recent deployments: `kubectl rollout history deployment/api-gateway -n certaintyai`
5. Rollback if necessary: `./scripts/rollback.sh`

#### Database Issues

1. Check database pod: `kubectl get pods -l app=postgres -n certaintyai`
2. Review logs: `kubectl logs -l app=postgres -n certaintyai`
3. Check persistent volumes: `kubectl get pv,pvc -n certaintyai`
4. Restore from backup if needed

#### Security Incident

1. Immediately scale down affected services
2. Review access logs and audit trails
3. Rotate secrets and certificates
4. Deploy security patches
5. Conduct post-incident review

### Monitoring Dashboard

Access the monitoring dashboard to view:

- Deployment status and history
- Application performance metrics
- Error rates and response times
- Resource utilization
- Alert status

```bash
# Port forward to Grafana
kubectl port-forward svc/grafana 3000:3000 -n monitoring

# Access dashboard at http://localhost:3000
```

### Support Contacts

- **DevOps Team**: devops@certaintyai.com
- **Security Team**: security@certaintyai.com
- **On-Call Engineer**: +1-555-0123

### Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Prometheus Monitoring](https://prometheus.io/docs/)
- [Blue-Green Deployment Best Practices](https://martinfowler.com/bliki/BlueGreenDeployment.html)
- [CertaintyAI Architecture Guide](./architecture.md)
- [Security Guidelines](./security.md)
