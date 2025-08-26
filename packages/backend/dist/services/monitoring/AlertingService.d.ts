import { Logger } from '../../utils/Logger';
import { SystemMetrics, ApplicationMetrics, HealthStatus } from './SystemHealthMonitor';
export interface Alert {
    id: string;
    type: AlertType;
    severity: AlertSeverity;
    title: string;
    message: string;
    timestamp: Date;
    source: string;
    details: Record<string, any>;
    status: AlertStatus;
    acknowledgedBy?: string;
    acknowledgedAt?: Date;
    resolvedAt?: Date;
}
export type AlertType = 'system_resource' | 'application_performance' | 'database_issue' | 'cache_issue' | 'external_service' | 'security_incident' | 'compliance_violation' | 'custom';
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'suppressed';
export interface AlertRule {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    type: AlertType;
    severity: AlertSeverity;
    condition: AlertCondition;
    cooldownPeriod: number;
    notificationChannels: string[];
    suppressionRules?: SuppressionRule[];
}
export interface AlertCondition {
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'contains';
    threshold: number | string;
    duration?: number;
}
export interface SuppressionRule {
    condition: string;
    duration: number;
}
export interface NotificationChannel {
    id: string;
    name: string;
    type: 'email' | 'sms';
    config: Record<string, any>;
    enabled: boolean;
}
export interface AlertingConfig {
    evaluationInterval: number;
    maxActiveAlerts: number;
    defaultCooldownPeriod: number;
    retentionPeriod: number;
}
export declare class AlertingService {
    private logger;
    private config;
    private alertRules;
    private activeAlerts;
    private alertHistory;
    private notificationChannels;
    private evaluationTimer?;
    private lastAlertTimes;
    constructor(logger: Logger, config: AlertingConfig);
    /**
     * Add or update an alert rule
     */
    addAlertRule(rule: AlertRule): void;
    /**
     * Remove an alert rule
     */
    removeAlertRule(ruleId: string): boolean;
    /**
     * Add or update a notification channel
     */
    addNotificationChannel(channel: NotificationChannel): void;
    /**
     * Evaluate metrics against alert rules
     */
    evaluateMetrics(systemMetrics: SystemMetrics, appMetrics: ApplicationMetrics, healthStatus: HealthStatus): Promise<void>;
    /**
     * Manually trigger an alert
     */
    triggerManualAlert(type: AlertType, severity: AlertSeverity, title: string, message: string, source: string, details?: Record<string, any>): Promise<Alert>;
    /**
     * Acknowledge an alert
     */
    acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<boolean>;
    /**
     * Resolve an alert
     */
    resolveAlert(alertId: string): Promise<boolean>;
    /**
     * Get active alerts
     */
    getActiveAlerts(): Alert[];
    /**
     * Get alert history
     */
    getAlertHistory(startTime?: Date, endTime?: Date): Alert[];
    /**
     * Get alert statistics
     */
    getAlertStatistics(period?: number): {
        total: number;
        bySeverity: Record<AlertSeverity, number>;
        byType: Record<AlertType, number>;
        averageResolutionTime: number;
        activeCount: number;
    };
    /**
     * Shutdown alerting service
     */
    shutdown(): void;
    private startEvaluation;
    private evaluateRule;
    private extractMetricValue;
    private evaluateCondition;
    private triggerAlert;
    private processAlert;
    private sendNotifications;
    private checkAlertResolution;
    private cleanupOldAlerts;
    private generateAlertId;
}
//# sourceMappingURL=AlertingService.d.ts.map