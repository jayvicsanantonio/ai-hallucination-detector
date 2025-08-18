import { ResultsCache } from '@/services/verification-engine/ResultsCache';
import { VerificationResult } from '@/models/core/VerificationResult';

// Mock Logger
jest.mock('@/utils/Logger');

describe('ResultsCache', () => {
  let cache: ResultsCache;
  let mockResult: VerificationResult;

  beforeEach(() => {
    cache = new ResultsCache({
      ttl: 1, // 1 second for testing
      maxSize: 3, // Small size for testing
      keyPrefix: 'test:',
    });

    mockResult = {
      verificationId: 'test-verification-1',
      overallConfidence: 95,
      riskLevel: 'low',
      issues: [],
      auditTrail: [],
      processingTime: 100,
      recommendations: ['Test recommendation'],
      timestamp: new Date(),
    };
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('basic operations', () => {
    it('should store and retrieve results', async () => {
      await cache.set('test-key', mockResult);
      const retrieved = await cache.get('test-key');

      expect(retrieved).toEqual(mockResult);
    });

    it('should return null for non-existent keys', async () => {
      const result = await cache.get('non-existent');
      expect(result).toBeNull();
    });

    it('should delete entries', async () => {
      await cache.set('test-key', mockResult);
      const deleted = await cache.delete('test-key');
      const retrieved = await cache.get('test-key');

      expect(deleted).toBe(true);
      expect(retrieved).toBeNull();
    });

    it('should return false when deleting non-existent entries', async () => {
      const deleted = await cache.delete('non-existent');
      expect(deleted).toBe(false);
    });

    it('should clear all entries', async () => {
      await cache.set('key1', mockResult);
      await cache.set('key2', mockResult);

      await cache.clear();

      const result1 = await cache.get('key1');
      const result2 = await cache.get('key2');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', async () => {
      await cache.set('test-key', mockResult);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const retrieved = await cache.get('test-key');
      expect(retrieved).toBeNull();
    });

    it('should return valid entries before TTL expires', async () => {
      await cache.set('test-key', mockResult);

      // Retrieve immediately
      const retrieved = await cache.get('test-key');
      expect(retrieved).toEqual(mockResult);
    });
  });

  describe('size limits', () => {
    it('should evict oldest entries when max size is reached', async () => {
      // Fill cache to max size
      await cache.set('key1', mockResult);
      await cache.set('key2', mockResult);
      await cache.set('key3', mockResult);

      // Add one more to trigger eviction
      await cache.set('key4', mockResult);

      // First entry should be evicted
      const result1 = await cache.get('key1');
      const result4 = await cache.get('key4');

      expect(result1).toBeNull();
      expect(result4).toEqual(mockResult);
    });
  });

  describe('statistics', () => {
    it('should track cache hits and misses', async () => {
      await cache.set('test-key', mockResult);

      // Hit
      await cache.get('test-key');

      // Miss
      await cache.get('non-existent');

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
      expect(stats.size).toBe(1);
    });

    it('should reset stats when cache is cleared', async () => {
      await cache.set('test-key', mockResult);
      await cache.get('test-key');

      await cache.clear();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.size).toBe(0);
    });
  });

  describe('cache key generation', () => {
    it('should generate consistent cache keys', () => {
      const key1 = cache.generateCacheKey('hash123', 'legal', {
        option1: 'value1',
      });
      const key2 = cache.generateCacheKey('hash123', 'legal', {
        option1: 'value1',
      });

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different inputs', () => {
      const key1 = cache.generateCacheKey('hash123', 'legal', {
        option1: 'value1',
      });
      const key2 = cache.generateCacheKey('hash456', 'legal', {
        option1: 'value1',
      });
      const key3 = cache.generateCacheKey('hash123', 'financial', {
        option1: 'value1',
      });
      const key4 = cache.generateCacheKey('hash123', 'legal', {
        option1: 'value2',
      });

      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key1).not.toBe(key4);
    });

    it('should handle undefined options', () => {
      const key1 = cache.generateCacheKey('hash123', 'legal');
      const key2 = cache.generateCacheKey(
        'hash123',
        'legal',
        undefined
      );

      expect(key1).toBe(key2);
    });
  });
});
