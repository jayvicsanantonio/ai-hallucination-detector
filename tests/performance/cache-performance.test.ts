import { RedisCache, CacheManager } from '../../src/services/cache';
import { VerificationResult } from '../../src/models/core/VerificationResult';
import { ParsedContent } from '../../src/models/core/ParsedContent';

describe('Cache Performance Tests', () => {
  let cacheManager: CacheManager;
  let redisCache: RedisCache;

  const mockConfig = {
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

  beforeAll(async () => {
    cacheManager = new CacheManager(mockConfig);
    await cacheManager.initialize();

    redisCache = new RedisCache({
      host: mockConfig.redis.host,
      port: mockConfig.redis.port,
      password: mockConfig.redis.password,
      keyPrefix: 'test',
    });
    await redisCache.connect();
  });

  afterAll(async () => {
    await cacheManager.shutdown();
    await redisCache.disconnect();
  });

  beforeEach(async () => {
    // Clear cache before each test
    await cacheManager.clearCache();
  });

  describe('Single Operation Performance', () => {
    it('should cache and retrieve verification results within performance thresholds', async () => {
      const mockResult: VerificationResult = {
        verificationId: 'test-123',
        overallConfidence: 85,
        riskLevel: 'medium',
        issues: [],
        auditTrail: [],
        processingTime: 1500,
        recommendations: [],
        timestamp: new Date(),
      };

      const contentHash = 'test-hash-123';

      // Measure cache set performance
      const setStartTime = Date.now();
      await cacheManager.cacheVerificationResult(
        contentHash,
        mockResult
      );
      const setTime = Date.now() - setStartTime;

      expect(setTime).toBeLessThan(50); // Should complete within 50ms

      // Measure cache get performance
      const getStartTime = Date.now();
      const retrievedResult =
        await cacheManager.getVerificationResult(contentHash);
      const getTime = Date.now() - getStartTime;

      expect(getTime).toBeLessThan(10); // Should complete within 10ms
      expect(retrievedResult).toEqual(mockResult);
    });

    it('should handle cache misses efficiently', async () => {
      const startTime = Date.now();
      const result = await cacheManager.getVerificationResult(
        'non-existent-hash'
      );
      const responseTime = Date.now() - startTime;

      expect(result).toBeNull();
      expect(responseTime).toBeLessThan(20); // Should complete within 20ms
    });
  });

  describe('Batch Operation Performance', () => {
    it('should handle batch verification result caching efficiently', async () => {
      const batchSize = 100;
      const results = Array.from({ length: batchSize }, (_, i) => ({
        contentHash: `hash-${i}`,
        result: {
          verificationId: `test-${i}`,
          overallConfidence: 80 + (i % 20),
          riskLevel: 'medium' as const,
          issues: [],
          auditTrail: [],
          processingTime: 1000 + i,
          recommendations: [],
          timestamp: new Date(),
        },
      }));

      const startTime = Date.now();
      await cacheManager.batchCacheVerificationResults(results);
      const batchSetTime = Date.now() - startTime;

      // Should complete batch operation within reasonable time
      expect(batchSetTime).toBeLessThan(1000); // 1 second for 100 items

      // Verify batch retrieval performance
      const hashes = results.map((r) => r.contentHash);
      const retrievalStartTime = Date.now();
      const retrievedResults =
        await cacheManager.batchGetVerificationResults(hashes);
      const batchGetTime = Date.now() - retrievalStartTime;

      expect(batchGetTime).toBeLessThan(200); // 200ms for 100 items
      expect(retrievedResults).toHaveLength(batchSize);
      expect(retrievedResults.filter((r) => r !== null)).toHaveLength(
        batchSize
      );
    });

    it('should maintain performance under concurrent access', async () => {
      const concurrentOperations = 50;
      const operationsPerThread = 10;

      const promises = Array.from(
        { length: concurrentOperations },
        async (_, i) => {
          const operations = [];

          for (let j = 0; j < operationsPerThread; j++) {
            const key = `concurrent-${i}-${j}`;
            const value = {
              data: `test-data-${i}-${j}`,
              timestamp: Date.now(),
            };

            operations.push(
              cacheManager
                .cacheVerificationResult(key, value as any)
                .then(() => cacheManager.getVerificationResult(key))
            );
          }

          return Promise.all(operations);
        }
      );

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // Should handle concurrent operations efficiently
      expect(totalTime).toBeLessThan(2000); // 2 seconds for all operations
      expect(results).toHaveLength(concurrentOperations);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should maintain reasonable memory usage under load', async () => {
      const initialMemory = process.memoryUsage();

      // Cache a large number of items
      const itemCount = 1000;
      const promises = Array.from(
        { length: itemCount },
        async (_, i) => {
          const largeData = {
            id: i,
            content: 'x'.repeat(1000), // 1KB of data per item
            metadata: { timestamp: Date.now(), index: i },
          };

          return cacheManager.cacheVerificationResult(
            `large-${i}`,
            largeData as any
          );
        }
      );

      await Promise.all(promises);

      const finalMemory = process.memoryUsage();
      const memoryIncrease =
        finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 50MB for 1MB of cached data)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should provide accurate cache statistics', async () => {
      // Perform some cache operations
      await cacheManager.cacheVerificationResult('stats-1', {
        test: 'data1',
      } as any);
      await cacheManager.cacheVerificationResult('stats-2', {
        test: 'data2',
      } as any);

      // Generate some hits and misses
      await cacheManager.getVerificationResult('stats-1'); // hit
      await cacheManager.getVerificationResult('stats-2'); // hit
      await cacheManager.getVerificationResult('stats-3'); // miss
      await cacheManager.getVerificationResult('stats-4'); // miss

      const stats = await cacheManager.getCacheStats();

      expect(stats.totalRequests).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.missRate).toBeGreaterThan(0);
      expect(stats.hitRate + stats.missRate).toBeCloseTo(100, 1);
    });
  });

  describe('Cache Expiration and TTL', () => {
    it('should respect TTL settings for performance optimization', async () => {
      const shortTTL = 1; // 1 second
      const testData = { test: 'expiration-data' };

      await redisCache.set('ttl-test', testData, { ttl: shortTTL });

      // Should be available immediately
      let result = await redisCache.get('ttl-test');
      expect(result).toEqual(testData);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should be expired
      result = await redisCache.get('ttl-test');
      expect(result).toBeNull();
    });

    it('should handle cache warming efficiently', async () => {
      const startTime = Date.now();
      await cacheManager.warmCache();
      const warmingTime = Date.now() - startTime;

      // Cache warming should complete quickly
      expect(warmingTime).toBeLessThan(1000);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle Redis connection failures gracefully', async () => {
      // Create a cache with invalid connection
      const failingCache = new RedisCache({
        host: 'invalid-host',
        port: 9999,
        keyPrefix: 'test-fail',
        maxRetries: 1,
      });

      // Operations should not throw but return null/fail gracefully
      const result = await failingCache.get('test-key');
      expect(result).toBeNull();
    });

    it('should maintain performance during cache failures', async () => {
      // Test with disabled cache
      const disabledCacheManager = new CacheManager({
        ...mockConfig,
        enabled: false,
      });

      await disabledCacheManager.initialize();

      const startTime = Date.now();
      await disabledCacheManager.cacheVerificationResult('test', {
        test: 'data',
      } as any);
      const result = await disabledCacheManager.getVerificationResult(
        'test'
      );
      const operationTime = Date.now() - startTime;

      expect(result).toBeNull(); // Disabled cache returns null
      expect(operationTime).toBeLessThan(10); // Should be very fast (no-op)

      await disabledCacheManager.shutdown();
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet throughput requirements', async () => {
      const targetThroughput = 1000; // operations per second
      const testDuration = 1000; // 1 second
      const operationCount = Math.floor(
        targetThroughput * (testDuration / 1000)
      );

      const startTime = Date.now();
      const promises = Array.from(
        { length: operationCount },
        async (_, i) => {
          const key = `benchmark-${i}`;
          const data = { index: i, timestamp: Date.now() };

          await cacheManager.cacheVerificationResult(
            key,
            data as any
          );
          return cacheManager.getVerificationResult(key);
        }
      );

      await Promise.all(promises);
      const actualDuration = Date.now() - startTime;
      const actualThroughput =
        (operationCount * 2) / (actualDuration / 1000); // *2 for set+get

      expect(actualThroughput).toBeGreaterThan(
        targetThroughput * 0.8
      ); // 80% of target
    });
  });
});
