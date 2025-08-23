import { Logger } from '../../utils/Logger';
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
  type:
    | 'high_response_time'
    | 'high_error_rate'
    | 'low_cache_hit_rate'
    | 'high_memory_usage'
    | 'database_slow';
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

export class PerformanceMonitor {
  private logger: Logger;
  private metrics: PerformanceMetrics[] = [];
  private requestTimes: number[] = [];
  private errorCount = 0;
  private requestCount = 0;
  private startTime = Date.now();
  private alerts: PerformanceAlert[] = [];

  private readonly maxMetricsHistory = 1000;
  private readonly maxRequestTimesHistory = 10000;

  constructor(
    private cacheManager: CacheManager,
    private connectionPool: ConnectionPool,
    private thresholds: PerformanceThresholds
  ) {
    this.logger = new Logger('PerformanceMonitor');
    this.startPeriodicCollection();
  }

  // Request tracking
  recordRequest(
    responseTime: number,
    isError: boolean = false
  ): void {
    this.requestCount++;
    this.requestTimes.push(responseTime);

    if (isError) {
      this.errorCount++;
    }

    // Keep only recent request times for memory efficiency
    if (this.requestTimes.length > this.maxRequestTimesHistory) {
      this.requestTimes = this.requestTimes.slice(
        -this.maxRequestTimesHistory / 2
      );
    }
  }

  // Collect current performance metrics
  async collectMetrics(): Promise<PerformanceMetrics> {
    try {
      const now = Date.now();
      const uptime = now - this.startTime;

      // Calculate request metrics
      const averageResponseTime =
        this.requestTimes.length > 0
          ? this.requestTimes.reduce((sum, time) => sum + time, 0) /
            this.requestTimes.length
          : 0;

      const errorRate =
        this.requestCount > 0
          ? (this.errorCount / this.requestCount) * 100
          : 0;

      const throughput =
        uptime > 0
          ? (this.requestCount / uptime) * 1000 * 60 // requests per minute
          : 0;

      // Get memory usage
      const memoryUsage = process.memoryUsage();
      const totalMemory =
        memoryUsage.heapTotal + memoryUsage.external;
      const usedMemory = memoryUsage.heapUsed;

      // Get CPU usage (simplified)
      const cpuUsage = await this.getCpuUsage();

      // Get cache statistics
      const cacheStats = await this.cacheManager.getCacheStats();

      // Get database statistics
      const databaseStats = await this.connectionPool.getStats();

      const metrics: PerformanceMetrics = {
        timestamp: new Date(),
        requestCount: this.requestCount,
        averageResponseTime:
          Math.round(averageResponseTime * 100) / 100,
        errorRate: Math.round(errorRate * 100) / 100,
        throughput: Math.round(throughput * 100) / 100,
        memoryUsage: {
          used: usedMemory,
          total: totalMemory,
          percentage:
            Math.round((usedMemory / totalMemory) * 100 * 100) / 100,
        },
        cpuUsage: Math.round(cpuUsage * 100) / 100,
        cacheStats: {
          hitRate: cacheStats.hitRate || 0,
          missRate: cacheStats.missRate || 0,
          totalRequests: cacheStats.totalRequests || 0,
        },
        databaseStats: {
          activeConnections:
            databaseStats.totalConnections -
            databaseStats.idleConnections,
          averageQueryTime: databaseStats.averageQueryTime,
          slowQueries: databaseStats.slowQueries,
        },
      };

      // Store metrics
      this.metrics.push(metrics);
      if (this.metrics.length > this.maxMetricsHistory) {
        this.metrics = this.metrics.slice(
          -this.maxMetricsHistory / 2
        );
      }

      // Check for performance alerts
      this.checkAlerts(metrics);

      return metrics;
    } catch (error) {
      this.logger.error(
        'Error collecting performance metrics:',
        error
      );
      throw error;
    }
  }

  // Get historical metrics
  getMetrics(limit?: number): PerformanceMetrics[] {
    if (limit) {
      return this.metrics.slice(-limit);
    }
    return [...this.metrics];
  }

  // Get performance summary
  getPerformanceSummary(timeRange?: { start: Date; end: Date }): any {
    let relevantMetrics = this.metrics;

    if (timeRange) {
      relevantMetrics = this.metrics.filter(
        (m) =>
          m.timestamp >= timeRange.start &&
          m.timestamp <= timeRange.end
      );
    }

    if (relevantMetrics.length === 0) {
      return null;
    }

    const summary = {
      timeRange: {
        start: relevantMetrics[0].timestamp,
        end: relevantMetrics[relevantMetrics.length - 1].timestamp,
        duration:
          relevantMetrics[
            relevantMetrics.length - 1
          ].timestamp.getTime() -
          relevantMetrics[0].timestamp.getTime(),
      },
      requests: {
        total:
          relevantMetrics[relevantMetrics.length - 1].requestCount,
        averageResponseTime: this.calculateAverage(
          relevantMetrics.map((m) => m.averageResponseTime)
        ),
        maxResponseTime: Math.max(
          ...relevantMetrics.map((m) => m.averageResponseTime)
        ),
        minResponseTime: Math.min(
          ...relevantMetrics.map((m) => m.averageResponseTime)
        ),
        averageThroughput: this.calculateAverage(
          relevantMetrics.map((m) => m.throughput)
        ),
      },
      errors: {
        averageErrorRate: this.calculateAverage(
          relevantMetrics.map((m) => m.errorRate)
        ),
        maxErrorRate: Math.max(
          ...relevantMetrics.map((m) => m.errorRate)
        ),
      },
      resources: {
        averageMemoryUsage: this.calculateAverage(
          relevantMetrics.map((m) => m.memoryUsage.percentage)
        ),
        maxMemoryUsage: Math.max(
          ...relevantMetrics.map((m) => m.memoryUsage.percentage)
        ),
        averageCpuUsage: this.calculateAverage(
          relevantMetrics.map((m) => m.cpuUsage)
        ),
        maxCpuUsage: Math.max(
          ...relevantMetrics.map((m) => m.cpuUsage)
        ),
      },
      cache: {
        averageHitRate: this.calculateAverage(
          relevantMetrics.map((m) => m.cacheStats.hitRate)
        ),
        totalCacheRequests:
          relevantMetrics[relevantMetrics.length - 1].cacheStats
            .totalRequests,
      },
      database: {
        averageQueryTime: this.calculateAverage(
          relevantMetrics.map((m) => m.databaseStats.averageQueryTime)
        ),
        maxQueryTime: Math.max(
          ...relevantMetrics.map(
            (m) => m.databaseStats.averageQueryTime
          )
        ),
        totalSlowQueries:
          relevantMetrics[relevantMetrics.length - 1].databaseStats
            .slowQueries,
      },
    };

    return summary;
  }

  // Alert management
  private checkAlerts(metrics: PerformanceMetrics): void {
    const alerts: PerformanceAlert[] = [];

    // Response time alerts
    if (
      metrics.averageResponseTime >
      this.thresholds.responseTime.critical
    ) {
      alerts.push({
        type: 'high_response_time',
        severity: 'critical',
        message: `Critical response time: ${metrics.averageResponseTime}ms`,
        value: metrics.averageResponseTime,
        threshold: this.thresholds.responseTime.critical,
        timestamp: new Date(),
      });
    } else if (
      metrics.averageResponseTime >
      this.thresholds.responseTime.warning
    ) {
      alerts.push({
        type: 'high_response_time',
        severity: 'medium',
        message: `High response time: ${metrics.averageResponseTime}ms`,
        value: metrics.averageResponseTime,
        threshold: this.thresholds.responseTime.warning,
        timestamp: new Date(),
      });
    }

    // Error rate alerts
    if (metrics.errorRate > this.thresholds.errorRate.critical) {
      alerts.push({
        type: 'high_error_rate',
        severity: 'critical',
        message: `Critical error rate: ${metrics.errorRate}%`,
        value: metrics.errorRate,
        threshold: this.thresholds.errorRate.critical,
        timestamp: new Date(),
      });
    } else if (
      metrics.errorRate > this.thresholds.errorRate.warning
    ) {
      alerts.push({
        type: 'high_error_rate',
        severity: 'medium',
        message: `High error rate: ${metrics.errorRate}%`,
        value: metrics.errorRate,
        threshold: this.thresholds.errorRate.warning,
        timestamp: new Date(),
      });
    }

    // Cache hit rate alerts
    if (
      metrics.cacheStats.hitRate <
      this.thresholds.cacheHitRate.critical
    ) {
      alerts.push({
        type: 'low_cache_hit_rate',
        severity: 'critical',
        message: `Critical cache hit rate: ${metrics.cacheStats.hitRate}%`,
        value: metrics.cacheStats.hitRate,
        threshold: this.thresholds.cacheHitRate.critical,
        timestamp: new Date(),
      });
    } else if (
      metrics.cacheStats.hitRate <
      this.thresholds.cacheHitRate.warning
    ) {
      alerts.push({
        type: 'low_cache_hit_rate',
        severity: 'medium',
        message: `Low cache hit rate: ${metrics.cacheStats.hitRate}%`,
        value: metrics.cacheStats.hitRate,
        threshold: this.thresholds.cacheHitRate.warning,
        timestamp: new Date(),
      });
    }

    // Memory usage alerts
    if (
      metrics.memoryUsage.percentage >
      this.thresholds.memoryUsage.critical
    ) {
      alerts.push({
        type: 'high_memory_usage',
        severity: 'critical',
        message: `Critical memory usage: ${metrics.memoryUsage.percentage}%`,
        value: metrics.memoryUsage.percentage,
        threshold: this.thresholds.memoryUsage.critical,
        timestamp: new Date(),
      });
    } else if (
      metrics.memoryUsage.percentage >
      this.thresholds.memoryUsage.warning
    ) {
      alerts.push({
        type: 'high_memory_usage',
        severity: 'medium',
        message: `High memory usage: ${metrics.memoryUsage.percentage}%`,
        value: metrics.memoryUsage.percentage,
        threshold: this.thresholds.memoryUsage.warning,
        timestamp: new Date(),
      });
    }

    // Database query time alerts
    if (
      metrics.databaseStats.averageQueryTime >
      this.thresholds.databaseQueryTime.critical
    ) {
      alerts.push({
        type: 'database_slow',
        severity: 'critical',
        message: `Critical database query time: ${metrics.databaseStats.averageQueryTime}ms`,
        value: metrics.databaseStats.averageQueryTime,
        threshold: this.thresholds.databaseQueryTime.critical,
        timestamp: new Date(),
      });
    } else if (
      metrics.databaseStats.averageQueryTime >
      this.thresholds.databaseQueryTime.warning
    ) {
      alerts.push({
        type: 'database_slow',
        severity: 'medium',
        message: `Slow database queries: ${metrics.databaseStats.averageQueryTime}ms`,
        value: metrics.databaseStats.averageQueryTime,
        threshold: this.thresholds.databaseQueryTime.warning,
        timestamp: new Date(),
      });
    }

    // Store and log alerts
    if (alerts.length > 0) {
      this.alerts.push(...alerts);
      alerts.forEach((alert) => {
        this.logger.warn(
          `Performance Alert [${alert.severity}]: ${alert.message}`
        );
      });
    }
  }

  getAlerts(severity?: string): PerformanceAlert[] {
    if (severity) {
      return this.alerts.filter(
        (alert) => alert.severity === severity
      );
    }
    return [...this.alerts];
  }

  clearAlerts(): void {
    this.alerts = [];
  }

  // Performance optimization recommendations
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const latestMetrics = this.metrics[this.metrics.length - 1];

    if (!latestMetrics) {
      return recommendations;
    }

    if (latestMetrics.cacheStats.hitRate < 80) {
      recommendations.push(
        'Consider increasing cache TTL or warming cache with frequently accessed data'
      );
    }

    if (latestMetrics.databaseStats.averageQueryTime > 100) {
      recommendations.push(
        'Review database queries for optimization opportunities and consider adding indexes'
      );
    }

    if (latestMetrics.memoryUsage.percentage > 80) {
      recommendations.push(
        'Consider increasing memory allocation or implementing memory optimization strategies'
      );
    }

    if (latestMetrics.averageResponseTime > 2000) {
      recommendations.push(
        'Response times are high - consider horizontal scaling or performance optimization'
      );
    }

    if (latestMetrics.databaseStats.slowQueries > 10) {
      recommendations.push(
        'Multiple slow queries detected - review and optimize database queries'
      );
    }

    return recommendations;
  }

  // Utility methods
  private startPeriodicCollection(): void {
    setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        this.logger.error(
          'Error in periodic metrics collection:',
          error
        );
      }
    }, 60000); // Collect metrics every minute
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return Math.round((sum / values.length) * 100) / 100;
  }

  private async getCpuUsage(): Promise<number> {
    // Simplified CPU usage calculation
    // In production, you might want to use a more sophisticated method
    const startUsage = process.cpuUsage();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const endUsage = process.cpuUsage(startUsage);

    const totalUsage = endUsage.user + endUsage.system;
    const percentage = (totalUsage / 100000) * 100; // Convert to percentage

    return Math.min(percentage, 100); // Cap at 100%
  }

  // Reset statistics (useful for testing or periodic cleanup)
  resetStats(): void {
    this.requestTimes = [];
    this.errorCount = 0;
    this.requestCount = 0;
    this.startTime = Date.now();
    this.metrics = [];
    this.alerts = [];
    this.logger.info('Performance statistics reset');
  }
}
