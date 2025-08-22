import {
  SystemHealthMonitor,
  MonitoringConfig,
} from '../../../../src/services/monitoring/SystemHealthMonitor';
import { Logger } from '../../../../src/utils/Logger';

describe('SystemHealthMonitor', () => {
  let systemHealthMonitor: SystemHealthMonitor;
  let mockLogger: jest.Mocked<Logger>;
  let config: MonitoringConfig;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    config = {
      metricsCollectionInterval: 1000,
      healthCheckInterval: 5000,
      alertThresholds: {
        cpu: { warning: 70, critical: 90 },
        memory: { warning: 80, critical: 95 },
        disk: { warning: 85, critical: 95 },
        responseTime: { warning: 1000, critical: 2000 },
        errorRate: { warning: 5, critical: 10 },
      },
      retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
    };

    systemHealthMonitor = new SystemHealthMonitor(mockLogger, config);
  });

  afterEach(() => {
    systemHealthMonitor.shutdown();
  });

  describe('collectMetrics', () => {
    it('should collect system and application metrics', async () => {
      await systemHealthMonitor.collectMetrics();

      const { system, application } =
        systemHealthMonitor.getCurrentMetrics();

      expect(system).toBeDefined();
      expect(system?.cpu).toBeDefined();
      expect(system?.memory).toBeDefined();
      expect(system?.disk).toBeDefined();
      expect(system?.network).toBeDefined();

      expect(application).toBeDefined();
      expect(application?.requests).toBeDefined();
      expect(application?.verification).toBeDefined();
      expect(application?.database).toBeDefined();
      expect(application?.cache).toBeDefined();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Collected system metrics',
        expect.objectContaining({
          cpu: expect.any(Number),
          memory: expect.any(Number),
          requests: expect.any(Number),
        })
      );
    });

    it('should handle metrics collection errors gracefully', async () => {
      // Mock an error in metrics collection
      jest
        .spyOn(systemHealthMonitor as any, 'collectSystemMetrics')
        .mockRejectedValue(new Error('Metrics collection failed'));

      // This should not throw
      await expect(
        systemHealthMonitor.collectMetrics()
      ).resolves.toBeUndefined();
    });
  });

  describe('performHealthChecks', () => {
    it('should perform comprehensive health checks', async () => {
      const healthStatus =
        await systemHealthMonitor.performHealthChecks();

      expect(healthStatus).toBeDefined();
      expect(healthStatus.status).toMatch(
        /^(healthy|degraded|unhealthy|critical)$/
      );
      expect(healthStatus.timestamp).toBeInstanceOf(Date);
      expect(healthStatus.checks).toBeInstanceOf(Array);
      expect(healthStatus.overallScore).toBeGreaterThanOrEqual(0);
      expect(healthStatus.overallScore).toBeLessThanOrEqual(100);

      // Should have all expected health checks
      const checkNames = healthStatus.checks.map((c) => c.name);
      expect(checkNames).toContain('cpu');
      expect(checkNames).toContain('memory');
      expect(checkNames).toContain('disk');
      expect(checkNames).toContain('database');
      expect(checkNames).toContain('cache');
      expect(checkNames).toContain('api');
      expect(checkNames).toContain('external_services');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Health check completed',
        expect.objectContaining({
          status: healthStatus.status,
          score: healthStatus.overallScore,
          failedChecks: expect.any(Number),
        })
      );
    });

    it('should detect critical CPU usage', async () => {
      // Mock high CPU usage
      jest
        .spyOn(systemHealthMonitor as any, 'collectSystemMetrics')
        .mockResolvedValue({
          timestamp: new Date(),
          cpu: { usage: 95, loadAverage: [2.0, 2.1, 2.2] },
          memory: { used: 1024, total: 8192, usage: 12.5 },
          disk: { used: 1024, total: 10240, usage: 10 },
          network: {
            bytesIn: 1024,
            bytesOut: 512,
            packetsIn: 100,
            packetsOut: 80,
          },
          processes: { active: 50, total: 100 },
        });

      const healthStatus =
        await systemHealthMonitor.performHealthChecks();
      const cpuCheck = healthStatus.checks.find(
        (c) => c.name === 'cpu'
      );

      expect(cpuCheck).toBeDefined();
      expect(cpuCheck?.status).toBe('fail');
      expect(cpuCheck?.message).toContain('CPU usage critical');
    });

    it('should detect warning-level memory usage', async () => {
      // Mock high memory usage
      jest
        .spyOn(systemHealthMonitor as any, 'collectSystemMetrics')
        .mockResolvedValue({
          timestamp: new Date(),
          cpu: { usage: 50, loadAverage: [1.0, 1.1, 1.2] },
          memory: { used: 6144, total: 8192, usage: 85 }, // Above warning threshold of 80
          disk: { used: 1024, total: 10240, usage: 10 },
          network: {
            bytesIn: 1024,
            bytesOut: 512,
            packetsIn: 100,
            packetsOut: 80,
          },
          processes: { active: 50, total: 100 },
        });

      const healthStatus =
        await systemHealthMonitor.performHealthChecks();
      const memoryCheck = healthStatus.checks.find(
        (c) => c.name === 'memory'
      );

      expect(memoryCheck).toBeDefined();
      expect(memoryCheck?.status).toBe('warn');
      expect(memoryCheck?.message).toContain('Memory usage high');
    });
  });

  describe('getCurrentMetrics', () => {
    it('should return null when no metrics collected', () => {
      const { system, application } =
        systemHealthMonitor.getCurrentMetrics();

      expect(system).toBeNull();
      expect(application).toBeNull();
    });

    it('should return latest metrics after collection', async () => {
      await systemHealthMonitor.collectMetrics();

      const { system, application } =
        systemHealthMonitor.getCurrentMetrics();

      expect(system).not.toBeNull();
      expect(application).not.toBeNull();
      expect(system?.timestamp).toBeInstanceOf(Date);
      expect(application?.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('getCurrentHealth', () => {
    it('should return null when no health checks performed', () => {
      const health = systemHealthMonitor.getCurrentHealth();
      expect(health).toBeNull();
    });

    it('should return latest health status after check', async () => {
      await systemHealthMonitor.performHealthChecks();

      const health = systemHealthMonitor.getCurrentHealth();

      expect(health).not.toBeNull();
      expect(health?.timestamp).toBeInstanceOf(Date);
      expect(health?.status).toBeDefined();
      expect(health?.overallScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getMetricsHistory', () => {
    it('should return metrics within specified time range', async () => {
      const startTime = new Date();

      // Collect some metrics
      await systemHealthMonitor.collectMetrics();
      await new Promise((resolve) => setTimeout(resolve, 10));
      await systemHealthMonitor.collectMetrics();

      const endTime = new Date();

      const history = systemHealthMonitor.getMetricsHistory(
        startTime,
        endTime
      );

      expect(history.system).toBeInstanceOf(Array);
      expect(history.application).toBeInstanceOf(Array);
      expect(history.system.length).toBeGreaterThan(0);
      expect(history.application.length).toBeGreaterThan(0);

      // All metrics should be within the time range
      history.system.forEach((metric) => {
        expect(metric.timestamp.getTime()).toBeGreaterThanOrEqual(
          startTime.getTime()
        );
        expect(metric.timestamp.getTime()).toBeLessThanOrEqual(
          endTime.getTime()
        );
      });
    });

    it('should return empty arrays for time range with no metrics', () => {
      const startTime = new Date(Date.now() - 60000); // 1 minute ago
      const endTime = new Date(Date.now() - 30000); // 30 seconds ago

      const history = systemHealthMonitor.getMetricsHistory(
        startTime,
        endTime
      );

      expect(history.system).toEqual([]);
      expect(history.application).toEqual([]);
    });
  });

  describe('getHealthHistory', () => {
    it('should return health checks within specified time range', async () => {
      const startTime = new Date();

      // Perform some health checks
      await systemHealthMonitor.performHealthChecks();
      await new Promise((resolve) => setTimeout(resolve, 10));
      await systemHealthMonitor.performHealthChecks();

      const endTime = new Date();

      const history = systemHealthMonitor.getHealthHistory(
        startTime,
        endTime
      );

      expect(history).toBeInstanceOf(Array);
      expect(history.length).toBeGreaterThan(0);

      // All health checks should be within the time range
      history.forEach((health) => {
        expect(health.timestamp.getTime()).toBeGreaterThanOrEqual(
          startTime.getTime()
        );
        expect(health.timestamp.getTime()).toBeLessThanOrEqual(
          endTime.getTime()
        );
      });
    });
  });

  describe('shutdown', () => {
    it('should clear timers on shutdown', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      systemHealthMonitor.shutdown();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });
});
