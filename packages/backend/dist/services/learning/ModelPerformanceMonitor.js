"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelPerformanceMonitor = void 0;
const Logger_1 = require("../../utils/Logger");
class ModelPerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.alerts = new Map();
        this.thresholds = new Map();
        this.logger = new Logger_1.Logger('ModelPerformanceMonitor');
        this.initializeDefaultThresholds();
    }
    /**
     * Record a performance metric
     */
    async recordMetric(metric) {
        try {
            const metricId = `metric_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 9)}`;
            const performanceMetric = {
                ...metric,
                id: metricId,
                timestamp: metric.timestamp || new Date(),
            };
            const modelMetrics = this.metrics.get(metric.modelVersionId) || [];
            modelMetrics.push(performanceMetric);
            this.metrics.set(metric.modelVersionId, modelMetrics);
            // Check for alerts
            await this.checkThresholds(performanceMetric);
            this.logger.info('Performance metric recorded', {
                modelVersionId: metric.modelVersionId,
                metricType: metric.metricType,
                value: metric.value,
            });
        }
        catch (error) {
            this.logger.error('Error recording metric', {
                error: error instanceof Error ? error.message : String(error),
                modelVersionId: metric.modelVersionId,
            });
            throw error;
        }
    }
    /**
     * Get performance metrics for a model version
     */
    async getMetrics(modelVersionId, options) {
        try {
            let metrics = this.metrics.get(modelVersionId) || [];
            // Apply filters
            if (options?.metricType) {
                metrics = metrics.filter((m) => m.metricType === options.metricType);
            }
            if (options?.startDate) {
                metrics = metrics.filter((m) => m.timestamp >= options.startDate);
            }
            if (options?.endDate) {
                metrics = metrics.filter((m) => m.timestamp <= options.endDate);
            }
            // Sort by timestamp (newest first)
            metrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            // Apply limit
            if (options?.limit) {
                metrics = metrics.slice(0, options.limit);
            }
            return metrics;
        }
        catch (error) {
            this.logger.error('Error getting metrics', {
                error: error instanceof Error ? error.message : String(error),
                modelVersionId,
            });
            throw error;
        }
    }
    /**
     * Generate model health report
     */
    async generateHealthReport(modelVersionId, domain) {
        try {
            const recentMetrics = await this.getMetrics(modelVersionId, {
                startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                limit: 1000,
            });
            const currentMetrics = this.calculateCurrentMetrics(recentMetrics);
            const trends = this.calculateTrends(modelVersionId);
            const alerts = this.getActiveAlerts(modelVersionId);
            const driftStatus = await this.detectDrift(modelVersionId);
            const overallHealth = this.calculateOverallHealth(currentMetrics, alerts, driftStatus);
            const recommendations = this.generateRecommendations(currentMetrics, trends, alerts, driftStatus);
            const report = {
                modelVersionId,
                domain,
                overallHealth,
                metrics: currentMetrics,
                trends,
                alerts,
                driftStatus,
                recommendations,
                lastUpdated: new Date(),
            };
            this.logger.info('Health report generated', {
                modelVersionId,
                overallHealth,
                alertsCount: alerts.length,
            });
            return report;
        }
        catch (error) {
            this.logger.error('Error generating health report', {
                error: error instanceof Error ? error.message : String(error),
                modelVersionId,
            });
            throw error;
        }
    }
    /**
     * Set performance thresholds for a model
     */
    async setThresholds(modelVersionId, thresholds) {
        try {
            this.thresholds.set(modelVersionId, thresholds);
            this.logger.info('Thresholds updated', {
                modelVersionId,
                thresholds,
            });
        }
        catch (error) {
            this.logger.error('Error setting thresholds', {
                error: error instanceof Error ? error.message : String(error),
                modelVersionId,
            });
            throw error;
        }
    }
    /**
     * Get active alerts for a model
     */
    async getAlerts(modelVersionId) {
        const allAlerts = Array.from(this.alerts.values());
        if (modelVersionId) {
            return allAlerts.filter((alert) => alert.modelVersionId === modelVersionId);
        }
        return allAlerts;
    }
    /**
     * Acknowledge an alert
     */
    async acknowledgeAlert(alertId) {
        try {
            const alert = this.alerts.get(alertId);
            if (alert) {
                alert.acknowledged = true;
                this.alerts.set(alertId, alert);
                this.logger.info('Alert acknowledged', { alertId });
            }
        }
        catch (error) {
            this.logger.error('Error acknowledging alert', {
                error: error instanceof Error ? error.message : String(error),
                alertId,
            });
            throw error;
        }
    }
    /**
     * Detect model drift
     */
    async detectDrift(modelVersionId) {
        try {
            // Get recent metrics for drift analysis
            const recentMetrics = await this.getMetrics(modelVersionId, {
                startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
                limit: 1000,
            });
            const historicalMetrics = await this.getMetrics(modelVersionId, {
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                endDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                limit: 1000,
            });
            // Check if we have sufficient data for drift detection
            if (recentMetrics.length === 0 ||
                historicalMetrics.length === 0) {
                return {
                    isDriftDetected: false,
                    driftScore: 0,
                    driftType: 'concept_drift',
                    confidence: 0,
                    recommendation: 'Unable to detect drift due to insufficient data',
                };
            }
            // Simple drift detection based on accuracy changes
            const recentAccuracy = this.calculateAverageMetric(recentMetrics, 'accuracy');
            const historicalAccuracy = this.calculateAverageMetric(historicalMetrics, 'accuracy');
            const accuracyDrop = historicalAccuracy - recentAccuracy;
            const driftScore = Math.abs(accuracyDrop);
            const isDriftDetected = driftScore > 0.05; // 5% threshold
            let driftType = 'concept_drift';
            if (accuracyDrop > 0.05) {
                driftType = 'concept_drift';
            }
            else if (driftScore > 0.03) {
                driftType = 'data_drift';
            }
            const confidence = Math.min(driftScore * 10, 1); // Scale to 0-1
            let recommendation = 'Model performance is stable';
            if (isDriftDetected) {
                recommendation = `${driftType} detected. Consider retraining the model with recent data.`;
            }
            return {
                isDriftDetected,
                driftScore,
                driftType,
                confidence,
                recommendation,
            };
        }
        catch (error) {
            this.logger.error('Error detecting drift', {
                error: error instanceof Error ? error.message : String(error),
                modelVersionId,
            });
            return {
                isDriftDetected: false,
                driftScore: 0,
                driftType: 'concept_drift',
                confidence: 0,
                recommendation: 'Unable to detect drift due to insufficient data',
            };
        }
    }
    /**
     * Initialize default performance thresholds
     */
    initializeDefaultThresholds() {
        const defaultThresholds = {
            accuracy: 0.8,
            precision: 0.75,
            recall: 0.75,
            f1_score: 0.75,
            response_time: 2000, // 2 seconds
            user_satisfaction: 0.7,
        };
        this.thresholds.set('default', defaultThresholds);
    }
    /**
     * Check if metrics exceed thresholds and create alerts
     */
    async checkThresholds(metric) {
        try {
            const thresholds = this.thresholds.get(metric.modelVersionId) ||
                this.thresholds.get('default') ||
                {};
            const threshold = thresholds[metric.metricType];
            if (threshold === undefined)
                return;
            let shouldAlert = false;
            let alertType = 'accuracy_drop';
            let severity = 'medium';
            // Check if metric is below threshold (for accuracy, precision, recall, f1_score, user_satisfaction)
            if ([
                'accuracy',
                'precision',
                'recall',
                'f1_score',
                'user_satisfaction',
            ].includes(metric.metricType)) {
                if (metric.value < threshold) {
                    shouldAlert = true;
                    alertType =
                        metric.metricType === 'accuracy'
                            ? 'accuracy_drop'
                            : 'performance_degradation';
                    severity =
                        metric.value < threshold * 0.8 ? 'critical' : 'high';
                }
            }
            // Check if metric is above threshold (for response_time)
            if (metric.metricType === 'response_time' &&
                metric.value > threshold) {
                shouldAlert = true;
                alertType = 'performance_degradation';
                severity = metric.value > threshold * 2 ? 'critical' : 'high';
            }
            if (shouldAlert) {
                const alertId = `alert_${Date.now()}_${Math.random()
                    .toString(36)
                    .substr(2, 9)}`;
                const alert = {
                    id: alertId,
                    modelVersionId: metric.modelVersionId,
                    domain: metric.domain,
                    alertType,
                    severity,
                    message: `${metric.metricType} (${metric.value.toFixed(3)}) is ${[
                        'accuracy',
                        'precision',
                        'recall',
                        'f1_score',
                        'user_satisfaction',
                    ].includes(metric.metricType)
                        ? 'below'
                        : 'above'} threshold (${threshold})`,
                    threshold,
                    currentValue: metric.value,
                    timestamp: new Date(),
                    acknowledged: false,
                };
                this.alerts.set(alertId, alert);
                this.logger.warn('Performance alert created', {
                    alertId,
                    modelVersionId: metric.modelVersionId,
                    metricType: metric.metricType,
                    value: metric.value,
                    threshold,
                });
            }
        }
        catch (error) {
            this.logger.error('Error checking thresholds', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    /**
     * Calculate current metrics from recent data
     */
    calculateCurrentMetrics(metrics) {
        return {
            accuracy: this.calculateAverageMetric(metrics, 'accuracy'),
            precision: this.calculateAverageMetric(metrics, 'precision'),
            recall: this.calculateAverageMetric(metrics, 'recall'),
            f1Score: this.calculateAverageMetric(metrics, 'f1_score'),
            responseTime: this.calculateAverageMetric(metrics, 'response_time'),
            userSatisfaction: this.calculateAverageMetric(metrics, 'user_satisfaction'),
        };
    }
    /**
     * Calculate average value for a specific metric type
     */
    calculateAverageMetric(metrics, metricType) {
        const relevantMetrics = metrics.filter((m) => m.metricType === metricType);
        if (relevantMetrics.length === 0)
            return 0;
        const sum = relevantMetrics.reduce((acc, m) => acc + m.value, 0);
        return sum / relevantMetrics.length;
    }
    /**
     * Calculate performance trends
     */
    calculateTrends(modelVersionId) {
        // Simplified trend calculation - in production this would be more sophisticated
        return {
            accuracyTrend: 'stable',
            performanceTrend: 'stable',
        };
    }
    /**
     * Get active (unacknowledged) alerts for a model
     */
    getActiveAlerts(modelVersionId) {
        return Array.from(this.alerts.values()).filter((alert) => alert.modelVersionId === modelVersionId && !alert.acknowledged);
    }
    /**
     * Calculate overall health status
     */
    calculateOverallHealth(metrics, alerts, driftStatus) {
        const criticalAlerts = alerts.filter((a) => a.severity === 'critical');
        const highAlerts = alerts.filter((a) => a.severity === 'high');
        if (criticalAlerts.length > 0 || driftStatus.isDriftDetected) {
            return 'critical';
        }
        if (highAlerts.length > 0 || metrics.accuracy < 0.8) {
            return 'warning';
        }
        return 'healthy';
    }
    /**
     * Generate recommendations based on current state
     */
    generateRecommendations(metrics, trends, alerts, driftStatus) {
        const recommendations = [];
        if (driftStatus.isDriftDetected) {
            recommendations.push(driftStatus.recommendation);
        }
        if (metrics.accuracy < 0.8) {
            recommendations.push('Consider retraining the model with more recent data');
        }
        if (metrics.responseTime > 2000) {
            recommendations.push('Optimize model inference for better response times');
        }
        if (alerts.length > 5) {
            recommendations.push('Review and address multiple performance alerts');
        }
        if (recommendations.length === 0) {
            recommendations.push('Model performance is within acceptable ranges');
        }
        return recommendations;
    }
}
exports.ModelPerformanceMonitor = ModelPerformanceMonitor;
//# sourceMappingURL=ModelPerformanceMonitor.js.map