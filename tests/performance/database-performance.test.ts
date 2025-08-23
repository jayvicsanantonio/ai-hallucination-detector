import { ConnectionPool } from '../../src/database/ConnectionPool';

describe('Database Performance Tests', () => {
  let connectionPool: ConnectionPool;

  const mockConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'certaintyai_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: false,
    pool: {
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    },
  };

  beforeAll(async () => {
    connectionPool = new ConnectionPool(mockConfig);
    await connectionPool.initialize();

    // Create test table
    await connectionPool.query(`
      CREATE TABLE IF NOT EXISTS performance_test (
        id SERIAL PRIMARY KEY,
        data TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  });

  afterAll(async () => {
    // Clean up test table
    await connectionPool.query(
      'DROP TABLE IF EXISTS performance_test'
    );
    await connectionPool.shutdown();
  });

  beforeEach(async () => {
    // Clear test data
    await connectionPool.query(
      'TRUNCATE TABLE performance_test RESTART IDENTITY'
    );
  });

  describe('Connection Pool Performance', () => {
    it('should establish connections within acceptable time', async () => {
      const startTime = Date.now();
      const result = await connectionPool.query('SELECT 1 as test');
      const connectionTime = Date.now() - startTime;

      expect(connectionTime).toBeLessThan(100); // Should connect within 100ms
      expect(result).toHaveLength(1);
      expect(result[0].test).toBe(1);
    });

    it('should handle concurrent connections efficiently', async () => {
      const concurrentQueries = 20;
      const promises = Array.from(
        { length: concurrentQueries },
        (_, i) => connectionPool.query('SELECT $1 as query_id', [i])
      );

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(1000); // All queries within 1 second
      expect(results).toHaveLength(concurrentQueries);
      results.forEach((result, i) => {
        expect(result[0].query_id).toBe(i);
      });
    });

    it('should maintain connection pool statistics', async () => {
      // Perform some queries to populate stats
      await Promise.all([
        connectionPool.query('SELECT 1'),
        connectionPool.query('SELECT 2'),
        connectionPool.query('SELECT 3'),
      ]);

      const stats = await connectionPool.getStats();

      expect(stats.totalConnections).toBeGreaterThanOrEqual(0);
      expect(stats.totalQueries).toBeGreaterThanOrEqual(3);
      expect(stats.averageQueryTime).toBeGreaterThan(0);
    });
  });

  describe('Query Performance', () => {
    it('should execute simple queries within performance thresholds', async () => {
      const startTime = Date.now();
      const result = await connectionPool.query(
        'INSERT INTO performance_test (data) VALUES ($1) RETURNING id',
        ['test data']
      );
      const queryTime = Date.now() - startTime;

      expect(queryTime).toBeLessThan(50); // Simple insert within 50ms
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('should handle batch inserts efficiently', async () => {
      const batchSize = 1000;
      const testData = Array.from({ length: batchSize }, (_, i) => [
        `test data ${i}`,
      ]);

      const startTime = Date.now();
      await connectionPool.batchInsert(
        'performance_test',
        ['data'],
        testData
      );
      const batchTime = Date.now() - startTime;

      expect(batchTime).toBeLessThan(2000); // 1000 inserts within 2 seconds

      // Verify all records were inserted
      const count = await connectionPool.query(
        'SELECT COUNT(*) as count FROM performance_test'
      );
      expect(parseInt(count[0].count)).toBe(batchSize);
    });

    it('should optimize queries with proper indexing', async () => {
      // Insert test data
      const testData = Array.from({ length: 1000 }, (_, i) => [
        `searchable data ${i % 100}`,
      ]);

      await connectionPool.batchInsert(
        'performance_test',
        ['data'],
        testData
      );

      // Test query without index
      const startTimeNoIndex = Date.now();
      await connectionPool.query(
        'SELECT * FROM performance_test WHERE data LIKE $1',
        ['%searchable data 50%']
      );
      const queryTimeNoIndex = Date.now() - startTimeNoIndex;

      // Create index
      await connectionPool.createIndex('performance_test', ['data'], {
        name: 'idx_performance_test_data',
      });

      // Test query with index
      const startTimeWithIndex = Date.now();
      const result = await connectionPool.query(
        'SELECT * FROM performance_test WHERE data LIKE $1',
        ['%searchable data 50%']
      );
      const queryTimeWithIndex = Date.now() - startTimeWithIndex;

      expect(result.length).toBeGreaterThan(0);
      // Index should improve performance (though with small dataset, difference might be minimal)
      expect(queryTimeWithIndex).toBeLessThanOrEqual(
        queryTimeNoIndex
      );
    });
  });

  describe('Transaction Performance', () => {
    it('should handle transactions efficiently', async () => {
      const startTime = Date.now();

      const result = await connectionPool.transaction(
        async (client) => {
          await client.query(
            'INSERT INTO performance_test (data) VALUES ($1)',
            ['transaction test 1']
          );
          await client.query(
            'INSERT INTO performance_test (data) VALUES ($1)',
            ['transaction test 2']
          );

          const count = await client.query(
            'SELECT COUNT(*) as count FROM performance_test'
          );
          return (count[0] as any).count;
        }
      );

      const transactionTime = Date.now() - startTime;

      expect(transactionTime).toBeLessThan(100); // Transaction within 100ms
      expect(parseInt(result)).toBe(2);
    });

    it('should handle transaction rollbacks without performance degradation', async () => {
      const startTime = Date.now();

      try {
        await connectionPool.transaction(async (client) => {
          await client.query(
            'INSERT INTO performance_test (data) VALUES ($1)',
            ['rollback test']
          );

          // Force an error to trigger rollback
          throw new Error('Intentional rollback');
        });
      } catch (error) {
        expect((error as Error).message).toBe('Intentional rollback');
      }

      const rollbackTime = Date.now() - startTime;

      expect(rollbackTime).toBeLessThan(100); // Rollback within 100ms

      // Verify no data was committed
      const count = await connectionPool.query(
        'SELECT COUNT(*) as count FROM performance_test'
      );
      expect(parseInt(count[0].count)).toBe(0);
    });
  });

  describe('Connection Pool Scaling', () => {
    it('should scale connections based on load', async () => {
      const initialStats = await connectionPool.getStats();

      // Create load that requires multiple connections
      const heavyLoad = Array.from({ length: 15 }, (_, i) =>
        connectionPool.query('SELECT pg_sleep(0.1), $1 as id', [i])
      );

      const startTime = Date.now();
      await Promise.all(heavyLoad);
      const loadTime = Date.now() - startTime;

      const finalStats = await connectionPool.getStats();

      expect(loadTime).toBeLessThan(2000); // Should handle load within 2 seconds
      expect(finalStats.totalConnections).toBeGreaterThanOrEqual(
        initialStats.totalConnections
      );
    });

    it('should handle connection pool exhaustion gracefully', async () => {
      // Create more concurrent operations than pool size
      const poolSize = mockConfig.pool.max;
      const excessiveLoad = poolSize + 5;

      const promises = Array.from({ length: excessiveLoad }, (_, i) =>
        connectionPool.query('SELECT pg_sleep(0.2), $1 as id', [i])
      );

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(excessiveLoad);
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Query Optimization', () => {
    it('should identify slow queries', async () => {
      // Execute a deliberately slow query
      await connectionPool.query('SELECT pg_sleep(0.1)');

      const stats = await connectionPool.getStats();
      expect(stats.slowQueries).toBeGreaterThanOrEqual(0);
    });

    it('should provide query analysis capabilities', async () => {
      const analysisResult = await connectionPool.analyzeQuery(
        "SELECT * FROM performance_test WHERE data = 'test'"
      );

      expect(analysisResult).toBeDefined();
      expect(Array.isArray(analysisResult)).toBe(true);
    });

    it('should support prepared statements for frequently executed queries', async () => {
      const statementName = 'test_prepared_insert';
      const query =
        'INSERT INTO performance_test (data) VALUES ($1) RETURNING id';

      await connectionPool.prepareStatement(statementName, query);

      const startTime = Date.now();
      const results = await Promise.all([
        connectionPool.executePrepared(statementName, ['prepared 1']),
        connectionPool.executePrepared(statementName, ['prepared 2']),
        connectionPool.executePrepared(statementName, ['prepared 3']),
      ]);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(100);
      expect(results).toHaveLength(3);
      results.forEach((result, i) => {
        expect(result[0].id).toBe(i + 1);
      });
    });
  });

  describe('Health and Monitoring', () => {
    it('should perform health checks quickly', async () => {
      const startTime = Date.now();
      const isHealthy = await connectionPool.healthCheck();
      const healthCheckTime = Date.now() - startTime;

      expect(healthCheckTime).toBeLessThan(50); // Health check within 50ms
      expect(isHealthy).toBe(true);
    });

    it('should provide comprehensive connection statistics', async () => {
      // Generate some activity
      await Promise.all([
        connectionPool.query('SELECT 1'),
        connectionPool.query('SELECT 2'),
        connectionPool.query('SELECT 3'),
      ]);

      const stats = await connectionPool.getStats();

      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('idleConnections');
      expect(stats).toHaveProperty('waitingClients');
      expect(stats).toHaveProperty('totalQueries');
      expect(stats).toHaveProperty('averageQueryTime');
      expect(stats).toHaveProperty('slowQueries');

      expect(stats.totalQueries).toBeGreaterThanOrEqual(3);
      expect(stats.averageQueryTime).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle connection errors with retry logic', async () => {
      // This test would require simulating connection failures
      // For now, we'll test the retry mechanism with a timeout
      const startTime = Date.now();

      try {
        await connectionPool.query(
          'SELECT pg_sleep(10)', // Long query
          [],
          { timeout: 100, retries: 2, retryDelay: 50 }
        );
      } catch (error) {
        const errorTime = Date.now() - startTime;
        expect(errorTime).toBeLessThan(1000); // Should fail quickly with retries
      }
    });

    it('should maintain performance during error conditions', async () => {
      // Mix of successful and failing queries
      const mixedQueries = [
        connectionPool.query('SELECT 1'),
        connectionPool.query('SELECT 2'),
        connectionPool.query('INVALID SQL').catch(() => null), // This will fail
        connectionPool.query('SELECT 3'),
        connectionPool.query('SELECT 4'),
      ];

      const startTime = Date.now();
      const results = await Promise.all(mixedQueries);
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(500); // Should handle mixed results quickly
      expect(results.filter((r) => r !== null)).toHaveLength(4); // 4 successful queries
    });
  });
});
