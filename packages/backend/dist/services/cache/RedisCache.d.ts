export interface CacheOptions {
    ttl?: number;
    prefix?: string;
}
export interface CacheService {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
    del(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
    clear(pattern?: string): Promise<void>;
    getStats(): Promise<CacheStats>;
}
export interface CacheStats {
    hitRate: number;
    missRate: number;
    totalRequests: number;
    memoryUsage: number;
    connectedClients: number;
}
export declare class RedisCache implements CacheService {
    private config;
    private client;
    private logger;
    private stats;
    constructor(config: {
        host: string;
        port: number;
        password?: string;
        db?: number;
        keyPrefix?: string;
        maxRetries?: number;
        retryDelayOnFailover?: number;
    });
    private setupEventHandlers;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    private buildKey;
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
    del(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
    clear(pattern?: string): Promise<void>;
    getStats(): Promise<CacheStats>;
    mget<T>(keys: string[]): Promise<(T | null)[]>;
    mset<T>(keyValuePairs: Array<{
        key: string;
        value: T;
        ttl?: number;
    }>): Promise<void>;
    increment(key: string, amount?: number): Promise<number>;
    expire(key: string, ttl: number): Promise<void>;
}
//# sourceMappingURL=RedisCache.d.ts.map