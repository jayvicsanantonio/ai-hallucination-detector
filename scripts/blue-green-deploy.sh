#!/bin/bash

set -e

# Blue-Green Deployment Script for CertaintyAI
# This script implements zero-downtime deployment using Kubernetes

# Configuration
NAMESPACE="certaintyai"
APP_NAME="api-gateway"
IMAGE_TAG=${1:-latest}
HEALTH_CHECK_TIMEOUT=300
SMOKE_TEST_TIMEOUT=120

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
    
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    if ! kubectl get namespace $NAMESPACE &> /dev/null; then
        log_error "Namespace $NAMESPACE does not exist"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Determine current and next environments
determine_environments() {
    log_info "Determining current and next environments..."
    
    CURRENT_ENV=$(kubectl get service ${APP_NAME}-active -n $NAMESPACE -o jsonpath='{.spec.selector.version}' 2>/dev/null || echo "blue")
    
    if [ "$CURRENT_ENV" = "blue" ]; then
        NEXT_ENV="green"
    else
        NEXT_ENV="blue"
    fi
    
    log_info "Current environment: $CURRENT_ENV"
    log_info "Next environment: $NEXT_ENV"
}

# Deploy to next environment
deploy_next_environment() {
    log_info "Deploying to $NEXT_ENV environment..."
    
    # Update deployment manifest
    sed "s|IMAGE_TAG_PLACEHOLDER|${IMAGE_TAG}|g" k8s/blue-green-deployment.yaml > /tmp/deployment.yaml
    sed -i "s|version: blue|version: ${NEXT_ENV}|g" /tmp/deployment.yaml
    
    # Scale up next environment
    kubectl patch deployment ${APP_NAME}-${NEXT_ENV} -n $NAMESPACE -p '{"spec":{"replicas":3}}'
    
    # Apply updated deployment
    kubectl apply -f /tmp/deployment.yaml
    
    log_info "Waiting for $NEXT_ENV deployment to be ready..."
    if ! kubectl rollout status deployment/${APP_NAME}-${NEXT_ENV} -n $NAMESPACE --timeout=${HEALTH_CHECK_TIMEOUT}s; then
        log_error "Deployment to $NEXT_ENV environment failed"
        rollback_deployment
        exit 1
    fi
    
    log_success "$NEXT_ENV environment deployed successfully"
}

# Health check for new deployment
health_check() {
    log_info "Performing health check on $NEXT_ENV environment..."
    
    # Get service endpoint
    SERVICE_IP=$(kubectl get service ${APP_NAME}-${NEXT_ENV} -n $NAMESPACE -o jsonpath='{.spec.clusterIP}')
    
    # Wait for health check to pass
    HEALTH_CHECK_PASSED=false
    for i in $(seq 1 30); do
        if kubectl run health-check-${NEXT_ENV} --rm -i --restart=Never --image=curlimages/curl -- \
           curl -f "http://${SERVICE_IP}/api/v1/health" &> /dev/null; then
            HEALTH_CHECK_PASSED=true
            break
        fi
        log_info "Health check attempt $i failed, retrying in 10 seconds..."
        sleep 10
    done
    
    if [ "$HEALTH_CHECK_PASSED" = false ]; then
        log_error "Health check failed for $NEXT_ENV environment"
        rollback_deployment
        exit 1
    fi
    
    log_success "Health check passed for $NEXT_ENV environment"
}

# Run smoke tests
run_smoke_tests() {
    log_info "Running smoke tests on $NEXT_ENV environment..."
    
    # Create a test pod to run smoke tests
    kubectl run smoke-test-${NEXT_ENV} --rm -i --restart=Never --image=node:18-alpine -n $NAMESPACE -- \
        sh -c "
            apk add --no-cache curl
            SERVICE_URL=http://${APP_NAME}-${NEXT_ENV}/api/v1
            
            # Test health endpoint
            curl -f \$SERVICE_URL/health || exit 1
            
            # Test basic API functionality
            curl -f -X POST \$SERVICE_URL/verify \
                -H 'Content-Type: application/json' \
                -H 'Authorization: Bearer test-token' \
                -d '{\"content\":\"test\",\"contentType\":\"text\",\"domain\":\"financial\"}' || exit 1
            
            echo 'Smoke tests passed'
        "
    
    if [ $? -ne 0 ]; then
        log_error "Smoke tests failed for $NEXT_ENV environment"
        rollback_deployment
        exit 1
    fi
    
    log_success "Smoke tests passed for $NEXT_ENV environment"
}

# Switch traffic to new environment
switch_traffic() {
    log_info "Switching traffic to $NEXT_ENV environment..."
    
    # Update active service selector
    kubectl patch service ${APP_NAME}-active -n $NAMESPACE -p "{\"spec\":{\"selector\":{\"version\":\"${NEXT_ENV}\"}}}"
    
    # Update HPA target
    kubectl patch hpa ${APP_NAME}-hpa -n $NAMESPACE -p "{\"spec\":{\"scaleTargetRef\":{\"name\":\"${APP_NAME}-${NEXT_ENV}\"}}}"
    
    log_success "Traffic switched to $NEXT_ENV environment"
}

# Cleanup old environment
cleanup_old_environment() {
    log_info "Cleaning up $CURRENT_ENV environment..."
    
    # Wait a bit before cleanup to ensure traffic has switched
    log_info "Waiting 60 seconds before cleanup..."
    sleep 60
    
    # Scale down old environment
    kubectl patch deployment ${APP_NAME}-${CURRENT_ENV} -n $NAMESPACE -p '{"spec":{"replicas":0}}'
    
    log_success "Cleanup completed for $CURRENT_ENV environment"
}

# Rollback deployment
rollback_deployment() {
    log_warning "Rolling back deployment..."
    
    # Scale down failed environment
    kubectl patch deployment ${APP_NAME}-${NEXT_ENV} -n $NAMESPACE -p '{"spec":{"replicas":0}}'
    
    # Ensure current environment is active
    kubectl patch service ${APP_NAME}-active -n $NAMESPACE -p "{\"spec\":{\"selector\":{\"version\":\"${CURRENT_ENV}\"}}}"
    
    log_warning "Rollback completed"
}

# Validate deployment
validate_deployment() {
    log_info "Validating deployment..."
    
    # Check if active service is pointing to new environment
    ACTIVE_VERSION=$(kubectl get service ${APP_NAME}-active -n $NAMESPACE -o jsonpath='{.spec.selector.version}')
    
    if [ "$ACTIVE_VERSION" != "$NEXT_ENV" ]; then
        log_error "Active service is not pointing to $NEXT_ENV environment"
        exit 1
    fi
    
    # Check if new environment has healthy pods
    READY_REPLICAS=$(kubectl get deployment ${APP_NAME}-${NEXT_ENV} -n $NAMESPACE -o jsonpath='{.status.readyReplicas}')
    DESIRED_REPLICAS=$(kubectl get deployment ${APP_NAME}-${NEXT_ENV} -n $NAMESPACE -o jsonpath='{.spec.replicas}')
    
    if [ "$READY_REPLICAS" != "$DESIRED_REPLICAS" ]; then
        log_error "Not all replicas are ready in $NEXT_ENV environment"
        exit 1
    fi
    
    log_success "Deployment validation passed"
}

# Send deployment notification
send_notification() {
    log_info "Sending deployment notification..."
    
    # This would integrate with your notification system (email, etc.)
    # For now, just log the deployment details
    
    cat << EOF
=== DEPLOYMENT COMPLETED ===
Environment: $NEXT_ENV
Image Tag: $IMAGE_TAG
Timestamp: $(date)
Namespace: $NAMESPACE
Previous Environment: $CURRENT_ENV
===========================
EOF
    
    log_success "Deployment notification sent"
}

# Main deployment function
main() {
    log_info "Starting blue-green deployment for CertaintyAI"
    log_info "Image tag: $IMAGE_TAG"
    
    check_prerequisites
    determine_environments
    deploy_next_environment
    health_check
    run_smoke_tests
    switch_traffic
    validate_deployment
    cleanup_old_environment
    send_notification
    
    log_success "Blue-green deployment completed successfully!"
    log_info "Application is now running on $NEXT_ENV environment"
}

# Trap errors and rollback
trap 'log_error "Deployment failed. Rolling back..."; rollback_deployment; exit 1' ERR

# Run main function
main "$@"