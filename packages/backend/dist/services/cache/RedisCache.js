"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisCache = void 0;
const redis_1 = require("redis");
const Logger_1 = require("../../utils/Logger");
class RedisCache {
    constructor(config) {
        this.config = config;
        this.stats = {
            hits: 0,
            misses: 0,
            totalRequests: 0,
        };
        this.logger = new Logger_1.Logger('RedisCache');
        this.client = (0, redis_1.createClient)({
            socket: {
                host: config.host,
                port: config.port,
                reconnectStrategy: (retries) => {
                    if (retries > (config.maxRetries || 10)) {
                        return new Error('Max retries exceeded');
                    }
                    return Math.min(retries * 50, 500);
                },
            },
            password: config.password,
            database: config.db || 0,
        });
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        this.client.on('error', (err) => {
            this.logger.error('Redis connection error:', err);
        });
        this.client.on('connect', () => {
            this.logger.info('Connected to Redis');
        });
        this.client.on('ready', () => {
            this.logger.info('Redis client ready');
        });
        this.client.on('end', () => {
            this.logger.warn('Redis connection ended');
        });
    }
    async connect() {
        try {
            await this.client.connect();
            this.logger.info('Redis cache service initialized');
        }
        catch (error) {
            this.logger.error('Failed to connect to Redis:', error);
            throw error;
        }
    }
    async disconnect() {
        try {
            await this.client.disconnect();
            this.logger.info('Redis cache service disconnected');
        }
        catch (error) {
            this.logger.error('Error disconnecting from Redis:', error);
            throw error;
        }
    }
    buildKey(key, prefix) {
        const keyPrefix = prefix || this.config.keyPrefix || 'certaintyai';
        return `${keyPrefix}:${key}`;
    }
    async get(key) {
        try {
            this.stats.totalRequests++;
            const redisKey = this.buildKey(key);
            const value = await this.client.get(redisKey);
            if (value === null) {
                this.stats.misses++;
                return null;
            }
            this.stats.hits++;
            return JSON.parse(value);
        }
        catch (error) {
            this.logger.error(`Error getting key ${key}:`, error);
            this.stats.misses++;
            return null;
        }
    }
    async set(key, value, options) {
        try {
            const redisKey = this.buildKey(key, options?.prefix);
            const serializedValue = JSON.stringify(value);
            if (options?.ttl) {
                await this.client.setEx(redisKey, options.ttl, serializedValue);
            }
            else {
                await this.client.set(redisKey, serializedValue);
            }
            this.logger.debug(`Cached key ${key} with TTL ${options?.ttl || 'none'}`);
        }
        catch (error) {
            this.logger.error(`Error setting key ${key}:`, error);
            throw error;
        }
    }
    async del(key) {
        try {
            const redisKey = this.buildKey(key);
            await this.client.del(redisKey);
            this.logger.debug(`Deleted key ${key}`);
        }
        catch (error) {
            this.logger.error(`Error deleting key ${key}:`, error);
            throw error;
        }
    }
    async exists(key) {
        try {
            const redisKey = this.buildKey(key);
            const exists = await this.client.exists(redisKey);
            return exists === 1;
        }
        catch (error) {
            this.logger.error(`Error checking existence of key ${key}:`, error);
            return false;
        }
    }
    async clear(pattern) {
        try {
            const searchPattern = pattern
                ? this.buildKey(pattern)
                : this.buildKey('*');
            const keys = await this.client.keys(searchPattern);
            if (keys.length > 0) {
                await this.client.del(keys);
                this.logger.info(`Cleared ${keys.length} keys matching pattern ${searchPattern}`);
            }
        }
        catch (error) {
            this.logger.error(`Error clearing cache with pattern ${pattern}:`, error);
            throw error;
        }
    }
    async getStats() {
        try {
            const info = await this.client.info('memory');
            const memoryMatch = info.match(/used_memory:(\d+)/);
            const memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0;
            const clientsInfo = await this.client.info('clients');
            const clientsMatch = clientsInfo.match(/connected_clients:(\d+)/);
            const connectedClients = clientsMatch
                ? parseInt(clientsMatch[1])
                : 0;
            const hitRate = this.stats.totalRequests > 0
                ? (this.stats.hits / this.stats.totalRequests) * 100
                : 0;
            const missRate = this.stats.totalRequests > 0
                ? (this.stats.misses / this.stats.totalRequests) * 100
                : 0;
            return {
                hitRate: Math.round(hitRate * 100) / 100,
                missRate: Math.round(missRate * 100) / 100,
                totalRequests: this.stats.totalRequests,
                memoryUsage,
                connectedClients,
            };
        }
        catch (error) {
            this.logger.error('Error getting cache stats:', error);
            return {
                hitRate: 0,
                missRate: 0,
                totalRequests: this.stats.totalRequests,
                memoryUsage: 0,
                connectedClients: 0,
            };
        }
    }
    // Performance optimization methods
    async mget(keys) {
        try {
            const redisKeys = keys.map((key) => this.buildKey(key));
            const values = await this.client.mGet(redisKeys);
            return values.map((value) => {
                if (value === null) {
                    this.stats.misses++;
                    return null;
                }
                this.stats.hits++;
                return JSON.parse(value);
            });
        }
        catch (error) {
            this.logger.error('Error in mget operation:', error);
            return keys.map(() => null);
        }
    }
    async mset(keyValuePairs) {
        try {
            const pipeline = this.client.multi();
            for (const { key, value, ttl } of keyValuePairs) {
                const redisKey = this.buildKey(key);
                const serializedValue = JSON.stringify(value);
                if (ttl) {
                    pipeline.setEx(redisKey, ttl, serializedValue);
                }
                else {
                    pipeline.set(redisKey, serializedValue);
                }
            }
            await pipeline.exec();
            this.logger.debug(`Batch set ${keyValuePairs.length} keys`);
        }
        catch (error) {
            this.logger.error('Error in mset operation:', error);
            throw error;
        }
    }
    async increment(key, amount = 1) {
        try {
            const redisKey = this.buildKey(key);
            return await this.client.incrBy(redisKey, amount);
        }
        catch (error) {
            this.logger.error(`Error incrementing key ${key}:`, error);
            throw error;
        }
    }
    async expire(key, ttl) {
        try {
            const redisKey = this.buildKey(key);
            await this.client.expire(redisKey, ttl);
        }
        catch (error) {
            this.logger.error(`Error setting expiration for key ${key}:`, error);
            throw error;
        }
    }
}
exports.RedisCache = RedisCache;
//# sourceMappingURL=RedisCache.js.map