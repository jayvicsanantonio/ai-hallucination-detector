import { createClient, RedisClientType } from 'redis';

let testRedisClient: RedisClientType | null = null;

export async function setupTestRedis(): Promise<RedisClientType> {
  const redisConfig = {
    host: process.env.TEST_REDIS_HOST || 'localhost',
    port: parseInt(process.env.TEST_REDIS_PORT || '6379'),
    password: process.env.TEST_REDIS_PASSWORD,
    db: parseInt(process.env.TEST_REDIS_DB || '1'), // Use different DB for testing
  };

  testRedisClient = createClient({
    socket: {
      host: redisConfig.host,
      port: redisConfig.port,
    },
    password: redisConfig.password,
    database: redisConfig.db,
  });

  testRedisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  try {
    await testRedisClient.connect();

    // Test connection
    await testRedisClient.ping();

    // Clear test database
    await testRedisClient.flushDb();

    console.log('✅ Test Redis setup complete');
    return testRedisClient;
  } catch (error) {
    console.error('❌ Test Redis setup failed:', error);
    throw error;
  }
}

export async function cleanupTestRedis(
  client: RedisClientType
): Promise<void> {
  if (!client) return;

  try {
    // Clear test data
    await client.flushDb();

    // Disconnect
    await client.disconnect();
    testRedisClient = null;

    console.log('✅ Test Redis cleanup complete');
  } catch (error) {
    console.error('❌ Test Redis cleanup failed:', error);
  }
}

export async function seedTestRedisData(
  client: RedisClientType
): Promise<void> {
  // Cache some test verification results
  const testResults = [
    {
      key: 'verification:test-id-1',
      value: JSON.stringify({
        verificationId: 'test-id-1',
        status: 'completed',
        overallConfidence: 85,
        riskLevel: 'medium',
        issues: [],
        processingTime: 1500,
      }),
    },
    {
      key: 'verification:test-id-2',
      value: JSON.stringify({
        verificationId: 'test-id-2',
        status: 'processing',
        startTime: Date.now(),
      }),
    },
  ];

  for (const item of testResults) {
    await client.setEx(item.key, 3600, item.value); // 1 hour TTL
  }

  // Cache some performance metrics
  await client.hSet('metrics:performance', {
    avg_response_time: '1200',
    requests_per_minute: '150',
    success_rate: '98.5',
    last_updated: Date.now().toString(),
  });

  // Cache some system health data
  await client.hSet('health:system', {
    database: 'connected',
    verification_engine: 'operational',
    external_services: 'available',
    last_check: Date.now().toString(),
  });

  console.log('✅ Test Redis data seeded');
}

export async function getTestRedisMetrics(
  client: RedisClientType
): Promise<any> {
  const info = await client.info('memory');
  const keyCount = await client.dbSize();

  // Parse memory info
  const memoryLines = info.split('\r\n');
  const memoryUsed =
    memoryLines
      .find((line) => line.startsWith('used_memory:'))
      ?.split(':')[1] || '0';

  const memoryPeak =
    memoryLines
      .find((line) => line.startsWith('used_memory_peak:'))
      ?.split(':')[1] || '0';

  return {
    keyCount,
    memoryUsed: parseInt(memoryUsed),
    memoryPeak: parseInt(memoryPeak),
    connected: client.isReady,
  };
}

export async function createTestRedisTransaction(
  client: RedisClientType
): Promise<any> {
  const multi = client.multi();

  return {
    set: (key: string, value: string, ttl?: number) => {
      if (ttl) {
        multi.setEx(key, ttl, value);
      } else {
        multi.set(key, value);
      }
      return multi;
    },

    get: (key: string) => {
      multi.get(key);
      return multi;
    },

    del: (key: string) => {
      multi.del(key);
      return multi;
    },

    hSet: (key: string, field: string, value: string) => {
      multi.hSet(key, field, value);
      return multi;
    },

    hGet: (key: string, field: string) => {
      multi.hGet(key, field);
      return multi;
    },

    exec: () => multi.exec(),

    discard: () => multi.discard(),
  };
}
