import { PerformanceMonitor } from '../../src/services/performance/PerformanceMonitor';
import { CacheManager } from '../../src/services/cache/CacheManager';
import { ConnectionPool } from '../../src/database/ConnectionPool';

describe('System Performance Tests', () => {
  let performanceMonitor: PerformanceMonitor;
  let cacheManager: CacheManager;
  let connectionPool: ConnectionPool;

  const mockCacheConfig = {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    },
    ttl: {
      verificationResults: 3600,
      parsedContent: 1800,
      knowledgeBase: 7200,
      complianceRules: 14400,
      userSessions: 1800,
    },
    enabled: true,
  };

  const mockDbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'certaintyai_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: false,
    pool: {
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    },
  };

  const performanceThresholds = {
    responseTime: {
      warning: 2000,
      critical: 5000,
    },
    errorRate: {
      warning: 5,
      critical: 10,
    },
    cacheHitRate: {
      warning: 70,
      critical: 50,
    },
    memoryUsage: {
      warning: 80,
      critical: 90,
    },
    databaseQueryTime: {
      warning: 100,
      critical: 500,
    },
  };

  beforeAll(async () => {
    cacheManager = new CacheManager(mockCacheConfig);
    await cacheManager.initialize();

    connectionPool = new ConnectionPool(mockDbConfig);
    await connectionPool.initialize();

    performanceMonitor = new PerformanceMonitor(
      cacheManager,
      connectionPool,
      performanceThresholds
    );
  });

  afterAll(async () => {
    await cacheManager.shutdown();
    await connectionPool.shutdown();
  });

  beforeEach(() => {
    performanceMonitor.resetStats();
  });

  describe('Request Performance Tracking', () => {
    it('should track request performance accurately', async () => {
      // Simulate various request response times
      const requestTimes = [100, 150, 200, 300, 250];

      requestTimes.forEach((time) => {
        performanceMonitor.recordRequest(time, false);
      });

      const metrics = await performanceMonitor.collectMetrics();

      expect(metrics.requestCount).toBe(requestTimes.length);
      expect(metrics.averageResponseTime).toBeCloseTo(200, 0); // Average of test times
      expect(metrics.errorRate).toBe(0);
      expect(metrics.throughput).toBeGreaterThan(0);
    });

    it('should calculate error rates correctly', async () => {
      // Simulate requests with some errors
      performanceMonitor.recordRequest(100, false); // success
      performanceMonitor.recordRequest(150, true); // error
      performanceMonitor.recordRequest(200, false); // success
      performanceMonitor.recordRequest(250, true); // error
      performanceMonitor.recordRequest(300, false); // success

      const metrics = await performanceMonitor.collectMetrics();

      expect(metrics.requestCount).toBe(5);
      expect(metrics.errorRate).toBe(40); // 2 errors out of 5 requests = 40%
    });

    it('should calculate throughput based on time window', async () => {
      const startTime = Date.now();

      // Simulate 10 requests over a short period
      for (let i = 0; i < 10; i++) {
        performanceMonitor.recordRequest(100, false);
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      const metrics = await performanceMonitor.collectMetrics();
      const elapsedTime = Date.now() - startTime;

      expect(metrics.throughput).toBeGreaterThan(0);
      expect(metrics.requestCount).toBe(10);

      // Throughput should be reasonable (requests per minute)
      const expectedThroughput = (10 / elapsedTime) * 1000 * 60;
      expect(metrics.throughput).toBeCloseTo(expectedThroughput, -1);
    });
  });

  describe('Resource Monitoring', () => {
    it('should monitor memory usage accurately', async () => {
      const metrics = await performanceMonitor.collectMetrics();

      expect(metrics.memoryUsage.used).toBeGreaterThan(0);
      expect(metrics.memoryUsage.total).toBeGreaterThan(0);
      expect(metrics.memoryUsage.percentage).toBeGreaterThan(0);
      expect(metrics.memoryUsage.percentage).toBeLessThanOrEqual(100);
    });

    it('should monitor CPU usage', async () => {
      const metrics = await performanceMonitor.collectMetrics();

      expect(metrics.cpuUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.cpuUsage).toBeLessThanOrEqual(100);
    });

    it('should integrate cache statistics', async () => {
      // Generate some cache activity
      await cacheManager.cacheVerificationResult('test-1', {
        test: 'data1',
      } as any);
      await cacheManager.cacheVerificationResult('test-2', {
        test: 'data2',
      } as any);
      await cacheManager.getVerificationResult('test-1'); // hit
      await cacheManager.getVerificationResult('test-3'); // miss

      const metrics = await performanceMonitor.collectMetrics();

      expect(metrics.cacheStats.totalRequests).toBeGreaterThan(0);
      expect(metrics.cacheStats.hitRate).toBeGreaterThanOrEqual(0);
      expect(metrics.cacheStats.missRate).toBeGreaterThanOrEqual(0);
    });

    it('should integrate database statistics', async () => {
      // Generate some database activity
      await connectionPool.query('SELECT 1');
      await connectionPool.query('SELECT 2');

      const metrics = await performanceMonitor.collectMetrics();

      expect(
        metrics.databaseStats.activeConnections
      ).toBeGreaterThanOrEqual(0);
      expect(
        metrics.databaseStats.averageQueryTime
      ).toBeGreaterThanOrEqual(0);
      expect(
        metrics.databaseStats.slowQueries
      ).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Alerts', () => {
    it('should generate alerts for high response times', async () => {
      // Simulate high response times
      performanceMonitor.recordRequest(6000, false); // Above critical threshold

      const metrics = await performanceMonitor.collectMetrics();
      const alerts = performanceMonitor.getAlerts();

      expect(metrics.averageResponseTime).toBeGreaterThan(
        performanceThresholds.responseTime.critical
      );
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe('high_response_time');
      expect(alerts[0].severity).toBe('critical');
    });

    it('should generate alerts for high error rates', async () => {
      // Simulate high error rate
      for (let i = 0; i < 10; i++) {
        performanceMonitor.recordRequest(100, i < 8); // 80% error rate
      }

      const metrics = await performanceMonitor.collectMetrics();
      const alerts = performanceMonitor.getAlerts();

      expect(metrics.errorRate).toBeGreaterThan(
        performanceThresholds.errorRate.critical
      );
      expect(
        alerts.some((alert) => alert.type === 'high_error_rate')
      ).toBe(true);
    });

    it('should filter alerts by severity', async () => {
      // Generate different severity alerts
      performanceMonitor.recordRequest(3000, false); // Warning level response time
      performanceMonitor.recordRequest(6000, false); // Critical level response time

      await performanceMonitor.collectMetrics();

      const criticalAlerts = performanceMonitor.getAlerts('critical');
      const allAlerts = performanceMonitor.getAlerts();

      expect(criticalAlerts.length).toBeGreaterThan(0);
      expect(allAlerts.length).toBeGreaterThanOrEqual(
        criticalAlerts.length
      );
    });
  });

  describe('Performance Analysis', () => {
    it('should provide performance summary over time range', async () => {
      // Generate metrics over time
      for (let i = 0; i < 5; i++) {
        performanceMonitor.recordRequest(100 + i * 50, false);
        await performanceMonitor.collectMetrics();
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const summary = performanceMonitor.getPerformanceSummary();

      expect(summary).toBeDefined();
      expect(summary.requests.total).toBe(5);
      expect(summary.requests.averageResponseTime).toBeGreaterThan(0);
      expect(summary.requests.maxResponseTime).toBeGreaterThan(0);
      expect(summary.requests.minResponseTime).toBeGreaterThan(0);
    });

    it('should provide optimization recommendations', async () => {
      // Simulate poor performance conditions
      performanceMonitor.recordRequest(3000, false); // High response time

      // Generate low cache hit rate by missing cache
      await cacheManager.getVerificationResult('non-existent-1');
      await cacheManager.getVerificationResult('non-existent-2');
      await cacheManager.getVerificationResult('non-existent-3');

      await performanceMonitor.collectMetrics();

      const recommendations =
        performanceMonitor.getOptimizationRecommendations();

      expect(recommendations.length).toBeGreaterThan(0);
      expect(
        recommendations.some((rec) => rec.includes('cache'))
      ).toBe(true);
    });

    it('should track metrics history efficiently', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Generate many metrics to test memory efficiency
      for (let i = 0; i < 100; i++) {
        performanceMonitor.recordRequest(
          100 + Math.random() * 100,
          Math.random() < 0.1
        );
        await performanceMonitor.collectMetrics();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      const metrics = performanceMonitor.getMetrics();

      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics.length).toBeLessThanOrEqual(100);

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
    });
  });

  describe('System Load Testing', () => {
    it('should maintain performance under concurrent load', async () => {
      const concurrentRequests = 50;
      const requestsPerThread = 10;

      const startTime = Date.now();

      const promises = Array.from(
        { length: concurrentRequests },
        async () => {
          for (let i = 0; i < requestsPerThread; i++) {
            const responseTime = 50 + Math.random() * 100;
            performanceMonitor.recordRequest(
              responseTime,
              Math.random() < 0.05
            );

            // Simulate some cache and database activity
            await cacheManager.cacheVerificationResult(
              `load-test-${i}`,
              { data: i } as any
            );
            await connectionPool.query('SELECT $1', [i]);
          }
        }
      );

      await Promise.all(promises);

      const totalTime = Date.now() - startTime;
      const metrics = await performanceMonitor.collectMetrics();

      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(metrics.requestCount).toBe(
        concurrentRequests * requestsPerThread
      );
      expect(metrics.averageResponseTime).toBeLessThan(1000); // Reasonable response time
    });

    it('should handle memory pressure gracefully', async () => {
      const initialMetrics =
        await performanceMonitor.collectMetrics();

      // Create memory pressure by caching large amounts of data
      const largeDataPromises = Array.from(
        { length: 100 },
        (_, i) => {
          const largeData = {
            id: i,
            content: 'x'.repeat(10000), // 10KB per item
            metadata: { timestamp: Date.now(), index: i },
          };
          return cacheManager.cacheVerificationResult(
            `memory-test-${i}`,
            largeData as any
          );
        }
      );

      await Promise.all(largeDataPromises);

      const finalMetrics = await performanceMonitor.collectMetrics();

      // System should still be responsive
      expect(finalMetrics.memoryUsage.percentage).toBeGreaterThan(
        initialMetrics.memoryUsage.percentage
      );

      // Performance should not degrade significantly
      const alerts = performanceMonitor.getAlerts('critical');
      const memoryAlerts = alerts.filter(
        (alert) => alert.type === 'high_memory_usage'
      );

      // May have memory alerts, but system should still function
      expect(finalMetrics.timestamp).toBeDefined();
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance degradation over time', async () => {
      // Simulate baseline performance
      for (let i = 0; i < 10; i++) {
        performanceMonitor.recordRequest(100, false);
      }
      const baselineMetrics =
        await performanceMonitor.collectMetrics();

      // Simulate performance degradation
      for (let i = 0; i < 10; i++) {
        performanceMonitor.recordRequest(500, false); // 5x slower
      }
      const degradedMetrics =
        await performanceMonitor.collectMetrics();

      expect(degradedMetrics.averageResponseTime).toBeGreaterThan(
        baselineMetrics.averageResponseTime * 2
      );

      const alerts = performanceMonitor.getAlerts();
      expect(
        alerts.some((alert) => alert.type === 'high_response_time')
      ).toBe(true);
    });

    it('should provide trend analysis capabilities', async () => {
      // Generate trending data
      const trendData = [];
      for (let i = 0; i < 20; i++) {
        const responseTime = 100 + i * 10; // Gradually increasing response time
        performanceMonitor.recordRequest(responseTime, false);
        const metrics = await performanceMonitor.collectMetrics();
        trendData.push(metrics);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      const recentMetrics = performanceMonitor.getMetrics(10);
      const olderMetrics = performanceMonitor
        .getMetrics(20)
        .slice(0, 10);

      const recentAvg =
        recentMetrics.reduce(
          (sum, m) => sum + m.averageResponseTime,
          0
        ) / recentMetrics.length;
      const olderAvg =
        olderMetrics.reduce(
          (sum, m) => sum + m.averageResponseTime,
          0
        ) / olderMetrics.length;

      expect(recentAvg).toBeGreaterThan(olderAvg); // Performance degradation trend
    });
  });
});
