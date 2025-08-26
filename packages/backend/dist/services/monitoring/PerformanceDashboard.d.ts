import { Logger } from '../../utils/Logger';
import { SystemMetrics, ApplicationMetrics, HealthStatus } from './SystemHealthMonitor';
import { Alert, AlertingService } from './AlertingService';
export interface DashboardMetrics {
    timestamp: Date;
    system: {
        cpu: number;
        memory: number;
        disk: number;
        network: {
            bytesIn: number;
            bytesOut: number;
        };
    };
    application: {
        requestsPerSecond: number;
        averageResponseTime: number;
        errorRate: number;
        verificationsPerHour: number;
        successRate: number;
    };
    database: {
        connections: number;
        queryTime: number;
        querySuccessRate: number;
    };
    cache: {
        hitRate: number;
        memoryUsage: number;
    };
    health: {
        overallScore: number;
        status: string;
        failedChecks: number;
    };
}
export interface PerformanceTrend {
    metric: string;
    timeframe: string;
    data: Array<{
        timestamp: Date;
        value: number;
    }>;
    trend: 'up' | 'down' | 'stable';
    changePercent: number;
}
export interface DashboardConfig {
    refreshInterval: number;
    trendAnalysisPeriod: number;
    maxDataPoints: number;
}
export declare class PerformanceDashboard {
    private logger;
    private config;
    private metricsHistory;
    private alertingService;
    constructor(logger: Logger, config: DashboardConfig, alertingService: AlertingService);
    /**
     * Update dashboard with new metrics
     */
    updateMetrics(systemMetrics: SystemMetrics, appMetrics: ApplicationMetrics, healthStatus: HealthStatus): void;
    /**
     * Get current dashboard snapshot
     */
    getCurrentSnapshot(): {
        metrics: DashboardMetrics | null;
        alerts: Alert[];
        trends: PerformanceTrend[];
    };
    /**
     * Get metrics for a specific time range
     */
    getMetricsRange(startTime: Date, endTime: Date): DashboardMetrics[];
    /**
     * Get performance summary for a time period
     */
    getPerformanceSummary(period?: number): {
        averages: {
            cpu: number;
            memory: number;
            responseTime: number;
            errorRate: number;
            successRate: number;
        };
        peaks: {
            maxCpu: number;
            maxMemory: number;
            maxResponseTime: number;
            maxErrorRate: number;
        };
        availability: number;
        totalRequests: number;
        totalVerifications: number;
    };
    /**
     * Generate performance report
     */
    generatePerformanceReport(startTime: Date, endTime: Date, format?: 'json' | 'summary'): any;
    /**
     * Get system status overview
     */
    getSystemStatus(): {
        status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
        uptime: number;
        performance: 'excellent' | 'good' | 'fair' | 'poor';
        activeIssues: number;
        lastUpdated: Date;
    };
    private calculateTrends;
    private calculateTrendsForPeriod;
    private calculateMetricTrend;
    private calculateAverage;
    private assessPerformance;
    private groupAlertsBySeverity;
    private groupAlertsByType;
    private getEmptyPerformanceSummary;
    private cleanupOldMetrics;
}
//# sourceMappingURL=PerformanceDashboard.d.ts.map