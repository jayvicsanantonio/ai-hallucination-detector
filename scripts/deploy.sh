#!/bin/bash

# CertaintyAI Deployment Script
# This script handles deployment to different environments

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT=${1:-development}
NAMESPACE="certaintyai"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "docker is not installed or not in PATH"
        exit 1
    fi
    
    # Check if we can connect to Kubernetes cluster
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Build Docker image
build_image() {
    log_info "Building Docker image..."
    
    cd "$PROJECT_ROOT"
    
    # Build the image
    docker build -t certaintyai:latest .
    
    # Tag for environment
    docker tag certaintyai:latest certaintyai:$ENVIRONMENT
    
    log_success "Docker image built successfully"
}

# Deploy to Kubernetes
deploy_kubernetes() {
    log_info "Deploying to Kubernetes environment: $ENVIRONMENT"
    
    cd "$PROJECT_ROOT"
    
    # Create namespace if it doesn't exist
    kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply configurations in order
    log_info "Applying ConfigMaps and Secrets..."
    kubectl apply -f k8s/configmap.yaml
    kubectl apply -f k8s/secrets.yaml
    
    log_info "Deploying infrastructure services..."
    kubectl apply -f k8s/postgres-deployment.yaml
    kubectl apply -f k8s/redis-deployment.yaml
    
    # Wait for infrastructure to be ready
    log_info "Waiting for infrastructure services to be ready..."
    kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=300s
    kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=300s
    
    log_info "Deploying application services..."
    kubectl apply -f k8s/api-gateway-deployment.yaml
    kubectl apply -f k8s/verification-engine-deployment.yaml
    kubectl apply -f k8s/content-processor-deployment.yaml
    
    log_info "Applying scaling and monitoring configurations..."
    kubectl apply -f k8s/monitoring.yaml
    kubectl apply -f k8s/vertical-pod-autoscaler.yaml
    kubectl apply -f k8s/pod-disruption-budget.yaml
    
    log_info "Applying ingress configuration..."
    kubectl apply -f k8s/ingress.yaml
    
    # Wait for application services to be ready
    log_info "Waiting for application services to be ready..."
    kubectl wait --for=condition=ready pod -l app=api-gateway -n $NAMESPACE --timeout=300s
    kubectl wait --for=condition=ready pod -l app=verification-engine -n $NAMESPACE --timeout=300s
    kubectl wait --for=condition=ready pod -l app=content-processor -n $NAMESPACE --timeout=300s
    
    log_success "Kubernetes deployment completed"
}

# Deploy with Docker Compose (for development)
deploy_compose() {
    log_info "Deploying with Docker Compose for development..."
    
    cd "$PROJECT_ROOT"
    
    # Build and start services
    docker-compose up -d --build
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 30
    
    # Check service health
    if docker-compose ps | grep -q "Up (healthy)"; then
        log_success "Docker Compose deployment completed"
    else
        log_warning "Some services may not be fully healthy yet"
        docker-compose ps
    fi
}

# Run health checks
health_check() {
    log_info "Running health checks..."
    
    if [ "$ENVIRONMENT" = "development" ]; then
        # Docker Compose health check
        HEALTH_URL="http://localhost:3000/health"
    else
        # Kubernetes health check
        HEALTH_URL="http://$(kubectl get ingress certaintyai-ingress -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')/health"
    fi
    
    # Wait for service to be available
    for i in {1..30}; do
        if curl -f "$HEALTH_URL" &> /dev/null; then
            log_success "Health check passed"
            return 0
        fi
        log_info "Waiting for service to be available... (attempt $i/30)"
        sleep 10
    done
    
    log_error "Health check failed after 5 minutes"
    return 1
}

# Run load tests
run_load_tests() {
    log_info "Running load tests..."
    
    if ! command -v k6 &> /dev/null; then
        log_warning "k6 is not installed, skipping load tests"
        return 0
    fi
    
    cd "$PROJECT_ROOT"
    
    # Set base URL based on environment
    if [ "$ENVIRONMENT" = "development" ]; then
        export BASE_URL="http://localhost:3000"
    else
        export BASE_URL="http://$(kubectl get ingress certaintyai-ingress -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')"
    fi
    
    # Run basic load test
    k6 run tests/load/load-test-config.js
    
    log_success "Load tests completed"
}

# Rollback deployment
rollback() {
    log_info "Rolling back deployment..."
    
    if [ "$ENVIRONMENT" = "development" ]; then
        docker-compose down
    else
        # Rollback Kubernetes deployments
        kubectl rollout undo deployment/api-gateway -n $NAMESPACE
        kubectl rollout undo deployment/verification-engine -n $NAMESPACE
        kubectl rollout undo deployment/content-processor -n $NAMESPACE
        
        # Wait for rollback to complete
        kubectl rollout status deployment/api-gateway -n $NAMESPACE
        kubectl rollout status deployment/verification-engine -n $NAMESPACE
        kubectl rollout status deployment/content-processor -n $NAMESPACE
    fi
    
    log_success "Rollback completed"
}

# Show deployment status
show_status() {
    log_info "Deployment status for environment: $ENVIRONMENT"
    
    if [ "$ENVIRONMENT" = "development" ]; then
        docker-compose ps
    else
        echo "Namespace: $NAMESPACE"
        kubectl get pods -n $NAMESPACE
        echo ""
        kubectl get services -n $NAMESPACE
        echo ""
        kubectl get ingress -n $NAMESPACE
        echo ""
        kubectl top pods -n $NAMESPACE 2>/dev/null || log_warning "Metrics server not available"
    fi
}

# Main deployment function
main() {
    case "${2:-deploy}" in
        "deploy")
            check_prerequisites
            build_image
            
            if [ "$ENVIRONMENT" = "development" ]; then
                deploy_compose
            else
                deploy_kubernetes
            fi
            
            health_check
            ;;
        "test")
            run_load_tests
            ;;
        "rollback")
            rollback
            ;;
        "status")
            show_status
            ;;
        *)
            echo "Usage: $0 <environment> [deploy|test|rollback|status]"
            echo "Environments: development, staging, production"
            echo "Commands:"
            echo "  deploy   - Deploy the application (default)"
            echo "  test     - Run load tests"
            echo "  rollback - Rollback to previous version"
            echo "  status   - Show deployment status"
            exit 1
            ;;
    esac
}

# Validate environment
case "$ENVIRONMENT" in
    "development"|"staging"|"production")
        ;;
    *)
        log_error "Invalid environment: $ENVIRONMENT"
        echo "Valid environments: development, staging, production"
        exit 1
        ;;
esac

# Run main function
main "$@"