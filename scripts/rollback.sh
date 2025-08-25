#!/bin/bash

set -e

# Rollback Script for CertaintyAI
# This script provides quick rollback capabilities for failed deployments

# Configuration
NAMESPACE="certaintyai"
APP_NAME="api-gateway"
ROLLBACK_TIMEOUT=300

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

# Get current deployment status
get_deployment_status() {
    log_info "Getting current deployment status..."
    
    CURRENT_ENV=$(kubectl get service ${APP_NAME}-active -n $NAMESPACE -o jsonpath='{.spec.selector.version}' 2>/dev/null || echo "unknown")
    
    if [ "$CURRENT_ENV" = "blue" ]; then
        PREVIOUS_ENV="green"
    elif [ "$CURRENT_ENV" = "green" ]; then
        PREVIOUS_ENV="blue"
    else
        log_error "Cannot determine current environment"
        exit 1
    fi
    
    log_info "Current active environment: $CURRENT_ENV"
    log_info "Previous environment: $PREVIOUS_ENV"
    
    # Check if previous environment exists and has replicas
    PREVIOUS_REPLICAS=$(kubectl get deployment ${APP_NAME}-${PREVIOUS_ENV} -n $NAMESPACE -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
    
    if [ "$PREVIOUS_REPLICAS" = "0" ]; then
        log_warning "Previous environment ($PREVIOUS_ENV) has no replicas. Checking deployment history..."
        check_deployment_history
    fi
}

# Check deployment history for rollback options
check_deployment_history() {
    log_info "Checking deployment history..."
    
    # Get rollout history
    HISTORY=$(kubectl rollout history deployment/${APP_NAME}-${CURRENT_ENV} -n $NAMESPACE)
    
    if [ -z "$HISTORY" ]; then
        log_error "No deployment history found"
        exit 1
    fi
    
    log_info "Available rollback revisions:"
    echo "$HISTORY"
    
    # Get the previous revision
    PREVIOUS_REVISION=$(kubectl rollout history deployment/${APP_NAME}-${CURRENT_ENV} -n $NAMESPACE | tail -2 | head -1 | awk '{print $1}')
    
    if [ -z "$PREVIOUS_REVISION" ]; then
        log_error "No previous revision found for rollback"
        exit 1
    fi
    
    log_info "Will rollback to revision: $PREVIOUS_REVISION"
}

# Perform rollback using deployment history
rollback_using_history() {
    log_info "Performing rollback using deployment history..."
    
    # Rollback to previous revision
    kubectl rollout undo deployment/${APP_NAME}-${CURRENT_ENV} -n $NAMESPACE --to-revision=$PREVIOUS_REVISION
    
    # Wait for rollback to complete
    log_info "Waiting for rollback to complete..."
    if ! kubectl rollout status deployment/${APP_NAME}-${CURRENT_ENV} -n $NAMESPACE --timeout=${ROLLBACK_TIMEOUT}s; then
        log_error "Rollback failed"
        exit 1
    fi
    
    log_success "Rollback completed using deployment history"
}

# Perform blue-green rollback
rollback_blue_green() {
    log_info "Performing blue-green rollback..."
    
    # Scale up previous environment
    log_info "Scaling up $PREVIOUS_ENV environment..."
    kubectl patch deployment ${APP_NAME}-${PREVIOUS_ENV} -n $NAMESPACE -p '{"spec":{"replicas":3}}'
    
    # Wait for previous environment to be ready
    log_info "Waiting for $PREVIOUS_ENV environment to be ready..."
    if ! kubectl rollout status deployment/${APP_NAME}-${PREVIOUS_ENV} -n $NAMESPACE --timeout=${ROLLBACK_TIMEOUT}s; then
        log_error "Failed to scale up $PREVIOUS_ENV environment"
        exit 1
    fi
    
    # Health check on previous environment
    health_check_previous_environment
    
    # Switch traffic back to previous environment
    log_info "Switching traffic back to $PREVIOUS_ENV environment..."
    kubectl patch service ${APP_NAME}-active -n $NAMESPACE -p "{\"spec\":{\"selector\":{\"version\":\"${PREVIOUS_ENV}\"}}}"
    
    # Update HPA target
    kubectl patch hpa ${APP_NAME}-hpa -n $NAMESPACE -p "{\"spec\":{\"scaleTargetRef\":{\"name\":\"${APP_NAME}-${PREVIOUS_ENV}\"}}}"
    
    # Scale down current (failed) environment
    log_info "Scaling down $CURRENT_ENV environment..."
    kubectl patch deployment ${APP_NAME}-${CURRENT_ENV} -n $NAMESPACE -p '{"spec":{"replicas":0}}'
    
    log_success "Blue-green rollback completed"
}

# Health check for previous environment
health_check_previous_environment() {
    log_info "Performing health check on $PREVIOUS_ENV environment..."
    
    # Get service endpoint
    SERVICE_IP=$(kubectl get service ${APP_NAME}-${PREVIOUS_ENV} -n $NAMESPACE -o jsonpath='{.spec.clusterIP}')
    
    # Wait for health check to pass
    HEALTH_CHECK_PASSED=false
    for i in $(seq 1 30); do
        if kubectl run health-check-rollback --rm -i --restart=Never --image=curlimages/curl -- \
           curl -f "http://${SERVICE_IP}/api/v1/health" &> /dev/null; then
            HEALTH_CHECK_PASSED=true
            break
        fi
        log_info "Health check attempt $i failed, retrying in 10 seconds..."
        sleep 10
    done
    
    if [ "$HEALTH_CHECK_PASSED" = false ]; then
        log_error "Health check failed for $PREVIOUS_ENV environment"
        exit 1
    fi
    
    log_success "Health check passed for $PREVIOUS_ENV environment"
}

# Validate rollback
validate_rollback() {
    log_info "Validating rollback..."
    
    # Check if active service is pointing to previous environment
    ACTIVE_VERSION=$(kubectl get service ${APP_NAME}-active -n $NAMESPACE -o jsonpath='{.spec.selector.version}')
    
    if [ "$ACTIVE_VERSION" != "$PREVIOUS_ENV" ]; then
        log_error "Active service is not pointing to $PREVIOUS_ENV environment"
        exit 1
    fi
    
    # Check if previous environment has healthy pods
    READY_REPLICAS=$(kubectl get deployment ${APP_NAME}-${PREVIOUS_ENV} -n $NAMESPACE -o jsonpath='{.status.readyReplicas}')
    DESIRED_REPLICAS=$(kubectl get deployment ${APP_NAME}-${PREVIOUS_ENV} -n $NAMESPACE -o jsonpath='{.spec.replicas}')
    
    if [ "$READY_REPLICAS" != "$DESIRED_REPLICAS" ]; then
        log_error "Not all replicas are ready in $PREVIOUS_ENV environment"
        exit 1
    fi
    
    log_success "Rollback validation passed"
}

# Send rollback notification
send_rollback_notification() {
    log_info "Sending rollback notification..."
    
    cat << EOF
=== ROLLBACK COMPLETED ===
Rolled back to: $PREVIOUS_ENV
Previous active: $CURRENT_ENV
Timestamp: $(date)
Namespace: $NAMESPACE
Reason: Manual rollback requested
=========================
EOF
    
    log_success "Rollback notification sent"
}

# Show rollback options
show_rollback_options() {
    echo "Available rollback options:"
    echo "1. Blue-green rollback (switch to previous environment)"
    echo "2. Deployment history rollback (rollback to previous revision)"
    echo "3. Cancel"
    
    read -p "Select rollback option (1-3): " choice
    
    case $choice in
        1)
            ROLLBACK_TYPE="blue-green"
            ;;
        2)
            ROLLBACK_TYPE="history"
            ;;
        3)
            log_info "Rollback cancelled"
            exit 0
            ;;
        *)
            log_error "Invalid option"
            exit 1
            ;;
    esac
}

# Main rollback function
main() {
    log_warning "Starting rollback process for CertaintyAI"
    
    # Confirm rollback
    read -p "Are you sure you want to rollback? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        log_info "Rollback cancelled"
        exit 0
    fi
    
    check_prerequisites
    get_deployment_status
    
    # If no rollback type specified, show options
    if [ -z "$ROLLBACK_TYPE" ]; then
        show_rollback_options
    fi
    
    case $ROLLBACK_TYPE in
        "blue-green")
            rollback_blue_green
            ;;
        "history")
            rollback_using_history
            ;;
        *)
            log_error "Invalid rollback type"
            exit 1
            ;;
    esac
    
    validate_rollback
    send_rollback_notification
    
    log_success "Rollback completed successfully!"
    log_info "Application is now running on $PREVIOUS_ENV environment"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --type)
            ROLLBACK_TYPE="$2"
            shift 2
            ;;
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --app)
            APP_NAME="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [--type blue-green|history] [--namespace NAMESPACE] [--app APP_NAME]"
            echo ""
            echo "Options:"
            echo "  --type        Rollback type (blue-green or history)"
            echo "  --namespace   Kubernetes namespace (default: certaintyai)"
            echo "  --app         Application name (default: api-gateway)"
            echo "  -h, --help    Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main "$@"