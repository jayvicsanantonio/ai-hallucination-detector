import { Domain } from '../../models/core/ContentTypes';
export interface DeploymentConfig {
    modelVersionId: string;
    environment: 'staging' | 'production';
    rolloutStrategy: 'immediate' | 'gradual' | 'canary';
    rolloutPercentage?: number;
    healthCheckEndpoint?: string;
    rollbackThreshold?: {
        accuracyDrop: number;
        errorRateIncrease: number;
    };
}
export interface DeploymentStatus {
    id: string;
    modelVersionId: string;
    environment: string;
    status: 'pending' | 'deploying' | 'deployed' | 'failed' | 'rolled_back';
    rolloutPercentage: number;
    startedAt: Date;
    completedAt?: Date;
    error?: string;
    healthChecks: {
        timestamp: Date;
        status: 'healthy' | 'unhealthy';
        metrics: Record<string, number>;
    }[];
}
export interface RollbackPlan {
    currentVersionId: string;
    targetVersionId: string;
    reason: string;
    estimatedDowntime: number;
    rollbackSteps: string[];
}
export declare class ModelVersionManager {
    private logger;
    private deployments;
    private activeVersions;
    constructor();
    /**
     * Deploy a model version to an environment
     */
    deployModel(config: DeploymentConfig): Promise<DeploymentStatus>;
    /**
     * Get deployment status
     */
    getDeploymentStatus(deploymentId: string): Promise<DeploymentStatus | null>;
    /**
     * List all deployments
     */
    listDeployments(options?: {
        environment?: string;
        status?: string;
        limit?: number;
    }): Promise<DeploymentStatus[]>;
    /**
     * Rollback to a previous model version
     */
    rollbackModel(plan: RollbackPlan): Promise<DeploymentStatus>;
    /**
     * Create rollback plan
     */
    createRollbackPlan(currentVersionId: string, targetVersionId: string, reason: string): Promise<RollbackPlan>;
    /**
     * Get active model version for a domain
     */
    getActiveVersion(domain: Domain): Promise<string | null>;
    /**
     * Set active model version for a domain
     */
    setActiveVersion(domain: Domain, versionId: string): Promise<void>;
    /**
     * Perform health check on a deployed model
     */
    performHealthCheck(deploymentId: string): Promise<{
        status: 'healthy' | 'unhealthy';
        metrics: Record<string, number>;
    }>;
    /**
     * Monitor deployment and auto-rollback if needed
     */
    monitorDeployment(deploymentId: string, rollbackThreshold?: {
        accuracyDrop: number;
        errorRateIncrease: number;
    }): Promise<void>;
    /**
     * Execute the deployment process
     */
    private executeDeployment;
    /**
     * Validate model version before deployment
     */
    private validateModelVersion;
    /**
     * Update load balancer configuration
     */
    private updateLoadBalancer;
    /**
     * Perform initial health check after deployment
     */
    private performInitialHealthCheck;
    /**
     * Execute gradual rollout
     */
    private executeGradualRollout;
    /**
     * Determine if rollback should be triggered
     */
    private shouldTriggerRollback;
}
//# sourceMappingURL=ModelVersionManager.d.ts.map