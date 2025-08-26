import { Domain } from '../../models/core/ContentTypes';
export interface PerformanceMetric {
    id: string;
    modelVersionId: string;
    domain: Domain;
    metricType: 'accuracy' | 'precision' | 'recall' | 'f1_score' | 'response_time' | 'user_satisfaction';
    value: number;
    timestamp: Date;
    metadata?: Record<string, unknown>;
}
export interface PerformanceAlert {
    id: string;
    modelVersionId: string;
    domain: Domain;
    alertType: 'accuracy_drop' | 'performance_degradation' | 'error_rate_spike' | 'drift_detected';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    threshold: number;
    currentValue: number;
    timestamp: Date;
    acknowledged: boolean;
}
export interface DriftDetectionResult {
    isDriftDetected: boolean;
    driftScore: number;
    driftType: 'concept_drift' | 'data_drift' | 'prediction_drift';
    confidence: number;
    recommendation: string;
}
export interface ModelHealthReport {
    modelVersionId: string;
    domain: Domain;
    overallHealth: 'healthy' | 'warning' | 'critical';
    metrics: {
        accuracy: number;
        precision: number;
        recall: number;
        f1Score: number;
        responseTime: number;
        userSatisfaction: number;
    };
    trends: {
        accuracyTrend: 'improving' | 'stable' | 'declining';
        performanceTrend: 'improving' | 'stable' | 'declining';
    };
    alerts: PerformanceAlert[];
    driftStatus: DriftDetectionResult;
    recommendations: string[];
    lastUpdated: Date;
}
export declare class ModelPerformanceMonitor {
    private logger;
    private metrics;
    private alerts;
    private thresholds;
    constructor();
    /**
     * Record a performance metric
     */
    recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'> & {
        timestamp?: Date;
    }): Promise<void>;
    /**
     * Get performance metrics for a model version
     */
    getMetrics(modelVersionId: string, options?: {
        metricType?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
    }): Promise<PerformanceMetric[]>;
    /**
     * Generate model health report
     */
    generateHealthReport(modelVersionId: string, domain: Domain): Promise<ModelHealthReport>;
    /**
     * Set performance thresholds for a model
     */
    setThresholds(modelVersionId: string, thresholds: Record<string, number>): Promise<void>;
    /**
     * Get active alerts for a model
     */
    getAlerts(modelVersionId?: string): Promise<PerformanceAlert[]>;
    /**
     * Acknowledge an alert
     */
    acknowledgeAlert(alertId: string): Promise<void>;
    /**
     * Detect model drift
     */
    detectDrift(modelVersionId: string): Promise<DriftDetectionResult>;
    /**
     * Initialize default performance thresholds
     */
    private initializeDefaultThresholds;
    /**
     * Check if metrics exceed thresholds and create alerts
     */
    private checkThresholds;
    /**
     * Calculate current metrics from recent data
     */
    private calculateCurrentMetrics;
    /**
     * Calculate average value for a specific metric type
     */
    private calculateAverageMetric;
    /**
     * Calculate performance trends
     */
    private calculateTrends;
    /**
     * Get active (unacknowledged) alerts for a model
     */
    private getActiveAlerts;
    /**
     * Calculate overall health status
     */
    private calculateOverallHealth;
    /**
     * Generate recommendations based on current state
     */
    private generateRecommendations;
}
//# sourceMappingURL=ModelPerformanceMonitor.d.ts.map