import { VerificationResult } from '@/models/core/VerificationResult';
import { Logger } from '@/utils/Logger';

export interface CacheConfig {
  ttl?: number; // Time to live in seconds
  maxSize?: number; // Maximum number of cached results
  keyPrefix?: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

export class ResultsCache {
  private readonly logger: Logger;
  private readonly cache: Map<string, CachedResult>;
  private readonly config: Required<CacheConfig>;
  private stats: { hits: number; misses: number };
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: CacheConfig = {}) {
    this.logger = new Logger('ResultsCache');
    this.cache = new Map();
    this.config = {
      ttl: config.ttl || 3600, // 1 hour default
      maxSize: config.maxSize || 10000,
      keyPrefix: config.keyPrefix || 'verification:',
    };
    this.stats = { hits: 0, misses: 0 };

    // Start cleanup interval
    this.startCleanupInterval();
  }

  async get(key: string): Promise<VerificationResult | null> {
    const cacheKey = this.getCacheKey(key);
    const cached = this.cache.get(cacheKey);

    if (!cached) {
      this.stats.misses++;
      this.logger.debug(`Cache miss for key: ${key}`);
      return null;
    }

    // Check if expired
    if (this.isExpired(cached)) {
      this.cache.delete(cacheKey);
      this.stats.misses++;
      this.logger.debug(`Cache expired for key: ${key}`);
      return null;
    }

    this.stats.hits++;
    this.logger.debug(`Cache hit for key: ${key}`);
    return cached.result;
  }

  async set(key: string, result: VerificationResult): Promise<void> {
    const cacheKey = this.getCacheKey(key);

    // Check cache size limit
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    const cached: CachedResult = {
      result,
      timestamp: Date.now(),
      accessCount: 0,
    };

    this.cache.set(cacheKey, cached);
    this.logger.debug(`Cached result for key: ${key}`);
  }

  async delete(key: string): Promise<boolean> {
    const cacheKey = this.getCacheKey(key);
    const deleted = this.cache.delete(cacheKey);

    if (deleted) {
      this.logger.debug(`Deleted cache entry for key: ${key}`);
    }

    return deleted;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
    this.logger.info('Cache cleared');
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.cache.clear();
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  // Generate cache key based on content hash and verification parameters
  generateCacheKey(
    contentHash: string,
    domain: string,
    options?: Record<string, any>
  ): string {
    const optionsHash = options ? this.hashObject(options) : '';
    return `${contentHash}:${domain}:${optionsHash}`;
  }

  private getCacheKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  private isExpired(cached: CachedResult): boolean {
    const age = (Date.now() - cached.timestamp) / 1000;
    return age > this.config.ttl;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Number.MAX_SAFE_INTEGER;

    for (const [key, cached] of this.cache.entries()) {
      if (cached.timestamp < oldestTimestamp) {
        oldestTimestamp = cached.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.logger.debug(`Evicted oldest cache entry: ${oldestKey}`);
    }
  }

  private startCleanupInterval(): void {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 5 * 60 * 1000);

    // Unref the timer so it doesn't keep the process alive
    this.cleanupInterval.unref();
  }

  private cleanupExpired(): void {
    const keysToDelete: string[] = [];

    for (const [key, cached] of this.cache.entries()) {
      if (this.isExpired(cached)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      this.logger.debug(
        `Cleaned up ${keysToDelete.length} expired cache entries`
      );
    }
  }

  private hashObject(obj: Record<string, unknown>): string {
    // Simple hash function for cache key generation
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

interface CachedResult {
  result: VerificationResult;
  timestamp: number;
  accessCount: number;
}
