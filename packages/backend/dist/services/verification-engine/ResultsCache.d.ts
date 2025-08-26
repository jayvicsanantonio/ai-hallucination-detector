import { VerificationResult } from '@/models/core/VerificationResult';
import { CacheManager } from '../cache/CacheManager';
export interface CacheConfig {
    ttl?: number;
    maxSize?: number;
    keyPrefix?: string;
    useRedis?: boolean;
}
export interface CacheStats {
    hits: number;
    misses: number;
    size: number;
    hitRate: number;
}
export declare class ResultsCache {
    private readonly logger;
    private readonly cache;
    private readonly config;
    private stats;
    private cleanupInterval?;
    private cacheManager?;
    constructor(config?: CacheConfig, cacheManager?: CacheManager);
    get(key: string): Promise<VerificationResult | null>;
    set(key: string, result: VerificationResult): Promise<void>;
    delete(key: string): Promise<boolean>;
    clear(): Promise<void>;
    destroy(): void;
    getStats(): Promise<CacheStats>;
    generateCacheKey(contentHash: string, domain: string, options?: Record<string, any>): string;
    private getCacheKey;
    private isExpired;
    private evictOldest;
    private startCleanupInterval;
    private cleanupExpired;
    private hashObject;
}
//# sourceMappingURL=ResultsCache.d.ts.map