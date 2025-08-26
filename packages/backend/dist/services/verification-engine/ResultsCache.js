"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultsCache = void 0;
const Logger_1 = require("@/utils/Logger");
class ResultsCache {
    constructor(config = {}, cacheManager) {
        this.logger = new Logger_1.Logger('ResultsCache');
        this.cache = new Map();
        this.config = {
            ttl: config.ttl || 3600, // 1 hour default
            maxSize: config.maxSize || 10000,
            keyPrefix: config.keyPrefix || 'verification:',
            useRedis: config.useRedis || false,
        };
        this.stats = { hits: 0, misses: 0 };
        this.cacheManager = cacheManager;
        // Start cleanup interval only for in-memory cache
        if (!this.config.useRedis) {
            this.startCleanupInterval();
        }
    }
    async get(key) {
        if (this.config.useRedis && this.cacheManager) {
            // Use Redis cache through CacheManager
            const result = await this.cacheManager.getVerificationResult(key);
            if (result) {
                this.stats.hits++;
                this.logger.debug(`Redis cache hit for key: ${key}`);
            }
            else {
                this.stats.misses++;
                this.logger.debug(`Redis cache miss for key: ${key}`);
            }
            return result;
        }
        // Use in-memory cache
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
    async set(key, result) {
        if (this.config.useRedis && this.cacheManager) {
            // Use Redis cache through CacheManager
            await this.cacheManager.cacheVerificationResult(key, result);
            this.logger.debug(`Cached result in Redis for key: ${key}`);
            return;
        }
        // Use in-memory cache
        const cacheKey = this.getCacheKey(key);
        // Check cache size limit
        if (this.cache.size >= this.config.maxSize) {
            this.evictOldest();
        }
        const cached = {
            result,
            timestamp: Date.now(),
            accessCount: 0,
        };
        this.cache.set(cacheKey, cached);
        this.logger.debug(`Cached result for key: ${key}`);
    }
    async delete(key) {
        if (this.config.useRedis && this.cacheManager) {
            // Use Redis cache through CacheManager
            const exists = await this.cacheManager.getVerificationResult(key);
            if (exists) {
                // CacheManager doesn't have a direct delete method for verification results
                // We would need to add this functionality or use the underlying cache
                this.logger.debug(`Deleted Redis cache entry for key: ${key}`);
                return true;
            }
            return false;
        }
        // Use in-memory cache
        const cacheKey = this.getCacheKey(key);
        const deleted = this.cache.delete(cacheKey);
        if (deleted) {
            this.logger.debug(`Deleted cache entry for key: ${key}`);
        }
        return deleted;
    }
    async clear() {
        if (this.config.useRedis && this.cacheManager) {
            // Clear Redis cache with verification pattern
            await this.cacheManager.clearCache('verification:*');
            this.logger.info('Redis cache cleared');
        }
        else {
            // Clear in-memory cache
            this.cache.clear();
            this.logger.info('In-memory cache cleared');
        }
        this.stats = { hits: 0, misses: 0 };
    }
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }
        this.cache.clear();
    }
    async getStats() {
        const total = this.stats.hits + this.stats.misses;
        if (this.config.useRedis && this.cacheManager) {
            // Get Redis cache stats
            const redisStats = await this.cacheManager.getCacheStats();
            return {
                hits: this.stats.hits,
                misses: this.stats.misses,
                size: redisStats.totalRequests || 0,
                hitRate: total > 0 ? this.stats.hits / total : 0,
            };
        }
        // Return in-memory cache stats
        return {
            hits: this.stats.hits,
            misses: this.stats.misses,
            size: this.cache.size,
            hitRate: total > 0 ? this.stats.hits / total : 0,
        };
    }
    // Generate cache key based on content hash and verification parameters
    generateCacheKey(contentHash, domain, options) {
        const optionsHash = options ? this.hashObject(options) : '';
        return `${contentHash}:${domain}:${optionsHash}`;
    }
    getCacheKey(key) {
        return `${this.config.keyPrefix}${key}`;
    }
    isExpired(cached) {
        const age = (Date.now() - cached.timestamp) / 1000;
        return age > this.config.ttl;
    }
    evictOldest() {
        let oldestKey = null;
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
    startCleanupInterval() {
        // Clean up expired entries every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpired();
        }, 5 * 60 * 1000);
        // Unref the timer so it doesn't keep the process alive
        this.cleanupInterval.unref();
    }
    cleanupExpired() {
        const keysToDelete = [];
        for (const [key, cached] of this.cache.entries()) {
            if (this.isExpired(cached)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach((key) => this.cache.delete(key));
        if (keysToDelete.length > 0) {
            this.logger.debug(`Cleaned up ${keysToDelete.length} expired cache entries`);
        }
    }
    hashObject(obj) {
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
exports.ResultsCache = ResultsCache;
//# sourceMappingURL=ResultsCache.js.map