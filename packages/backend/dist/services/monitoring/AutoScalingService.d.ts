import { Logger } from '../../utils/Logger';
import { SystemMetrics, ApplicationMetrics } from './SystemHealthMonitor';
export interface ScalingRule {
    id: string;
    name: string;
    enabled: boolean;
    metric: string;
    scaleUpThreshold: number;
    scaleDownThreshold: number;
    scaleUpCooldown: number;
    scaleDownCooldown: number;
    minInstances: number;
    maxInstances: number;
    scaleUpBy: number;
    scaleDownBy: number;
}
export interface ScalingAction {
    id: string;
    timestamp: Date;
    type: 'scale_up' | 'scale_down';
    ruleId: string;
    reason: string;
    fromInstances: number;
    toInstances: number;
    metricValue: number;
    threshold: number;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    error?: string;
}
export interface ScalingTarget {
    id: string;
    name: string;
    type: 'kubernetes' | 'docker' | 'aws_ecs' | 'custom';
    config: Record<string, any>;
    currentInstances: number;
    desiredInstances: number;
}
export interface AutoScalingConfig {
    evaluationInterval: number;
    defaultCooldownPeriod: number;
    maxScalingActions: number;
    dryRunMode: boolean;
}
export declare class AutoScalingService {
    private logger;
    private config;
    private scalingRules;
    private scalingTargets;
    private scalingHistory;
    private lastScalingActions;
    private evaluationTimer?;
    constructor(logger: Logger, config: AutoScalingConfig);
    /**
     * Add or update a scaling rule
     */
    addScalingRule(rule: ScalingRule): void;
    /**
     * Remove a scaling rule
     */
    removeScalingRule(ruleId: string): boolean;
    /**
     * Add or update a scaling target
     */
    addScalingTarget(target: ScalingTarget): void;
    /**
     * Evaluate metrics and trigger scaling if needed
     */
    evaluateScaling(systemMetrics: SystemMetrics, appMetrics: ApplicationMetrics): Promise<void>;
    /**
     * Manually trigger scaling action
     */
    triggerManualScaling(targetId: string, action: 'scale_up' | 'scale_down', instances: number, reason: string): Promise<ScalingAction>;
    /**
     * Get scaling history
     */
    getScalingHistory(limit?: number): ScalingAction[];
    /**
     * Get scaling statistics
     */
    getScalingStatistics(period?: number): {
        totalActions: number;
        scaleUpActions: number;
        scaleDownActions: number;
        successfulActions: number;
        failedActions: number;
        averageInstanceChange: number;
    };
    /**
     * Get current scaling targets status
     */
    getScalingTargetsStatus(): Array<{
        target: ScalingTarget;
        lastScalingAction?: ScalingAction;
        recommendedAction?: 'scale_up' | 'scale_down' | 'none';
    }>;
    /**
     * Shutdown auto-scaling service
     */
    shutdown(): void;
    private startEvaluation;
    private evaluateRule;
    private considerScaleUp;
    private considerScaleDown;
    private executeScalingAction;
    private performScaling;
    private scaleKubernetes;
    private scaleDocker;
    private scaleECS;
    private scaleCustom;
    private extractMetricValue;
    private getRecommendedAction;
    private cleanupOldHistory;
    private generateActionId;
}
//# sourceMappingURL=AutoScalingService.d.ts.map