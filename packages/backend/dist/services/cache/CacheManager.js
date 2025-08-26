"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
const RedisCache_1 = require("./RedisCache");
const Logger_1 = require("../../utils/Logger");
const crypto_1 = __importDefault(require("crypto"));
class CacheManager {
    constructor(config) {
        this.config = config;
        this.logger = new Logger_1.Logger('CacheManager');
        if (config.enabled) {
            this.cache = new RedisCache_1.RedisCache({
                host: config.redis.host,
                port: config.redis.port,
                password: config.redis.password,
                db: config.redis.db,
                keyPrefix: 'certaintyai',
                maxRetries: 3,
                retryDelayOnFailover: 100,
            });
        }
        else {
            this.cache = new NullCache();
        }
    }
    async initialize() {
        if (this.config.enabled && this.cache instanceof RedisCache_1.RedisCache) {
            await this.cache.connect();
        }
    }
    async shutdown() {
        if (this.config.enabled && this.cache instanceof RedisCache_1.RedisCache) {
            await this.cache.disconnect();
        }
    }
    // Verification Results Caching
    async cacheVerificationResult(contentHash, result) {
        const key = `verification:${contentHash}`;
        await this.cache.set(key, result, {
            ttl: this.config.ttl.verificationResults,
        });
        this.logger.debug(`Cached verification result for content hash: ${contentHash}`);
    }
    async getVerificationResult(contentHash) {
        const key = `verification:${contentHash}`;
        const result = await this.cache.get(key);
        if (result) {
            this.logger.debug(`Cache hit for verification result: ${contentHash}`);
        }
        else {
            this.logger.debug(`Cache miss for verification result: ${contentHash}`);
        }
        return result;
    }
    // Parsed Content Caching
    async cacheParsedContent(contentHash, parsedContent) {
        const key = `parsed:${contentHash}`;
        await this.cache.set(key, parsedContent, {
            ttl: this.config.ttl.parsedContent,
        });
        this.logger.debug(`Cached parsed content for hash: ${contentHash}`);
    }
    async getParsedContent(contentHash) {
        const key = `parsed:${contentHash}`;
        const content = await this.cache.get(key);
        if (content) {
            this.logger.debug(`Cache hit for parsed content: ${contentHash}`);
        }
        else {
            this.logger.debug(`Cache miss for parsed content: ${contentHash}`);
        }
        return content;
    }
    // Knowledge Base Caching
    async cacheKnowledgeBaseQuery(query, results) {
        const queryHash = this.hashString(query);
        const key = `kb:${queryHash}`;
        await this.cache.set(key, results, {
            ttl: this.config.ttl.knowledgeBase,
        });
        this.logger.debug(`Cached knowledge base query: ${queryHash}`);
    }
    async getKnowledgeBaseQuery(query) {
        const queryHash = this.hashString(query);
        const key = `kb:${queryHash}`;
        const results = await this.cache.get(key);
        if (results) {
            this.logger.debug(`Cache hit for knowledge base query: ${queryHash}`);
        }
        else {
            this.logger.debug(`Cache miss for knowledge base query: ${queryHash}`);
        }
        return results;
    }
    // Compliance Rules Caching
    async cacheComplianceRules(domain, jurisdiction, rules) {
        const key = `compliance:${domain}:${jurisdiction}`;
        await this.cache.set(key, rules, {
            ttl: this.config.ttl.complianceRules,
        });
        this.logger.debug(`Cached compliance rules for ${domain}:${jurisdiction}`);
    }
    async getComplianceRules(domain, jurisdiction) {
        const key = `compliance:${domain}:${jurisdiction}`;
        const rules = await this.cache.get(key);
        if (rules) {
            this.logger.debug(`Cache hit for compliance rules: ${domain}:${jurisdiction}`);
        }
        else {
            this.logger.debug(`Cache miss for compliance rules: ${domain}:${jurisdiction}`);
        }
        return rules;
    }
    // User Session Caching
    async cacheUserSession(sessionId, sessionData) {
        const key = `session:${sessionId}`;
        await this.cache.set(key, sessionData, {
            ttl: this.config.ttl.userSessions,
        });
        this.logger.debug(`Cached user session: ${sessionId}`);
    }
    async getUserSession(sessionId) {
        const key = `session:${sessionId}`;
        const session = await this.cache.get(key);
        if (session) {
            this.logger.debug(`Cache hit for user session: ${sessionId}`);
        }
        else {
            this.logger.debug(`Cache miss for user session: ${sessionId}`);
        }
        return session;
    }
    async invalidateUserSession(sessionId) {
        const key = `session:${sessionId}`;
        await this.cache.del(key);
        this.logger.debug(`Invalidated user session: ${sessionId}`);
    }
    // Batch Operations for Performance
    async batchCacheVerificationResults(results) {
        const keyValuePairs = results.map(({ contentHash, result }) => ({
            key: `verification:${contentHash}`,
            value: result,
            ttl: this.config.ttl.verificationResults,
        }));
        if (this.cache instanceof RedisCache_1.RedisCache) {
            await this.cache.mset(keyValuePairs);
        }
        else {
            // Fallback for other cache implementations
            await Promise.all(keyValuePairs.map(({ key, value, ttl }) => this.cache.set(key, value, { ttl })));
        }
        this.logger.debug(`Batch cached ${results.length} verification results`);
    }
    async batchGetVerificationResults(contentHashes) {
        const keys = contentHashes.map((hash) => `verification:${hash}`);
        if (this.cache instanceof RedisCache_1.RedisCache) {
            return await this.cache.mget(keys);
        }
        else {
            // Fallback for other cache implementations
            return await Promise.all(keys.map((key) => this.cache.get(key)));
        }
    }
    // Cache Management
    async clearCache(pattern) {
        await this.cache.clear(pattern);
        this.logger.info(`Cleared cache${pattern ? ` with pattern: ${pattern}` : ''}`);
    }
    async getCacheStats() {
        return await this.cache.getStats();
    }
    // Utility Methods
    hashString(input) {
        return crypto_1.default
            .createHash('sha256')
            .update(input)
            .digest('hex')
            .substring(0, 16);
    }
    generateContentHash(content) {
        return crypto_1.default.createHash('sha256').update(content).digest('hex');
    }
    // Cache warming for frequently accessed data
    async warmCache() {
        this.logger.info('Starting cache warming process...');
        try {
            // Warm up common compliance rules
            const commonDomains = ['legal', 'financial', 'healthcare'];
            const commonJurisdictions = ['US', 'EU', 'UK'];
            // This would typically load from database and cache
            // For now, we'll just log the warming process
            for (const domain of commonDomains) {
                for (const jurisdiction of commonJurisdictions) {
                    this.logger.debug(`Warming cache for ${domain}:${jurisdiction} compliance rules`);
                    // In real implementation, load and cache the rules
                }
            }
            this.logger.info('Cache warming completed');
        }
        catch (error) {
            this.logger.error('Error during cache warming:', error);
        }
    }
}
exports.CacheManager = CacheManager;
// Null cache implementation for when caching is disabled
class NullCache {
    async get() {
        return null;
    }
    async set() {
        // No-op
    }
    async del() {
        // No-op
    }
    async exists() {
        return false;
    }
    async clear() {
        // No-op
    }
    async getStats() {
        return {
            hitRate: 0,
            missRate: 0,
            totalRequests: 0,
            memoryUsage: 0,
            connectedClients: 0,
        };
    }
}
//# sourceMappingURL=CacheManager.js.map