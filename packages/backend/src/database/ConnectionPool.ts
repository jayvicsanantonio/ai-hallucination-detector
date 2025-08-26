import { Pool, PoolClient, PoolConfig } from 'pg';
import { Logger } from '../utils/Logger';

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

export class ConnectionPool {
  private pool: Pool;
  private logger: Logger;
  private stats = {
    totalQueries: 0,
    totalQueryTime: 0,
    slowQueries: 0,
    slowQueryThreshold: 1000, // 1 second
  };

  constructor(private config: DatabaseConfig) {
    this.logger = new Logger('ConnectionPool');

    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      min: config.pool.min,
      max: config.pool.max,
      idleTimeoutMillis: config.pool.idleTimeoutMillis,
      connectionTimeoutMillis: config.pool.connectionTimeoutMillis,
      // acquireTimeoutMillis: config.pool.acquireTimeoutMillis, // Not supported in pg
      // Connection validation
      allowExitOnIdle: true,
      // Error handling
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    };

    this.pool = new Pool(poolConfig);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.pool.on('connect', (client) => {
      this.logger.debug('New database connection established');

      // Set up client-specific configurations
      client.query('SET statement_timeout = 30000'); // 30 seconds
      client.query('SET lock_timeout = 10000'); // 10 seconds
      client.query('SET idle_in_transaction_session_timeout = 60000'); // 1 minute
    });

    this.pool.on('acquire', () => {
      this.logger.debug('Connection acquired from pool');
    });

    this.pool.on('release', () => {
      this.logger.debug('Connection released back to pool');
    });

    this.pool.on('remove', () => {
      this.logger.debug('Connection removed from pool');
    });

    this.pool.on('error', (err) => {
      this.logger.error('Database pool error:', err);
    });
  }

  async initialize(): Promise<void> {
    try {
      // Test the connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.logger.info(
        'Database connection pool initialized successfully'
      );
    } catch (error) {
      this.logger.error(
        'Failed to initialize database connection pool:',
        error
      );
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.pool.end();
      this.logger.info('Database connection pool closed');
    } catch (error) {
      this.logger.error(
        'Error closing database connection pool:',
        error
      );
      throw error;
    }
  }

  // Basic query execution with performance tracking
  async query<T = any>(
    text: string,
    params?: any[],
    options?: QueryOptions
  ): Promise<T[]> {
    const startTime = Date.now();
    let client: PoolClient | null = null;

    try {
      client = await this.pool.connect();

      // Set query timeout if specified
      if (options?.timeout) {
        await client.query(
          `SET statement_timeout = ${options.timeout}`
        );
      }

      const result = await client.query(text, params);
      const queryTime = Date.now() - startTime;

      // Update statistics
      this.stats.totalQueries++;
      this.stats.totalQueryTime += queryTime;

      if (queryTime > this.stats.slowQueryThreshold) {
        this.stats.slowQueries++;
        this.logger.warn(`Slow query detected (${queryTime}ms):`, {
          query: text.substring(0, 100),
          params: params?.slice(0, 5), // Log first 5 params only
        });
      }

      this.logger.debug(`Query executed in ${queryTime}ms`);
      return result.rows;
    } catch (error) {
      const queryTime = Date.now() - startTime;
      this.logger.error(`Query failed after ${queryTime}ms:`, {
        error: (error as Error).message,
        query: text.substring(0, 100),
        params: params?.slice(0, 5),
      });

      // Retry logic for transient errors
      if (
        options?.retries &&
        options.retries > 0 &&
        this.isRetryableError(error)
      ) {
        this.logger.info(
          `Retrying query (${options.retries} retries left)`
        );
        await this.delay(options.retryDelay || 100);
        return this.query(text, params, {
          ...options,
          retries: options.retries - 1,
        });
      }

      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  // Transaction support with automatic rollback
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>,
    options?: QueryOptions
  ): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      if (options?.timeout) {
        await client.query(
          `SET statement_timeout = ${options.timeout}`
        );
      }

      const result = await callback(client);
      await client.query('COMMIT');

      this.logger.debug('Transaction committed successfully');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error(
        'Transaction rolled back due to error:',
        error
      );
      throw error;
    } finally {
      client.release();
    }
  }

  // Batch operations for improved performance
  async batchInsert<T>(
    table: string,
    columns: string[],
    rows: T[][],
    options?: { batchSize?: number; onConflict?: string }
  ): Promise<void> {
    const batchSize = options?.batchSize || 1000;
    const onConflict = options?.onConflict || '';

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);

      // Build parameterized query
      const valuesClauses = batch.map((_, rowIndex) => {
        const paramNumbers = columns.map(
          (_, colIndex) =>
            `$${rowIndex * columns.length + colIndex + 1}`
        );
        return `(${paramNumbers.join(', ')})`;
      });

      const query = `
        INSERT INTO ${table} (${columns.join(', ')})
        VALUES ${valuesClauses.join(', ')}
        ${onConflict}
      `;

      const params = batch.flat();

      await this.query(query, params);
      this.logger.debug(
        `Batch inserted ${batch.length} rows into ${table}`
      );
    }
  }

  // Prepared statement support for frequently executed queries
  private preparedStatements = new Map<string, string>();

  async prepareStatement(name: string, query: string): Promise<void> {
    try {
      const client = await this.pool.connect();
      await client.query(`PREPARE ${name} AS ${query}`);
      client.release();

      this.preparedStatements.set(name, query);
      this.logger.debug(`Prepared statement '${name}' created`);
    } catch (error) {
      this.logger.error(
        `Failed to prepare statement '${name}':`,
        error
      );
      throw error;
    }
  }

  async executePrepared<T = any>(
    name: string,
    params?: any[]
  ): Promise<T[]> {
    if (!this.preparedStatements.has(name)) {
      throw new Error(`Prepared statement '${name}' not found`);
    }

    const query = `EXECUTE ${name}${
      params ? `(${params.map(() => '?').join(', ')})` : ''
    }`;
    return this.query<T>(query, params);
  }

  // Connection and performance monitoring
  async getStats(): Promise<ConnectionStats> {
    try {
      const poolStats = {
        totalConnections: this.pool.totalCount,
        idleConnections: this.pool.idleCount,
        waitingClients: this.pool.waitingCount,
      };

      const averageQueryTime =
        this.stats.totalQueries > 0
          ? this.stats.totalQueryTime / this.stats.totalQueries
          : 0;

      return {
        ...poolStats,
        totalQueries: this.stats.totalQueries,
        averageQueryTime: Math.round(averageQueryTime * 100) / 100,
        slowQueries: this.stats.slowQueries,
      };
    } catch (error) {
      this.logger.error('Error getting connection stats:', error);
      return {
        totalConnections: 0,
        idleConnections: 0,
        waitingClients: 0,
        totalQueries: this.stats.totalQueries,
        averageQueryTime: 0,
        slowQueries: this.stats.slowQueries,
      };
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as health_check');
      return result.length > 0 && result[0].health_check === 1;
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return false;
    }
  }

  // Utility methods
  private isRetryableError(error: any): boolean {
    const retryableErrors = [
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'connection terminated unexpectedly',
    ];

    return retryableErrors.some(
      (errorType) =>
        error.message?.includes(errorType) || error.code === errorType
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Query optimization helpers
  async analyzeQuery(query: string): Promise<any[]> {
    const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
    return this.query(explainQuery);
  }

  async getSlowQueries(limit: number = 10): Promise<any[]> {
    const query = `
      SELECT query, calls, total_time, mean_time, rows
      FROM pg_stat_statements
      ORDER BY total_time DESC
      LIMIT $1
    `;
    return this.query(query, [limit]);
  }

  // Index management
  async createIndex(
    table: string,
    columns: string[],
    options?: {
      unique?: boolean;
      concurrent?: boolean;
      name?: string;
    }
  ): Promise<void> {
    const indexName =
      options?.name || `idx_${table}_${columns.join('_')}`;
    const unique = options?.unique ? 'UNIQUE' : '';
    const concurrent = options?.concurrent ? 'CONCURRENTLY' : '';

    const query = `
      CREATE ${unique} INDEX ${concurrent} ${indexName}
      ON ${table} (${columns.join(', ')})
    `;

    await this.query(query);
    this.logger.info(`Created index ${indexName} on ${table}`);
  }
}
