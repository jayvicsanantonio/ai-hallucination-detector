import { PoolClient } from 'pg';
export interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: boolean;
    pool: {
        min: number;
        max: number;
        idleTimeoutMillis: number;
        connectionTimeoutMillis: number;
    };
}
export interface QueryOptions {
    timeout?: number;
    retries?: number;
    retryDelay?: number;
}
export interface ConnectionStats {
    totalConnections: number;
    idleConnections: number;
    waitingClients: number;
    totalQueries: number;
    averageQueryTime: number;
    slowQueries: number;
}
export declare class ConnectionPool {
    private config;
    private pool;
    private logger;
    private stats;
    constructor(config: DatabaseConfig);
    private setupEventHandlers;
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    query<T = any>(text: string, params?: any[], options?: QueryOptions): Promise<T[]>;
    transaction<T>(callback: (client: PoolClient) => Promise<T>, options?: QueryOptions): Promise<T>;
    batchInsert<T>(table: string, columns: string[], rows: T[][], options?: {
        batchSize?: number;
        onConflict?: string;
    }): Promise<void>;
    private preparedStatements;
    prepareStatement(name: string, query: string): Promise<void>;
    executePrepared<T = any>(name: string, params?: any[]): Promise<T[]>;
    getStats(): Promise<ConnectionStats>;
    healthCheck(): Promise<boolean>;
    private isRetryableError;
    private delay;
    analyzeQuery(query: string): Promise<any[]>;
    getSlowQueries(limit?: number): Promise<any[]>;
    createIndex(table: string, columns: string[], options?: {
        unique?: boolean;
        concurrent?: boolean;
        name?: string;
    }): Promise<void>;
}
//# sourceMappingURL=ConnectionPool.d.ts.map