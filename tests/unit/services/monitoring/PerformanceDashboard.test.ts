import {
  PerformanceDashboard,
  DashboardConfig,
} from '../../../../src/services/monitoring/PerformanceDashboard';
import { AlertingService } from '../../../../src/services/monitoring/AlertingService';
import {
  SystemMetrics,
  ApplicationMetrics,
  HealthStatus,
} from '../../../../src/services/monitoring/SystemHealthMonitor';
import { Logger } from '../../../../src/utils/Logger';

describe('PerformanceDashboard', () => {
  let performanceDashboard: PerformanceDashboard;
  let mockLogger: jest.Mocked<Logger>;
  let mockAlertingService: jest.Mocked<AlertingService>;
  let config: DashboardConfig;
  let mockSystemMetrics: SystemMetrics;
  let mockAppMetrics: ApplicationMetrics;
  let mockHealthStatus: HealthStatus;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    mockAlertingService = {
      getActiveAlerts: jest.fn().mockReturnValue([]),
      getAlertHistory: jest.fn().mockReturnValue([]),
    } as any;

    config = {
      refreshInterval: 5000,
      trendAnalysisPeriod: 60 * 60 * 1000, // 1 hour
      maxDataPoints: 1000,
    };

    mockSystemMetrics = {
      timestamp: new Date(),
      cpu: { usage: 45, loadAverage: [1.0, 1.1, 1.2] },
      memory: { used: 4096, total: 8192, usage: 50 },
      disk: { used: 2048, total: 10240, usage: 20 },
      network: {
        bytesIn: 1024,
        bytesOut: 512,
        packetsIn: 100,
        packetsOut: 80,
      },
      processes: { active: 50, total: 100 },
    };

    mockAppMetrics = {
      timestamp: new Date(),
      requests: {
        total: 1000,
        successful: 950,
        failed: 50,
        averageResponseTime: 200,
        requestsPerSecond: 10,
      },
      verification: {
        totalVerifications: 500,
        successfulVerifications: 475,
        failedVerifications: 25,
        averageProcessingTime: 1000,
        verificationsPerHour: 100,
      },
      database: {
        connections: { active: 5, idle: 15, total: 20 },
        queries: {
          total: 2000,
          successful: 1980,
          failed: 20,
          averageExecutionTime: 50,
        },
      },
      cache: {
        hits: 800,
        misses: 200,
        hitRate: 80,
        memoryUsage: 100 * 1024 * 1024,
      },
    };

    mockHealthStatus = {
      status: 'healthy',
      timestamp: new Date(),
      checks: [
        {
          name: 'cpu',
          status: 'pass',
          responseTime: 0,
          message: 'CPU usage normal',
        },
        {
          name: 'memory',
          status: 'pass',
          responseTime: 0,
          message: 'Memory usage normal',
        },
      ],
      overallScore: 95,
    };

    performanceDashboard = new PerformanceDashboard(
      mockLogger,
      config,
      mockAlertingService
    );
  });

  describe('updateMetrics', () => {
    it('should update dashboard metrics correctly', () => {
      performanceDashboard.updateMetrics(
        mockSystemMetrics,
        mockAppMetrics,
        mockHealthStatus
      );

      const snapshot = performanceDashboard.getCurrentSnapshot();

      expect(snapshot.metrics).toBeDefined();
      expect(snapshot.metrics?.timestamp).toBeInstanceOf(Date);
      expect(snapshot.metrics?.system.cpu).toBe(45);
      expect(snapshot.metrics?.system.memory).toBe(50);
      expect(snapshot.metrics?.application.requestsPerSecond).toBe(
        10
      );
      expect(snapshot.metrics?.application.errorRate).toBe(5); // 50/1000 * 100
      expect(snapshot.metrics?.health.overallScore).toBe(95);
      expect(snapshot.metrics?.health.status).toBe('healthy');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Dashboard metrics updated',
        expect.objectContaining({
          cpu: 45,
          memory: 50,
          requestsPerSecond: 10,
        })
      );
    });

    it('should calculate error rate correctly', () => {
      const customAppMetrics = {
        ...mockAppMetrics,
        requests: {
          total: 200,
          successful: 180,
          failed: 20,
          averageResponseTime: 300,
          requestsPerSecond: 5,
        },
      };

      performanceDashboard.updateMetrics(
        mockSystemMetrics,
        customAppMetrics,
        mockHealthStatus
      );

      const snapshot = performanceDashboard.getCurrentSnapshot();
      expect(snapshot.metrics?.application.errorRate).toBe(10); // 20/200 * 100
    });

    it('should calculate success rate correctly', () => {
      const customAppMetrics = {
        ...mockAppMetrics,
        verification: {
          totalVerifications: 100,
          successfulVerifications: 90,
          failedVerifications: 10,
          averageProcessingTime: 1200,
          verificationsPerHour: 50,
        },
      };

      performanceDashboard.updateMetrics(
        mockSystemMetrics,
        customAppMetrics,
        mockHealthStatus
      );

      const snapshot = performanceDashboard.getCurrentSnapshot();
      expect(snapshot.metrics?.application.successRate).toBe(90); // 90/100 * 100
    });
  });

  describe('getCurrentSnapshot', () => {
    it('should return null metrics when no data available', () => {
      const snapshot = performanceDashboard.getCurrentSnapshot();

      expect(snapshot.metrics).toBeNull();
      expect(snapshot.alerts).toEqual([]);
      expect(snapshot.trends).toEqual([]);
    });

    it('should return current metrics and alerts', () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          type: 'system_resource' as const,
          severity: 'warning' as const,
          title: 'High CPU',
          message: 'CPU usage is high',
          timestamp: new Date(),
          source: 'monitoring',
          details: {},
          status: 'active' as const,
        },
      ];

      mockAlertingService.getActiveAlerts.mockReturnValue(mockAlerts);

      performanceDashboard.updateMetrics(
        mockSystemMetrics,
        mockAppMetrics,
        mockHealthStatus
      );

      const snapshot = performanceDashboard.getCurrentSnapshot();

      expect(snapshot.metrics).toBeDefined();
      expect(snapshot.alerts).toEqual(mockAlerts);
      expect(snapshot.trends).toBeInstanceOf(Array);
    });
  });

  describe('getMetricsRange', () => {
    it('should return metrics within specified time range', () => {
      const startTime = new Date();

      performanceDashboard.updateMetrics(
        mockSystemMetrics,
        mockAppMetrics,
        mockHealthStatus
      );

      // Add a small delay and another metric
      const laterTime = new Date(Date.now() + 1000);
      const laterMetrics = {
        ...mockSystemMetrics,
        timestamp: laterTime,
      };
      performanceDashboard.updateMetrics(
        laterMetrics,
        mockAppMetrics,
        mockHealthStatus
      );

      const endTime = new Date(Date.now() + 2000);

      const rangeMetrics = performanceDashboard.getMetricsRange(
        startTime,
        endTime
      );

      expect(rangeMetrics).toBeInstanceOf(Array);
      expect(rangeMetrics.length).toBeGreaterThan(0);

      rangeMetrics.forEach((metric) => {
        expect(metric.timestamp.getTime()).toBeGreaterThanOrEqual(
          startTime.getTime()
        );
        expect(metric.timestamp.getTime()).toBeLessThanOrEqual(
          endTime.getTime()
        );
      });
    });

    it('should return empty array for time range with no metrics', () => {
      const startTime = new Date(Date.now() - 60000); // 1 minute ago
      const endTime = new Date(Date.now() - 30000); // 30 seconds ago

      const rangeMetrics = performanceDashboard.getMetricsRange(
        startTime,
        endTime
      );

      expect(rangeMetrics).toEqual([]);
    });
  });

  describe('getPerformanceSummary', () => {
    it('should return empty summary when no metrics available', () => {
      const summary = performanceDashboard.getPerformanceSummary();

      expect(summary.averages.cpu).toBe(0);
      expect(summary.averages.memory).toBe(0);
      expect(summary.peaks.maxCpu).toBe(0);
      expect(summary.availability).toBe(0);
      expect(summary.totalRequests).toBe(0);
    });

    it('should calculate performance summary correctly', () => {
      // Add multiple metrics to get meaningful averages
      performanceDashboard.updateMetrics(
        mockSystemMetrics,
        mockAppMetrics,
        mockHealthStatus
      );

      const higherMetrics = {
        ...mockSystemMetrics,
        cpu: { ...mockSystemMetrics.cpu, usage: 70 },
        memory: { ...mockSystemMetrics.memory, usage: 80 },
        timestamp: new Date(Date.now() + 1000),
      };

      const higherAppMetrics = {
        ...mockAppMetrics,
        requests: {
          ...mockAppMetrics.requests,
          averageResponseTime: 400,
        },
        timestamp: new Date(Date.now() + 1000),
      };

      performanceDashboard.updateMetrics(
        higherMetrics,
        higherAppMetrics,
        mockHealthStatus
      );

      const summary = performanceDashboard.getPerformanceSummary();

      expect(summary.averages.cpu).toBe(57.5); // (45 + 70) / 2
      expect(summary.averages.memory).toBe(65); // (50 + 80) / 2
      expect(summary.averages.responseTime).toBe(300); // (200 + 400) / 2
      expect(summary.peaks.maxCpu).toBe(70);
      expect(summary.peaks.maxMemory).toBe(80);
      expect(summary.peaks.maxResponseTime).toBe(400);
      expect(summary.availability).toBe(100); // All healthy
      expect(summary.totalRequests).toBeGreaterThan(0);
      expect(summary.totalVerifications).toBeGreaterThanOrEqual(0); // May be 0 due to small refresh interval
    });

    it('should calculate availability correctly with mixed health statuses', () => {
      // Add healthy metric
      performanceDashboard.updateMetrics(
        mockSystemMetrics,
        mockAppMetrics,
        mockHealthStatus
      );

      // Add unhealthy metric
      const unhealthyStatus = {
        ...mockHealthStatus,
        status: 'unhealthy' as const,
      };
      performanceDashboard.updateMetrics(
        mockSystemMetrics,
        mockAppMetrics,
        unhealthyStatus
      );

      const summary = performanceDashboard.getPerformanceSummary();

      expect(summary.availability).toBe(50); // 1 healthy out of 2 total
    });
  });

  describe('generatePerformanceReport', () => {
    it('should generate comprehensive performance report', () => {
      performanceDashboard.updateMetrics(
        mockSystemMetrics,
        mockAppMetrics,
        mockHealthStatus
      );

      const startTime = new Date(Date.now() - 60000);
      const endTime = new Date();

      const report = performanceDashboard.generatePerformanceReport(
        startTime,
        endTime,
        'json'
      );

      expect(report.period).toEqual({ startTime, endTime });
      expect(report.summary).toBeDefined();
      expect(report.trends).toBeInstanceOf(Array);
      expect(report.alerts).toBeDefined();
      expect(report.metrics).toBeInstanceOf(Array);
      expect(report.generatedAt).toBeInstanceOf(Date);
    });

    it('should generate summary format report', () => {
      performanceDashboard.updateMetrics(
        mockSystemMetrics,
        mockAppMetrics,
        mockHealthStatus
      );

      const startTime = new Date(Date.now() - 60000);
      const endTime = new Date();

      const report = performanceDashboard.generatePerformanceReport(
        startTime,
        endTime,
        'summary'
      );

      expect(report.period).toEqual({ startTime, endTime });
      expect(report.summary).toBeDefined();
      expect(report.alertSummary).toBeDefined();
      expect(report.keyTrends).toBeInstanceOf(Array);
      expect(report.keyTrends.length).toBeLessThanOrEqual(5);
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.metrics).toBeUndefined(); // Should not include full metrics in summary
    });
  });

  describe('getSystemStatus', () => {
    it('should return critical status when no metrics available', () => {
      const status = performanceDashboard.getSystemStatus();

      expect(status.status).toBe('critical');
      expect(status.uptime).toBe(0);
      expect(status.performance).toBe('poor');
      expect(status.activeIssues).toBe(0);
      expect(status.lastUpdated).toBeInstanceOf(Date);
    });

    it('should return correct system status with metrics', () => {
      performanceDashboard.updateMetrics(
        mockSystemMetrics,
        mockAppMetrics,
        mockHealthStatus
      );

      const status = performanceDashboard.getSystemStatus();

      expect(status.status).toBe('healthy');
      expect(status.uptime).toBeGreaterThan(0);
      expect(status.performance).toMatch(
        /^(excellent|good|fair|poor)$/
      );
      expect(status.activeIssues).toBe(0);
      expect(status.lastUpdated).toBeInstanceOf(Date);
    });

    it('should assess performance levels correctly', () => {
      // Test excellent performance
      const excellentMetrics = {
        ...mockSystemMetrics,
        cpu: { ...mockSystemMetrics.cpu, usage: 30 },
        memory: { ...mockSystemMetrics.memory, usage: 40 },
      };

      const excellentAppMetrics = {
        ...mockAppMetrics,
        requests: {
          ...mockAppMetrics.requests,
          averageResponseTime: 100,
          failed: 5,
        }, // Low error rate
      };

      performanceDashboard.updateMetrics(
        excellentMetrics,
        excellentAppMetrics,
        mockHealthStatus
      );

      const status = performanceDashboard.getSystemStatus();
      expect(status.performance).toBe('excellent');
    });
  });

  describe('trend calculation', () => {
    it('should calculate trends with sufficient data points', () => {
      // Add multiple data points to enable trend calculation
      for (let i = 0; i < 5; i++) {
        const metrics = {
          ...mockSystemMetrics,
          cpu: { ...mockSystemMetrics.cpu, usage: 40 + i * 5 }, // Increasing trend
          timestamp: new Date(Date.now() + i * 1000),
        };
        performanceDashboard.updateMetrics(
          metrics,
          mockAppMetrics,
          mockHealthStatus
        );
      }

      const snapshot = performanceDashboard.getCurrentSnapshot();

      expect(snapshot.trends).toBeInstanceOf(Array);
      expect(snapshot.trends.length).toBeGreaterThan(0);

      const cpuTrend = snapshot.trends.find(
        (t) => t.metric === 'CPU Usage'
      );
      expect(cpuTrend).toBeDefined();
      expect(cpuTrend?.trend).toMatch(/^(up|down|stable)$/);
      expect(cpuTrend?.changePercent).toBeDefined();
    });

    it('should return empty trends with insufficient data', () => {
      performanceDashboard.updateMetrics(
        mockSystemMetrics,
        mockAppMetrics,
        mockHealthStatus
      );

      const snapshot = performanceDashboard.getCurrentSnapshot();

      expect(snapshot.trends).toEqual([]);
    });
  });

  describe('data cleanup', () => {
    it('should limit metrics history to maxDataPoints', () => {
      const smallConfig = { ...config, maxDataPoints: 3 };
      const smallDashboard = new PerformanceDashboard(
        mockLogger,
        smallConfig,
        mockAlertingService
      );

      // Add more metrics than the limit
      for (let i = 0; i < 5; i++) {
        const metrics = {
          ...mockSystemMetrics,
          timestamp: new Date(Date.now() + i * 1000),
        };
        smallDashboard.updateMetrics(
          metrics,
          mockAppMetrics,
          mockHealthStatus
        );
      }

      const allMetrics = smallDashboard.getMetricsRange(
        new Date(0),
        new Date(Date.now() + 10000)
      );

      expect(allMetrics.length).toBeLessThanOrEqual(3);
    });
  });
});
