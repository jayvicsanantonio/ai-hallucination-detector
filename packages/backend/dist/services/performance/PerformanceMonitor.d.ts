import { CacheManager } from '../cache/CacheManager';
import { ConnectionPool } from '../../database/ConnectionPool';
export interface PerformanceMetrics {
    timestamp: Date;
    requestCount: number;
    averageResponseTime: number;
    errorRate: number;
    throughput: number;
    memoryUsage: {
        used: number;
        total: number;
        percentage: number;
    };
    cpuUsage: number;
    cacheStats: {
        hitRate: number;
        missRate: number;
        totalRequests: number;
    };
    databaseStats: {
        activeConnections: number;
        averageQueryTime: number;
        slowQueries: number;
    };
}
export interface PerformanceAlert {
    type: 'high_response_time' | 'high_error_rate' | 'low_cache_hit_rate' | 'high_memory_usage' | 'database_slow';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    value: number;
    threshold: number;
    timestamp: Date;
}
export interface PerformanceThresholds {
    responseTime: {
        warning: number;
        critical: number;
    };
    errorRate: {
        warning: number;
        critical: number;
    };
    cacheHitRate: {
        warning: number;
        critical: number;
    };
    memoryUsage: {
        warning: number;
        critical: number;
    };
    databaseQueryTime: {
        warning: number;
        critical: number;
    };
}
export declare class PerformanceMonitor {
    private cacheManager;
    private connectionPool;
    private thresholds;
    private logger;
    private metrics;
    private requestTimes;
    private errorCount;
    private requestCount;
    private startTime;
    private alerts;
    private readonly maxMetricsHistory;
    private readonly maxRequestTimesHistory;
    constructor(cacheManager: CacheManager, connectionPool: ConnectionPool, thresholds: PerformanceThresholds);
    recordRequest(responseTime: number, isError?: boolean): void;
    collectMetrics(): Promise<PerformanceMetrics>;
    getMetrics(limit?: number): PerformanceMetrics[];
    getPerformanceSummary(timeRange?: {
        start: Date;
        end: Date;
    }): any;
    private checkAlerts;
    getAlerts(severity?: string): PerformanceAlert[];
    clearAlerts(): void;
    getOptimizationRecommendations(): string[];
    private startPeriodicCollection;
    private calculateAverage;
    private getCpuUsage;
    resetStats(): void;
}
//# sourceMappingURL=PerformanceMonitor.d.ts.map