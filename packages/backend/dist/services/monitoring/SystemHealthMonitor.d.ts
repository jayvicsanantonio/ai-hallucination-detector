import { Logger } from '../../utils/Logger';
export interface SystemMetrics {
    timestamp: Date;
    cpu: {
        usage: number;
        loadAverage: number[];
    };
    memory: {
        used: number;
        total: number;
        usage: number;
    };
    disk: {
        used: number;
        total: number;
        usage: number;
    };
    network: {
        bytesIn: number;
        bytesOut: number;
        packetsIn: number;
        packetsOut: number;
    };
    processes: {
        active: number;
        total: number;
    };
}
export interface ApplicationMetrics {
    timestamp: Date;
    requests: {
        total: number;
        successful: number;
        failed: number;
        averageResponseTime: number;
        requestsPerSecond: number;
    };
    verification: {
        totalVerifications: number;
        successfulVerifications: number;
        failedVerifications: number;
        averageProcessingTime: number;
        verificationsPerHour: number;
    };
    database: {
        connections: {
            active: number;
            idle: number;
            total: number;
        };
        queries: {
            total: number;
            successful: number;
            failed: number;
            averageExecutionTime: number;
        };
    };
    cache: {
        hits: number;
        misses: number;
        hitRate: number;
        memoryUsage: number;
    };
}
export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
    timestamp: Date;
    checks: HealthCheck[];
    overallScore: number;
}
export interface HealthCheck {
    name: string;
    status: 'pass' | 'warn' | 'fail';
    responseTime: number;
    message?: string;
    details?: Record<string, unknown>;
}
export interface MonitoringConfig {
    metricsCollectionInterval: number;
    healthCheckInterval: number;
    alertThresholds: {
        cpu: {
            warning: number;
            critical: number;
        };
        memory: {
            warning: number;
            critical: number;
        };
        disk: {
            warning: number;
            critical: number;
        };
        responseTime: {
            warning: number;
            critical: number;
        };
        errorRate: {
            warning: number;
            critical: number;
        };
    };
    retentionPeriod: number;
}
export declare class SystemHealthMonitor {
    private logger;
    private config;
    private metricsHistory;
    private appMetricsHistory;
    private healthHistory;
    private metricsTimer?;
    private healthTimer?;
    constructor(logger: Logger, config: MonitoringConfig);
    /**
     * Start monitoring system health and metrics
     */
    private startMonitoring;
    /**
     * Collect system and application metrics
     */
    collectMetrics(): Promise<void>;
    /**
     * Perform comprehensive health checks
     */
    performHealthChecks(): Promise<HealthStatus>;
    /**
     * Get current system metrics
     */
    getCurrentMetrics(): {
        system: SystemMetrics | null;
        application: ApplicationMetrics | null;
    };
    /**
     * Get current health status
     */
    getCurrentHealth(): HealthStatus | null;
    /**
     * Get metrics history for a time period
     */
    getMetricsHistory(startTime: Date, endTime: Date): {
        system: SystemMetrics[];
        application: ApplicationMetrics[];
    };
    /**
     * Get health history for a time period
     */
    getHealthHistory(startTime: Date, endTime: Date): HealthStatus[];
    /**
     * Shutdown monitoring
     */
    shutdown(): void;
    private collectSystemMetrics;
    private collectApplicationMetrics;
    private checkCpuHealth;
    private checkMemoryHealth;
    private checkDiskHealth;
    private checkDatabaseHealth;
    private checkCacheHealth;
    private checkApiHealth;
    private checkExternalServicesHealth;
    private calculateHealthScore;
    private determineHealthStatus;
    private cleanupOldMetrics;
    private cleanupOldHealthData;
}
//# sourceMappingURL=SystemHealthMonitor.d.ts.map