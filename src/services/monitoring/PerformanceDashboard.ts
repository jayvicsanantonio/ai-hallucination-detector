import { Logger } from '../../utils/Logger';
import {
  SystemMetrics,
  ApplicationMetrics,
  HealthStatus,
} from './SystemHealthMonitor';
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
  refreshInterval: number; // milliseconds
  trendAnalysisPeriod: number; // milliseconds
  maxDataPoints: number;
}

export class PerformanceDashboard {
  private logger: Logger;
  private config: DashboardConfig;
  private metricsHistory: DashboardMetrics[] = [];
  private alertingService: AlertingService;

  constructor(
    logger: Logger,
    config: DashboardConfig,
    alertingService: AlertingService
  ) {
    this.logger = logger;
    this.config = config;
    this.alertingService = alertingService;
  }

  /**
   * Update dashboard with new metrics
   */
  updateMetrics(
    systemMetrics: SystemMetrics,
    appMetrics: ApplicationMetrics,
    healthStatus: HealthStatus
  ): void {
    const dashboardMetrics: DashboardMetrics = {
      timestamp: new Date(),
      system: {
        cpu: systemMetrics.cpu.usage,
        memory: systemMetrics.memory.usage,
        disk: systemMetrics.disk.usage,
        network: {
          bytesIn: systemMetrics.network.bytesIn,
          bytesOut: systemMetrics.network.bytesOut,
        },
      },
      application: {
        requestsPerSecond: appMetrics.requests.requestsPerSecond,
        averageResponseTime: appMetrics.requests.averageResponseTime,
        errorRate:
          (appMetrics.requests.failed / appMetrics.requests.total) *
          100,
        verificationsPerHour:
          appMetrics.verification.verificationsPerHour,
        successRate:
          (appMetrics.verification.successfulVerifications /
            appMetrics.verification.totalVerifications) *
          100,
      },
      database: {
        connections: appMetrics.database.connections.active,
        queryTime: appMetrics.database.queries.averageExecutionTime,
        querySuccessRate:
          (appMetrics.database.queries.successful /
            appMetrics.database.queries.total) *
          100,
      },
      cache: {
        hitRate: appMetrics.cache.hitRate,
        memoryUsage: appMetrics.cache.memoryUsage,
      },
      health: {
        overallScore: healthStatus.overallScore,
        status: healthStatus.status,
        failedChecks: healthStatus.checks.filter(
          (c) => c.status === 'fail'
        ).length,
      },
    };

    this.metricsHistory.push(dashboardMetrics);
    this.cleanupOldMetrics();

    this.logger.debug('Dashboard metrics updated', {
      cpu: dashboardMetrics.system.cpu,
      memory: dashboardMetrics.system.memory,
      requestsPerSecond:
        dashboardMetrics.application.requestsPerSecond,
    });
  }

  /**
   * Get current dashboard snapshot
   */
  getCurrentSnapshot(): {
    metrics: DashboardMetrics | null;
    alerts: Alert[];
    trends: PerformanceTrend[];
  } {
    const currentMetrics =
      this.metricsHistory[this.metricsHistory.length - 1] || null;
    const activeAlerts = this.alertingService.getActiveAlerts();
    const trends = this.calculateTrends();

    return {
      metrics: currentMetrics,
      alerts: activeAlerts,
      trends,
    };
  }

  /**
   * Get metrics for a specific time range
   */
  getMetricsRange(
    startTime: Date,
    endTime: Date
  ): DashboardMetrics[] {
    return this.metricsHistory.filter(
      (m) => m.timestamp >= startTime && m.timestamp <= endTime
    );
  }

  /**
   * Get performance summary for a time period
   */
  getPerformanceSummary(period: number = 24 * 60 * 60 * 1000): {
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
  } {
    const cutoffTime = new Date(Date.now() - period);
    const periodMetrics = this.metricsHistory.filter(
      (m) => m.timestamp > cutoffTime
    );

    if (periodMetrics.length === 0) {
      return this.getEmptyPerformanceSummary();
    }

    const averages = {
      cpu: this.calculateAverage(periodMetrics, (m) => m.system.cpu),
      memory: this.calculateAverage(
        periodMetrics,
        (m) => m.system.memory
      ),
      responseTime: this.calculateAverage(
        periodMetrics,
        (m) => m.application.averageResponseTime
      ),
      errorRate: this.calculateAverage(
        periodMetrics,
        (m) => m.application.errorRate
      ),
      successRate: this.calculateAverage(
        periodMetrics,
        (m) => m.application.successRate
      ),
    };

    const peaks = {
      maxCpu: Math.max(...periodMetrics.map((m) => m.system.cpu)),
      maxMemory: Math.max(
        ...periodMetrics.map((m) => m.system.memory)
      ),
      maxResponseTime: Math.max(
        ...periodMetrics.map((m) => m.application.averageResponseTime)
      ),
      maxErrorRate: Math.max(
        ...periodMetrics.map((m) => m.application.errorRate)
      ),
    };

    const healthyPeriods = periodMetrics.filter(
      (m) =>
        m.health.status === 'healthy' ||
        m.health.status === 'degraded'
    );
    const availability =
      (healthyPeriods.length / periodMetrics.length) * 100;

    // Estimate totals (simplified calculation)
    const totalRequests = periodMetrics.reduce(
      (sum, m) =>
        sum +
        m.application.requestsPerSecond *
          (this.config.refreshInterval / 1000),
      0
    );

    const totalVerifications = periodMetrics.reduce(
      (sum, m) =>
        sum +
        m.application.verificationsPerHour *
          (this.config.refreshInterval / (60 * 60 * 1000)),
      0
    );

    return {
      averages,
      peaks,
      availability,
      totalRequests: Math.round(totalRequests),
      totalVerifications: Math.round(totalVerifications),
    };
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(
    startTime: Date,
    endTime: Date,
    format: 'json' | 'summary' = 'json'
  ): any {
    const metrics = this.getMetricsRange(startTime, endTime);
    const period = endTime.getTime() - startTime.getTime();
    const summary = this.getPerformanceSummary(period);
    const alerts = this.alertingService.getAlertHistory(
      startTime,
      endTime
    );
    const trends = this.calculateTrendsForPeriod(startTime, endTime);

    const report = {
      period: { startTime, endTime },
      summary,
      trends,
      alerts: {
        total: alerts.length,
        bySeverity: this.groupAlertsBySeverity(alerts),
        byType: this.groupAlertsByType(alerts),
      },
      metrics: format === 'json' ? metrics : undefined,
      generatedAt: new Date(),
    };

    if (format === 'summary') {
      return {
        period: report.period,
        summary: report.summary,
        alertSummary: report.alerts,
        keyTrends: trends.slice(0, 5), // Top 5 trends
        generatedAt: report.generatedAt,
      };
    }

    return report;
  }

  /**
   * Get system status overview
   */
  getSystemStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
    uptime: number; // percentage
    performance: 'excellent' | 'good' | 'fair' | 'poor';
    activeIssues: number;
    lastUpdated: Date;
  } {
    const currentMetrics =
      this.metricsHistory[this.metricsHistory.length - 1];
    const activeAlerts = this.alertingService.getActiveAlerts();
    const summary = this.getPerformanceSummary();

    if (!currentMetrics) {
      return {
        status: 'critical',
        uptime: 0,
        performance: 'poor',
        activeIssues: activeAlerts.length,
        lastUpdated: new Date(),
      };
    }

    const performance = this.assessPerformance(summary.averages);

    return {
      status: currentMetrics.health.status as any,
      uptime: summary.availability,
      performance,
      activeIssues: activeAlerts.length,
      lastUpdated: currentMetrics.timestamp,
    };
  }

  private calculateTrends(): PerformanceTrend[] {
    const trendPeriod = this.config.trendAnalysisPeriod;
    const cutoffTime = new Date(Date.now() - trendPeriod);
    const trendMetrics = this.metricsHistory.filter(
      (m) => m.timestamp > cutoffTime
    );

    if (trendMetrics.length < 2) {
      return [];
    }

    const trends: PerformanceTrend[] = [];

    // CPU trend
    trends.push(
      this.calculateMetricTrend(
        'CPU Usage',
        'system.cpu',
        trendMetrics,
        (m) => m.system.cpu
      )
    );

    // Memory trend
    trends.push(
      this.calculateMetricTrend(
        'Memory Usage',
        'system.memory',
        trendMetrics,
        (m) => m.system.memory
      )
    );

    // Response time trend
    trends.push(
      this.calculateMetricTrend(
        'Response Time',
        'application.responseTime',
        trendMetrics,
        (m) => m.application.averageResponseTime
      )
    );

    // Error rate trend
    trends.push(
      this.calculateMetricTrend(
        'Error Rate',
        'application.errorRate',
        trendMetrics,
        (m) => m.application.errorRate
      )
    );

    return trends;
  }

  private calculateTrendsForPeriod(
    startTime: Date,
    endTime: Date
  ): PerformanceTrend[] {
    const periodMetrics = this.metricsHistory.filter(
      (m) => m.timestamp >= startTime && m.timestamp <= endTime
    );

    if (periodMetrics.length < 2) {
      return [];
    }

    return [
      this.calculateMetricTrend(
        'CPU Usage',
        'system.cpu',
        periodMetrics,
        (m) => m.system.cpu
      ),
      this.calculateMetricTrend(
        'Memory Usage',
        'system.memory',
        periodMetrics,
        (m) => m.system.memory
      ),
      this.calculateMetricTrend(
        'Response Time',
        'application.responseTime',
        periodMetrics,
        (m) => m.application.averageResponseTime
      ),
      this.calculateMetricTrend(
        'Error Rate',
        'application.errorRate',
        periodMetrics,
        (m) => m.application.errorRate
      ),
    ];
  }

  private calculateMetricTrend(
    name: string,
    metric: string,
    data: DashboardMetrics[],
    extractor: (m: DashboardMetrics) => number
  ): PerformanceTrend {
    const values = data.map((m) => ({
      timestamp: m.timestamp,
      value: extractor(m),
    }));

    const firstValue = values[0].value;
    const lastValue = values[values.length - 1].value;
    const changePercent =
      ((lastValue - firstValue) / firstValue) * 100;

    let trend: 'up' | 'down' | 'stable';
    if (Math.abs(changePercent) < 5) {
      trend = 'stable';
    } else if (changePercent > 0) {
      trend = 'up';
    } else {
      trend = 'down';
    }

    return {
      metric: name,
      timeframe: `${Math.round(
        (data[data.length - 1].timestamp.getTime() -
          data[0].timestamp.getTime()) /
          (60 * 1000)
      )} minutes`,
      data: values,
      trend,
      changePercent: Math.round(changePercent * 100) / 100,
    };
  }

  private calculateAverage(
    data: DashboardMetrics[],
    extractor: (m: DashboardMetrics) => number
  ): number {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, m) => acc + extractor(m), 0);
    return Math.round((sum / data.length) * 100) / 100;
  }

  private assessPerformance(
    averages: any
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    const score =
      (averages.cpu < 50
        ? 25
        : averages.cpu < 70
        ? 15
        : averages.cpu < 85
        ? 10
        : 0) +
      (averages.memory < 60
        ? 25
        : averages.memory < 75
        ? 15
        : averages.memory < 90
        ? 10
        : 0) +
      (averages.responseTime < 200
        ? 25
        : averages.responseTime < 500
        ? 15
        : averages.responseTime < 1000
        ? 10
        : 0) +
      (averages.errorRate < 1
        ? 25
        : averages.errorRate < 3
        ? 15
        : averages.errorRate < 5
        ? 10
        : 0);

    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
  }

  private groupAlertsBySeverity(
    alerts: Alert[]
  ): Record<string, number> {
    return alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupAlertsByType(alerts: Alert[]): Record<string, number> {
    return alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private getEmptyPerformanceSummary() {
    return {
      averages: {
        cpu: 0,
        memory: 0,
        responseTime: 0,
        errorRate: 0,
        successRate: 0,
      },
      peaks: {
        maxCpu: 0,
        maxMemory: 0,
        maxResponseTime: 0,
        maxErrorRate: 0,
      },
      availability: 0,
      totalRequests: 0,
      totalVerifications: 0,
    };
  }

  private cleanupOldMetrics(): void {
    if (this.metricsHistory.length > this.config.maxDataPoints) {
      this.metricsHistory = this.metricsHistory.slice(
        -this.config.maxDataPoints
      );
    }
  }
}
