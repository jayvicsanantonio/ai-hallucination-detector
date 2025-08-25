import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

let testDbPool: Pool | null = null;

export async function setupTestDatabase(): Promise<Pool> {
  const dbConfig = {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    database: process.env.TEST_DB_NAME || 'certaintyai_test',
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'password',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };

  testDbPool = new Pool(dbConfig);

  try {
    // Test connection
    const client = await testDbPool.connect();
    client.release();

    // Run migrations
    await runMigrations(testDbPool);

    // Seed test data
    await seedTestData(testDbPool);

    console.log('✅ Test database setup complete');
    return testDbPool;
  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    throw error;
  }
}

export async function cleanupTestDatabase(pool: Pool): Promise<void> {
  if (!pool) return;

  try {
    // Clean up test data
    await pool.query('TRUNCATE TABLE verification_sessions CASCADE');
    await pool.query('TRUNCATE TABLE audit_entries CASCADE');
    await pool.query('TRUNCATE TABLE feedback_data CASCADE');
    await pool.query('TRUNCATE TABLE compliance_rules CASCADE');
    await pool.query('TRUNCATE TABLE factual_claims CASCADE');

    // Close pool
    await pool.end();
    testDbPool = null;

    console.log('✅ Test database cleanup complete');
  } catch (error) {
    console.error('❌ Test database cleanup failed:', error);
  }
}

async function runMigrations(pool: Pool): Promise<void> {
  const migrationsDir = path.join(
    __dirname,
    '../../src/database/migrations'
  );

  if (!fs.existsSync(migrationsDir)) {
    console.log(
      '⚠️ No migrations directory found, skipping migrations'
    );
    return;
  }

  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const migrationPath = path.join(migrationsDir, file);
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    try {
      await pool.query(migrationSql);
      console.log(`✅ Migration applied: ${file}`);
    } catch (error) {
      console.error(`❌ Migration failed: ${file}`, error);
      throw error;
    }
  }
}

async function seedTestData(pool: Pool): Promise<void> {
  // Insert test compliance rules
  await pool.query(`
    INSERT INTO compliance_rules (id, rule_text, regulation, jurisdiction, domain, severity, examples, last_updated)
    VALUES 
    ('test-rule-1', 'PII must be protected', 'HIPAA', 'US', 'healthcare', 'high', '["SSN", "Medical records"]', NOW()),
    ('test-rule-2', 'Financial calculations must be accurate', 'SOX', 'US', 'financial', 'critical', '["Revenue calculations"]', NOW()),
    ('test-rule-3', 'Non-compete clauses limited to 2 years', 'State Law', 'CA', 'legal', 'medium', '["Employment contracts"]', NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  // Insert test factual claims
  await pool.query(`
    INSERT INTO factual_claims (id, statement, sources, confidence, domain, last_verified)
    VALUES 
    ('test-claim-1', 'Federal Reserve sets interest rates', '["fed.gov"]', 95, 'financial', NOW()),
    ('test-claim-2', 'Lisinopril is used for hypertension', '["fda.gov"]', 98, 'healthcare', NOW()),
    ('test-claim-3', 'California limits non-compete agreements', '["ca.gov"]', 92, 'legal', NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  console.log('✅ Test data seeded');
}

export async function createTestTransaction(
  pool: Pool
): Promise<any> {
  const client = await pool.connect();
  await client.query('BEGIN');

  return {
    query: client.query.bind(client),
    commit: async () => {
      await client.query('COMMIT');
      client.release();
    },
    rollback: async () => {
      await client.query('ROLLBACK');
      client.release();
    },
  };
}

export async function getTestDatabaseMetrics(
  pool: Pool
): Promise<any> {
  const result = await pool.query(`
    SELECT 
      (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) as active_connections,
      (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max_connections,
      pg_database_size(current_database()) as database_size
  `);

  return result.rows[0];
}
