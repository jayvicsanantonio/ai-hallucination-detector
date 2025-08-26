"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertingService = void 0;
class AlertingService {
    constructor(logger, config) {
        this.alertRules = new Map();
        this.activeAlerts = new Map();
        this.alertHistory = [];
        this.notificationChannels = new Map();
        this.lastAlertTimes = new Map();
        this.logger = logger;
        this.config = config;
        this.startEvaluation();
    }
    /**
     * Add or update an alert rule
     */
    addAlertRule(rule) {
        this.alertRules.set(rule.id, rule);
        this.logger.info('Alert rule added', {
            ruleId: rule.id,
            name: rule.name,
        });
    }
    /**
     * Remove an alert rule
     */
    removeAlertRule(ruleId) {
        const removed = this.alertRules.delete(ruleId);
        if (removed) {
            this.logger.info('Alert rule removed', { ruleId });
        }
        return removed;
    }
    /**
     * Add or update a notification channel
     */
    addNotificationChannel(channel) {
        this.notificationChannels.set(channel.id, channel);
        this.logger.info('Notification channel added', {
            channelId: channel.id,
            type: channel.type,
        });
    }
    /**
     * Evaluate metrics against alert rules
     */
    async evaluateMetrics(systemMetrics, appMetrics, healthStatus) {
        for (const rule of this.alertRules.values()) {
            if (!rule.enabled)
                continue;
            try {
                const shouldAlert = await this.evaluateRule(rule, systemMetrics, appMetrics, healthStatus);
                if (shouldAlert) {
                    await this.triggerAlert(rule, systemMetrics, appMetrics, healthStatus);
                }
            }
            catch (error) {
                this.logger.error('Failed to evaluate alert rule', {
                    error,
                    ruleId: rule.id,
                });
            }
        }
        // Check for alert resolution
        await this.checkAlertResolution(systemMetrics, appMetrics, healthStatus);
    }
    /**
     * Manually trigger an alert
     */
    async triggerManualAlert(type, severity, title, message, source, details = {}) {
        const alert = {
            id: this.generateAlertId(),
            type,
            severity,
            title,
            message,
            timestamp: new Date(),
            source,
            details,
            status: 'active',
        };
        await this.processAlert(alert);
        return alert;
    }
    /**
     * Acknowledge an alert
     */
    async acknowledgeAlert(alertId, acknowledgedBy) {
        const alert = this.activeAlerts.get(alertId);
        if (!alert)
            return false;
        alert.status = 'acknowledged';
        alert.acknowledgedBy = acknowledgedBy;
        alert.acknowledgedAt = new Date();
        this.logger.info('Alert acknowledged', {
            alertId,
            acknowledgedBy,
            title: alert.title,
        });
        return true;
    }
    /**
     * Resolve an alert
     */
    async resolveAlert(alertId) {
        const alert = this.activeAlerts.get(alertId);
        if (!alert)
            return false;
        alert.status = 'resolved';
        alert.resolvedAt = new Date();
        this.activeAlerts.delete(alertId);
        this.alertHistory.push(alert);
        this.logger.info('Alert resolved', {
            alertId,
            title: alert.title,
            duration: alert.resolvedAt.getTime() - alert.timestamp.getTime(),
        });
        return true;
    }
    /**
     * Get active alerts
     */
    getActiveAlerts() {
        return Array.from(this.activeAlerts.values());
    }
    /**
     * Get alert history
     */
    getAlertHistory(startTime, endTime) {
        let history = this.alertHistory;
        if (startTime || endTime) {
            history = history.filter((alert) => {
                if (startTime && alert.timestamp < startTime)
                    return false;
                if (endTime && alert.timestamp > endTime)
                    return false;
                return true;
            });
        }
        return history;
    }
    /**
     * Get alert statistics
     */
    getAlertStatistics(period = 24 * 60 * 60 * 1000) {
        const cutoffTime = new Date(Date.now() - period);
        const recentAlerts = this.alertHistory.filter((a) => a.timestamp > cutoffTime);
        const bySeverity = recentAlerts.reduce((acc, alert) => {
            acc[alert.severity] = (acc[alert.severity] || 0) + 1;
            return acc;
        }, {});
        const byType = recentAlerts.reduce((acc, alert) => {
            acc[alert.type] = (acc[alert.type] || 0) + 1;
            return acc;
        }, {});
        const resolvedAlerts = recentAlerts.filter((a) => a.resolvedAt);
        const averageResolutionTime = resolvedAlerts.length > 0
            ? resolvedAlerts.reduce((sum, alert) => {
                return (sum +
                    (alert.resolvedAt.getTime() -
                        alert.timestamp.getTime()));
            }, 0) / resolvedAlerts.length
            : 0;
        return {
            total: recentAlerts.length,
            bySeverity,
            byType,
            averageResolutionTime,
            activeCount: this.activeAlerts.size,
        };
    }
    /**
     * Shutdown alerting service
     */
    shutdown() {
        if (this.evaluationTimer) {
            clearInterval(this.evaluationTimer);
        }
    }
    startEvaluation() {
        this.evaluationTimer = setInterval(() => {
            this.cleanupOldAlerts();
        }, this.config.evaluationInterval);
    }
    async evaluateRule(rule, systemMetrics, appMetrics, healthStatus) {
        const value = this.extractMetricValue(rule.condition.metric, systemMetrics, appMetrics, healthStatus);
        if (value === null || value === undefined) {
            return false;
        }
        return this.evaluateCondition(rule.condition, value);
    }
    extractMetricValue(metricPath, systemMetrics, appMetrics, healthStatus) {
        const parts = metricPath.split('.');
        let obj;
        if (parts[0] === 'system') {
            obj = systemMetrics;
        }
        else if (parts[0] === 'app') {
            obj = appMetrics;
        }
        else if (parts[0] === 'health') {
            obj = healthStatus;
        }
        else {
            return null;
        }
        for (let i = 1; i < parts.length; i++) {
            obj = obj?.[parts[i]];
            if (obj === undefined)
                return null;
        }
        return obj;
    }
    evaluateCondition(condition, value) {
        const { operator, threshold } = condition;
        switch (operator) {
            case 'gt':
                return Number(value) > Number(threshold);
            case 'gte':
                return Number(value) >= Number(threshold);
            case 'lt':
                return Number(value) < Number(threshold);
            case 'lte':
                return Number(value) <= Number(threshold);
            case 'eq':
                return value === threshold;
            case 'contains':
                return String(value).includes(String(threshold));
            default:
                return false;
        }
    }
    async triggerAlert(rule, systemMetrics, appMetrics, healthStatus) {
        // Check cooldown period
        const lastAlertTime = this.lastAlertTimes.get(rule.id);
        const cooldownPeriod = rule.cooldownPeriod || this.config.defaultCooldownPeriod;
        if (lastAlertTime &&
            Date.now() - lastAlertTime.getTime() < cooldownPeriod) {
            return;
        }
        // Check if we've reached max active alerts
        if (this.activeAlerts.size >= this.config.maxActiveAlerts) {
            this.logger.warn('Max active alerts reached, skipping new alert', {
                ruleId: rule.id,
                maxAlerts: this.config.maxActiveAlerts,
            });
            return;
        }
        const metricValue = this.extractMetricValue(rule.condition.metric, systemMetrics, appMetrics, healthStatus);
        const alert = {
            id: this.generateAlertId(),
            type: rule.type,
            severity: rule.severity,
            title: rule.name,
            message: `${rule.description} - Current value: ${metricValue}, Threshold: ${rule.condition.threshold}`,
            timestamp: new Date(),
            source: `rule:${rule.id}`,
            details: {
                ruleId: rule.id,
                metric: rule.condition.metric,
                value: metricValue,
                threshold: rule.condition.threshold,
                operator: rule.condition.operator,
            },
            status: 'active',
        };
        await this.processAlert(alert);
        this.lastAlertTimes.set(rule.id, new Date());
    }
    async processAlert(alert) {
        this.activeAlerts.set(alert.id, alert);
        this.logger.warn('Alert triggered', {
            alertId: alert.id,
            type: alert.type,
            severity: alert.severity,
            title: alert.title,
        });
        // Send notifications (simplified - would integrate with actual notification services)
        await this.sendNotifications(alert);
    }
    async sendNotifications(alert) {
        // In a real implementation, this would send notifications via configured channels
        this.logger.info('Sending alert notifications', {
            alertId: alert.id,
            severity: alert.severity,
            channels: Array.from(this.notificationChannels.keys()),
        });
    }
    async checkAlertResolution(systemMetrics, appMetrics, healthStatus) {
        for (const alert of this.activeAlerts.values()) {
            if (alert.source.startsWith('rule:')) {
                const ruleId = alert.source.split(':')[1];
                const rule = this.alertRules.get(ruleId);
                if (rule) {
                    const shouldAlert = await this.evaluateRule(rule, systemMetrics, appMetrics, healthStatus);
                    if (!shouldAlert) {
                        await this.resolveAlert(alert.id);
                    }
                }
            }
        }
    }
    cleanupOldAlerts() {
        const cutoffTime = new Date(Date.now() - this.config.retentionPeriod);
        this.alertHistory = this.alertHistory.filter((alert) => alert.timestamp > cutoffTime);
    }
    generateAlertId() {
        return `alert_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`;
    }
}
exports.AlertingService = AlertingService;
//# sourceMappingURL=AlertingService.js.map