import { RedisCache, CacheService, CacheOptions } from './RedisCache';
import { VerificationResult } from '../../models/core/VerificationResult';
import { ParsedContent } from '../../models/core/ParsedContent';
import { Logger } from '../../utils/Logger';
import crypto from 'crypto';

export interface CacheConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  ttl: {
    verificationResults: number;
    parsedContent: number;
    knowledgeBase: number;
    complianceRules: number;
    userSessions: number;
  };
  enabled: boolean;
}

export class CacheManager {
  private cache: CacheService;
  private logger: Logger;
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
    this.logger = new Logger('CacheManager');

    if (config.enabled) {
      this.cache = new RedisCache({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db,
        keyPrefix: 'certaintyai',
        maxRetries: 3,
        retryDelayOnFailover: 100,
      });
    } else {
      this.cache = new NullCache();
    }
  }

  async initialize(): Promise<void> {
    if (this.config.enabled && this.cache instanceof RedisCache) {
      await this.cache.connect();
    }
  }

  async shutdown(): Promise<void> {
    if (this.config.enabled && this.cache instanceof RedisCache) {
      await this.cache.disconnect();
    }
  }

  // Verification Results Caching
  async cacheVerificationResult(
    contentHash: string,
    result: VerificationResult
  ): Promise<void> {
    const key = `verification:${contentHash}`;
    await this.cache.set(key, result, {
      ttl: this.config.ttl.verificationResults,
    });
    this.logger.debug(
      `Cached verification result for content hash: ${contentHash}`
    );
  }

  async getVerificationResult(
    contentHash: string
  ): Promise<VerificationResult | null> {
    const key = `verification:${contentHash}`;
    const result = await this.cache.get<VerificationResult>(key);

    if (result) {
      this.logger.debug(
        `Cache hit for verification result: ${contentHash}`
      );
    } else {
      this.logger.debug(
        `Cache miss for verification result: ${contentHash}`
      );
    }

    return result;
  }

  // Parsed Content Caching
  async cacheParsedContent(
    contentHash: string,
    parsedContent: ParsedContent
  ): Promise<void> {
    const key = `parsed:${contentHash}`;
    await this.cache.set(key, parsedContent, {
      ttl: this.config.ttl.parsedContent,
    });
    this.logger.debug(
      `Cached parsed content for hash: ${contentHash}`
    );
  }

  async getParsedContent(
    contentHash: string
  ): Promise<ParsedContent | null> {
    const key = `parsed:${contentHash}`;
    const content = await this.cache.get<ParsedContent>(key);

    if (content) {
      this.logger.debug(
        `Cache hit for parsed content: ${contentHash}`
      );
    } else {
      this.logger.debug(
        `Cache miss for parsed content: ${contentHash}`
      );
    }

    return content;
  }

  // Knowledge Base Caching
  async cacheKnowledgeBaseQuery(
    query: string,
    results: any[]
  ): Promise<void> {
    const queryHash = this.hashString(query);
    const key = `kb:${queryHash}`;
    await this.cache.set(key, results, {
      ttl: this.config.ttl.knowledgeBase,
    });
    this.logger.debug(`Cached knowledge base query: ${queryHash}`);
  }

  async getKnowledgeBaseQuery(query: string): Promise<any[] | null> {
    const queryHash = this.hashString(query);
    const key = `kb:${queryHash}`;
    const results = await this.cache.get<any[]>(key);

    if (results) {
      this.logger.debug(
        `Cache hit for knowledge base query: ${queryHash}`
      );
    } else {
      this.logger.debug(
        `Cache miss for knowledge base query: ${queryHash}`
      );
    }

    return results;
  }

  // Compliance Rules Caching
  async cacheComplianceRules(
    domain: string,
    jurisdiction: string,
    rules: any[]
  ): Promise<void> {
    const key = `compliance:${domain}:${jurisdiction}`;
    await this.cache.set(key, rules, {
      ttl: this.config.ttl.complianceRules,
    });
    this.logger.debug(
      `Cached compliance rules for ${domain}:${jurisdiction}`
    );
  }

  async getComplianceRules(
    domain: string,
    jurisdiction: string
  ): Promise<any[] | null> {
    const key = `compliance:${domain}:${jurisdiction}`;
    const rules = await this.cache.get<any[]>(key);

    if (rules) {
      this.logger.debug(
        `Cache hit for compliance rules: ${domain}:${jurisdiction}`
      );
    } else {
      this.logger.debug(
        `Cache miss for compliance rules: ${domain}:${jurisdiction}`
      );
    }

    return rules;
  }

  // User Session Caching
  async cacheUserSession(
    sessionId: string,
    sessionData: any
  ): Promise<void> {
    const key = `session:${sessionId}`;
    await this.cache.set(key, sessionData, {
      ttl: this.config.ttl.userSessions,
    });
    this.logger.debug(`Cached user session: ${sessionId}`);
  }

  async getUserSession(sessionId: string): Promise<any | null> {
    const key = `session:${sessionId}`;
    const session = await this.cache.get<any>(key);

    if (session) {
      this.logger.debug(`Cache hit for user session: ${sessionId}`);
    } else {
      this.logger.debug(`Cache miss for user session: ${sessionId}`);
    }

    return session;
  }

  async invalidateUserSession(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;
    await this.cache.del(key);
    this.logger.debug(`Invalidated user session: ${sessionId}`);
  }

  // Batch Operations for Performance
  async batchCacheVerificationResults(
    results: Array<{
      contentHash: string;
      result: VerificationResult;
    }>
  ): Promise<void> {
    const keyValuePairs = results.map(({ contentHash, result }) => ({
      key: `verification:${contentHash}`,
      value: result,
      ttl: this.config.ttl.verificationResults,
    }));

    if (this.cache instanceof RedisCache) {
      await this.cache.mset(keyValuePairs);
    } else {
      // Fallback for other cache implementations
      await Promise.all(
        keyValuePairs.map(({ key, value, ttl }) =>
          this.cache.set(key, value, { ttl })
        )
      );
    }

    this.logger.debug(
      `Batch cached ${results.length} verification results`
    );
  }

  async batchGetVerificationResults(
    contentHashes: string[]
  ): Promise<(VerificationResult | null)[]> {
    const keys = contentHashes.map((hash) => `verification:${hash}`);

    if (this.cache instanceof RedisCache) {
      return await this.cache.mget<VerificationResult>(keys);
    } else {
      // Fallback for other cache implementations
      return await Promise.all(
        keys.map((key) => this.cache.get<VerificationResult>(key))
      );
    }
  }

  // Cache Management
  async clearCache(pattern?: string): Promise<void> {
    await this.cache.clear(pattern);
    this.logger.info(
      `Cleared cache${pattern ? ` with pattern: ${pattern}` : ''}`
    );
  }

  async getCacheStats(): Promise<any> {
    return await this.cache.getStats();
  }

  // Utility Methods
  private hashString(input: string): string {
    return crypto
      .createHash('sha256')
      .update(input)
      .digest('hex')
      .substring(0, 16);
  }

  generateContentHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  // Cache warming for frequently accessed data
  async warmCache(): Promise<void> {
    this.logger.info('Starting cache warming process...');

    try {
      // Warm up common compliance rules
      const commonDomains = ['legal', 'financial', 'healthcare'];
      const commonJurisdictions = ['US', 'EU', 'UK'];

      // This would typically load from database and cache
      // For now, we'll just log the warming process
      for (const domain of commonDomains) {
        for (const jurisdiction of commonJurisdictions) {
          this.logger.debug(
            `Warming cache for ${domain}:${jurisdiction} compliance rules`
          );
          // In real implementation, load and cache the rules
        }
      }

      this.logger.info('Cache warming completed');
    } catch (error) {
      this.logger.error('Error during cache warming:', error);
    }
  }
}

// Null cache implementation for when caching is disabled
class NullCache implements CacheService {
  async get<T>(): Promise<T | null> {
    return null;
  }

  async set<T>(): Promise<void> {
    // No-op
  }

  async del(): Promise<void> {
    // No-op
  }

  async exists(): Promise<boolean> {
    return false;
  }

  async clear(): Promise<void> {
    // No-op
  }

  async getStats(): Promise<any> {
    return {
      hitRate: 0,
      missRate: 0,
      totalRequests: 0,
      memoryUsage: 0,
      connectedClients: 0,
    };
  }
}
