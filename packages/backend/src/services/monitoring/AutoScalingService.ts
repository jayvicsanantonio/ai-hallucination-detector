import { Logger } from '../../utils/Logger';
import {
  SystemMetrics,
  ApplicationMetrics,
} from './SystemHealthMonitor';

export interface ScalingRule {
  id: string;
  name: string;
  enabled: boolean;
  metric: string;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  scaleUpCooldown: number; // milliseconds
  scaleDownCooldown: number; // milliseconds
  minInstances: number;
  maxInstances: number;
  scaleUpBy: number; // number of instances
  scaleDownBy: number; // number of instances
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
  evaluationInterval: number; // milliseconds
  defaultCooldownPeriod: number; // milliseconds
  maxScalingActions: number; // per evaluation period
  dryRunMode: boolean;
}

export class AutoScalingService {
  private logger: Logger;
  private config: AutoScalingConfig;
  private scalingRules: Map<string, ScalingRule> = new Map();
  private scalingTargets: Map<string, ScalingTarget> = new Map();
  private scalingHistory: ScalingAction[] = [];
  private lastScalingActions: Map<string, Date> = new Map();
  private evaluationTimer?: NodeJS.Timeout;

  constructor(logger: Logger, config: AutoScalingConfig) {
    this.logger = logger;
    this.config = config;
    this.startEvaluation();
  }

  /**
   * Add or update a scaling rule
   */
  addScalingRule(rule: ScalingRule): void {
    this.scalingRules.set(rule.id, rule);
    this.logger.info('Scaling rule added', {
      ruleId: rule.id,
      name: rule.name,
      metric: rule.metric,
    });
  }

  /**
   * Remove a scaling rule
   */
  removeScalingRule(ruleId: string): boolean {
    const removed = this.scalingRules.delete(ruleId);
    if (removed) {
      this.logger.info('Scaling rule removed', { ruleId });
    }
    return removed;
  }

  /**
   * Add or update a scaling target
   */
  addScalingTarget(target: ScalingTarget): void {
    this.scalingTargets.set(target.id, target);
    this.logger.info('Scaling target added', {
      targetId: target.id,
      name: target.name,
      type: target.type,
    });
  }

  /**
   * Evaluate metrics and trigger scaling if needed
   */
  async evaluateScaling(
    systemMetrics: SystemMetrics,
    appMetrics: ApplicationMetrics
  ): Promise<void> {
    for (const rule of this.scalingRules.values()) {
      if (!rule.enabled) continue;

      try {
        await this.evaluateRule(rule, systemMetrics, appMetrics);
      } catch (error) {
        this.logger.error('Failed to evaluate scaling rule', {
          error,
          ruleId: rule.id,
        });
      }
    }
  }

  /**
   * Manually trigger scaling action
   */
  async triggerManualScaling(
    targetId: string,
    action: 'scale_up' | 'scale_down',
    instances: number,
    reason: string
  ): Promise<ScalingAction> {
    const target = this.scalingTargets.get(targetId);
    if (!target) {
      throw new Error(`Scaling target not found: ${targetId}`);
    }

    const newInstanceCount =
      action === 'scale_up'
        ? target.currentInstances + instances
        : target.currentInstances - instances;

    const scalingAction: ScalingAction = {
      id: this.generateActionId(),
      timestamp: new Date(),
      type: action,
      ruleId: 'manual',
      reason,
      fromInstances: target.currentInstances,
      toInstances: newInstanceCount,
      metricValue: 0,
      threshold: 0,
      status: 'pending',
    };

    await this.executeScalingAction(scalingAction, target);
    return scalingAction;
  }

  /**
   * Get scaling history
   */
  getScalingHistory(limit?: number): ScalingAction[] {
    const history = [...this.scalingHistory].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );

    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Get scaling statistics
   */
  getScalingStatistics(period: number = 24 * 60 * 60 * 1000): {
    totalActions: number;
    scaleUpActions: number;
    scaleDownActions: number;
    successfulActions: number;
    failedActions: number;
    averageInstanceChange: number;
  } {
    const cutoffTime = new Date(Date.now() - period);
    const recentActions = this.scalingHistory.filter(
      (a) => a.timestamp > cutoffTime
    );

    const scaleUpActions = recentActions.filter(
      (a) => a.type === 'scale_up'
    ).length;
    const scaleDownActions = recentActions.filter(
      (a) => a.type === 'scale_down'
    ).length;
    const successfulActions = recentActions.filter(
      (a) => a.status === 'completed'
    ).length;
    const failedActions = recentActions.filter(
      (a) => a.status === 'failed'
    ).length;

    const instanceChanges = recentActions.map((a) =>
      Math.abs(a.toInstances - a.fromInstances)
    );
    const averageInstanceChange =
      instanceChanges.length > 0
        ? instanceChanges.reduce((sum, change) => sum + change, 0) /
          instanceChanges.length
        : 0;

    return {
      totalActions: recentActions.length,
      scaleUpActions,
      scaleDownActions,
      successfulActions,
      failedActions,
      averageInstanceChange:
        Math.round(averageInstanceChange * 100) / 100,
    };
  }

  /**
   * Get current scaling targets status
   */
  getScalingTargetsStatus(): Array<{
    target: ScalingTarget;
    lastScalingAction?: ScalingAction;
    recommendedAction?: 'scale_up' | 'scale_down' | 'none';
  }> {
    return Array.from(this.scalingTargets.values()).map((target) => {
      const lastAction = this.scalingHistory
        .filter((a) => a.ruleId !== 'manual') // Exclude manual actions for recommendations
        .sort(
          (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
        )[0];

      return {
        target,
        lastScalingAction: lastAction,
        recommendedAction: this.getRecommendedAction(target),
      };
    });
  }

  /**
   * Shutdown auto-scaling service
   */
  shutdown(): void {
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
    }
  }

  private startEvaluation(): void {
    this.evaluationTimer = setInterval(async () => {
      // Cleanup old scaling history
      this.cleanupOldHistory();
    }, this.config.evaluationInterval);
  }

  private async evaluateRule(
    rule: ScalingRule,
    systemMetrics: SystemMetrics,
    appMetrics: ApplicationMetrics
  ): Promise<void> {
    const metricValue = this.extractMetricValue(
      rule.metric,
      systemMetrics,
      appMetrics
    );

    if (metricValue === null || metricValue === undefined) {
      return;
    }

    // Check if we should scale up
    if (metricValue > rule.scaleUpThreshold) {
      await this.considerScaleUp(rule, metricValue);
    }
    // Check if we should scale down
    else if (metricValue < rule.scaleDownThreshold) {
      await this.considerScaleDown(rule, metricValue);
    }
  }

  private async considerScaleUp(
    rule: ScalingRule,
    metricValue: number
  ): Promise<void> {
    // Check cooldown period
    const lastActionTime = this.lastScalingActions.get(
      `${rule.id}_scale_up`
    );
    if (
      lastActionTime &&
      Date.now() - lastActionTime.getTime() < rule.scaleUpCooldown
    ) {
      return;
    }

    // Find applicable targets (simplified - in real implementation would be more sophisticated)
    const targets = Array.from(this.scalingTargets.values());

    for (const target of targets) {
      if (target.currentInstances >= rule.maxInstances) {
        continue;
      }

      const newInstanceCount = Math.min(
        target.currentInstances + rule.scaleUpBy,
        rule.maxInstances
      );

      const scalingAction: ScalingAction = {
        id: this.generateActionId(),
        timestamp: new Date(),
        type: 'scale_up',
        ruleId: rule.id,
        reason: `${rule.metric} (${metricValue}) exceeded scale-up threshold (${rule.scaleUpThreshold})`,
        fromInstances: target.currentInstances,
        toInstances: newInstanceCount,
        metricValue,
        threshold: rule.scaleUpThreshold,
        status: 'pending',
      };

      await this.executeScalingAction(scalingAction, target);
      this.lastScalingActions.set(`${rule.id}_scale_up`, new Date());
      break; // Only scale one target per evaluation
    }
  }

  private async considerScaleDown(
    rule: ScalingRule,
    metricValue: number
  ): Promise<void> {
    // Check cooldown period
    const lastActionTime = this.lastScalingActions.get(
      `${rule.id}_scale_down`
    );
    if (
      lastActionTime &&
      Date.now() - lastActionTime.getTime() < rule.scaleDownCooldown
    ) {
      return;
    }

    // Find applicable targets
    const targets = Array.from(this.scalingTargets.values());

    for (const target of targets) {
      if (target.currentInstances <= rule.minInstances) {
        continue;
      }

      const newInstanceCount = Math.max(
        target.currentInstances - rule.scaleDownBy,
        rule.minInstances
      );

      const scalingAction: ScalingAction = {
        id: this.generateActionId(),
        timestamp: new Date(),
        type: 'scale_down',
        ruleId: rule.id,
        reason: `${rule.metric} (${metricValue}) below scale-down threshold (${rule.scaleDownThreshold})`,
        fromInstances: target.currentInstances,
        toInstances: newInstanceCount,
        metricValue,
        threshold: rule.scaleDownThreshold,
        status: 'pending',
      };

      await this.executeScalingAction(scalingAction, target);
      this.lastScalingActions.set(
        `${rule.id}_scale_down`,
        new Date()
      );
      break; // Only scale one target per evaluation
    }
  }

  private async executeScalingAction(
    action: ScalingAction,
    target: ScalingTarget
  ): Promise<void> {
    this.scalingHistory.push(action);

    this.logger.info('Executing scaling action', {
      actionId: action.id,
      type: action.type,
      targetId: target.id,
      fromInstances: action.fromInstances,
      toInstances: action.toInstances,
      reason: action.reason,
    });

    if (this.config.dryRunMode) {
      action.status = 'completed';
      this.logger.info('Scaling action completed (dry run)', {
        actionId: action.id,
      });
      return;
    }

    try {
      action.status = 'in_progress';

      // Execute the actual scaling (simplified - would integrate with actual orchestration systems)
      await this.performScaling(target, action.toInstances);

      target.currentInstances = action.toInstances;
      target.desiredInstances = action.toInstances;
      action.status = 'completed';

      this.logger.info('Scaling action completed', {
        actionId: action.id,
        newInstanceCount: target.currentInstances,
      });
    } catch (error) {
      action.status = 'failed';
      action.error = (error as Error).message;

      this.logger.error('Scaling action failed', {
        actionId: action.id,
        error: action.error,
      });
    }
  }

  private async performScaling(
    target: ScalingTarget,
    desiredInstances: number
  ): Promise<void> {
    // In a real implementation, this would integrate with orchestration systems
    switch (target.type) {
      case 'kubernetes':
        await this.scaleKubernetes(target, desiredInstances);
        break;
      case 'docker':
        await this.scaleDocker(target, desiredInstances);
        break;
      case 'aws_ecs':
        await this.scaleECS(target, desiredInstances);
        break;
      case 'custom':
        await this.scaleCustom(target, desiredInstances);
        break;
      default:
        throw new Error(
          `Unsupported scaling target type: ${target.type}`
        );
    }
  }

  private async scaleKubernetes(
    target: ScalingTarget,
    desiredInstances: number
  ): Promise<void> {
    // Simulate Kubernetes scaling
    await new Promise((resolve) => setTimeout(resolve, 1000));
    this.logger.debug('Kubernetes scaling simulated', {
      targetId: target.id,
      desiredInstances,
    });
  }

  private async scaleDocker(
    target: ScalingTarget,
    desiredInstances: number
  ): Promise<void> {
    // Simulate Docker scaling
    await new Promise((resolve) => setTimeout(resolve, 800));
    this.logger.debug('Docker scaling simulated', {
      targetId: target.id,
      desiredInstances,
    });
  }

  private async scaleECS(
    target: ScalingTarget,
    desiredInstances: number
  ): Promise<void> {
    // Simulate AWS ECS scaling
    await new Promise((resolve) => setTimeout(resolve, 1200));
    this.logger.debug('ECS scaling simulated', {
      targetId: target.id,
      desiredInstances,
    });
  }

  private async scaleCustom(
    target: ScalingTarget,
    desiredInstances: number
  ): Promise<void> {
    // Simulate custom scaling
    await new Promise((resolve) => setTimeout(resolve, 500));
    this.logger.debug('Custom scaling simulated', {
      targetId: target.id,
      desiredInstances,
    });
  }

  private extractMetricValue(
    metricPath: string,
    systemMetrics: SystemMetrics,
    appMetrics: ApplicationMetrics
  ): number | null {
    const parts = metricPath.split('.');

    let obj: any;
    if (parts[0] === 'system') {
      obj = systemMetrics;
    } else if (parts[0] === 'app') {
      obj = appMetrics;
    } else {
      return null;
    }

    for (let i = 1; i < parts.length; i++) {
      obj = obj?.[parts[i]];
      if (obj === undefined) return null;
    }

    return typeof obj === 'number' ? obj : null;
  }

  private getRecommendedAction(
    target: ScalingTarget
  ): 'scale_up' | 'scale_down' | 'none' {
    // Simplified recommendation logic
    // In a real implementation, this would analyze current metrics and trends
    return 'none';
  }

  private cleanupOldHistory(): void {
    const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
    this.scalingHistory = this.scalingHistory.filter(
      (action) => action.timestamp > cutoffTime
    );
  }

  private generateActionId(): string {
    return `scaling_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }
}
