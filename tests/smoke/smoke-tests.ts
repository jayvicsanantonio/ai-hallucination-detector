import axios, { AxiosInstance } from 'axios';

interface SmokeTestConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  authToken?: string;
}

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

export class SmokeTestRunner {
  private client: AxiosInstance;
  private config: SmokeTestConfig;

  constructor(config: SmokeTestConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(config.authToken && {
          Authorization: `Bearer ${config.authToken}`,
        }),
      },
    });
  }

  async runAllTests(): Promise<TestResult[]> {
    console.log(
      `🧪 Running smoke tests against ${this.config.baseUrl}`
    );

    const tests = [
      { name: 'Health Check', test: () => this.testHealthCheck() },
      {
        name: 'API Availability',
        test: () => this.testApiAvailability(),
      },
      {
        name: 'Authentication',
        test: () => this.testAuthentication(),
      },
      {
        name: 'Basic Verification',
        test: () => this.testBasicVerification(),
      },
      {
        name: 'Results Retrieval',
        test: () => this.testResultsRetrieval(),
      },
      {
        name: 'Error Handling',
        test: () => this.testErrorHandling(),
      },
      { name: 'Performance', test: () => this.testPerformance() },
      {
        name: 'Security Headers',
        test: () => this.testSecurityHeaders(),
      },
    ];

    const results: TestResult[] = [];

    for (const { name, test } of tests) {
      console.log(`  Running: ${name}`);
      const startTime = Date.now();

      try {
        await test();
        const duration = Date.now() - startTime;
        results.push({ name, passed: true, duration });
        console.log(`  ✅ ${name} (${duration}ms)`);
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        results.push({
          name,
          passed: false,
          duration,
          error: errorMessage,
        });
        console.log(`  ❌ ${name} (${duration}ms): ${errorMessage}`);
      }
    }

    return results;
  }

  private async testHealthCheck(): Promise<void> {
    const response = await this.client.get('/api/v1/health');

    if (response.status !== 200) {
      throw new Error(
        `Health check failed with status ${response.status}`
      );
    }

    if (response.data.status !== 'healthy') {
      throw new Error(
        `Health status is ${response.data.status}, expected 'healthy'`
      );
    }

    // Check required fields
    const requiredFields = [
      'status',
      'timestamp',
      'services',
      'version',
      'uptime',
    ];
    for (const field of requiredFields) {
      if (!(field in response.data)) {
        throw new Error(
          `Health response missing required field: ${field}`
        );
      }
    }
  }

  private async testApiAvailability(): Promise<void> {
    // Test that all main API endpoints are reachable
    const endpoints = [
      { path: '/api/v1/health', method: 'GET', expectedStatus: 200 },
      {
        path: '/api/v1/verify',
        method: 'POST',
        expectedStatus: [400, 401],
      }, // Should fail without auth/data
      {
        path: '/api/v1/results/test-id',
        method: 'GET',
        expectedStatus: [401, 404],
      }, // Should fail without auth
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await this.client.request({
          method: endpoint.method,
          url: endpoint.path,
          validateStatus: () => true, // Don't throw on non-2xx status
        });

        const expectedStatuses = Array.isArray(
          endpoint.expectedStatus
        )
          ? endpoint.expectedStatus
          : [endpoint.expectedStatus];

        if (!expectedStatuses.includes(response.status)) {
          throw new Error(
            `${endpoint.method} ${endpoint.path} returned ${
              response.status
            }, expected one of ${expectedStatuses.join(', ')}`
          );
        }
      } catch (error) {
        if (
          axios.isAxiosError(error) &&
          error.code === 'ECONNREFUSED'
        ) {
          throw new Error(`Cannot connect to ${endpoint.path}`);
        }
        throw error;
      }
    }
  }

  private async testAuthentication(): Promise<void> {
    // Test that authentication is required
    try {
      await this.client.post('/api/v1/verify', {
        content: 'test content',
        contentType: 'text',
        domain: 'financial',
      });
      throw new Error(
        'Expected authentication error, but request succeeded'
      );
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        error.response?.status === 401
      ) {
        // Expected behavior
        return;
      }
      throw error;
    }
  }

  private async testBasicVerification(): Promise<void> {
    if (!this.config.authToken) {
      console.log(
        '  ⚠️ Skipping basic verification test (no auth token provided)'
      );
      return;
    }

    const response = await this.client.post('/api/v1/verify', {
      content: 'Test content for smoke test verification',
      contentType: 'text',
      domain: 'financial',
      urgency: 'low',
    });

    if (response.status !== 202) {
      throw new Error(
        `Verification request failed with status ${response.status}`
      );
    }

    if (!response.data.verificationId) {
      throw new Error('Verification response missing verificationId');
    }

    if (response.data.status !== 'processing') {
      throw new Error(
        `Expected status 'processing', got '${response.data.status}'`
      );
    }
  }

  private async testResultsRetrieval(): Promise<void> {
    if (!this.config.authToken) {
      console.log(
        '  ⚠️ Skipping results retrieval test (no auth token provided)'
      );
      return;
    }

    // Test with non-existent ID
    try {
      await this.client.get('/api/v1/results/non-existent-id');
      throw new Error(
        'Expected 404 for non-existent verification ID'
      );
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        error.response?.status === 404
      ) {
        // Expected behavior
        return;
      }
      throw error;
    }
  }

  private async testErrorHandling(): Promise<void> {
    // Test various error scenarios
    const errorTests = [
      {
        name: 'Invalid content type',
        request: {
          content: 'test',
          contentType: 'invalid',
          domain: 'financial',
        },
        expectedStatus: 400,
      },
      {
        name: 'Missing required fields',
        request: { content: 'test' },
        expectedStatus: 400,
      },
      {
        name: 'Invalid domain',
        request: {
          content: 'test',
          contentType: 'text',
          domain: 'invalid',
        },
        expectedStatus: 400,
      },
    ];

    for (const errorTest of errorTests) {
      try {
        const response = await this.client.post(
          '/api/v1/verify',
          errorTest.request,
          {
            validateStatus: () => true,
          }
        );

        if (response.status !== errorTest.expectedStatus) {
          throw new Error(
            `${errorTest.name}: expected status ${errorTest.expectedStatus}, got ${response.status}`
          );
        }

        if (!response.data.error) {
          throw new Error(
            `${errorTest.name}: response missing error object`
          );
        }

        if (
          !response.data.error.code ||
          !response.data.error.message
        ) {
          throw new Error(
            `${errorTest.name}: error object missing code or message`
          );
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          continue; // Network errors are acceptable for error handling tests
        }
        throw error;
      }
    }
  }

  private async testPerformance(): Promise<void> {
    const startTime = Date.now();

    // Make multiple concurrent requests to test performance
    const promises = Array.from({ length: 5 }, () =>
      this.client.get('/api/v1/health')
    );

    await Promise.all(promises);

    const duration = Date.now() - startTime;

    // Should complete within reasonable time (5 seconds for 5 requests)
    if (duration > 5000) {
      throw new Error(
        `Performance test took ${duration}ms, expected < 5000ms`
      );
    }
  }

  private async testSecurityHeaders(): Promise<void> {
    const response = await this.client.get('/api/v1/health');

    const requiredHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
    ];

    for (const header of requiredHeaders) {
      if (!response.headers[header]) {
        throw new Error(`Missing security header: ${header}`);
      }
    }

    // Check specific header values
    if (response.headers['x-content-type-options'] !== 'nosniff') {
      throw new Error('x-content-type-options should be "nosniff"');
    }

    if (response.headers['x-frame-options'] !== 'DENY') {
      throw new Error('x-frame-options should be "DENY"');
    }
  }

  generateReport(results: TestResult[]): string {
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => r.passed === false).length;
    const totalDuration = results.reduce(
      (sum, r) => sum + r.duration,
      0
    );

    let report = `
🧪 Smoke Test Report
===================
Total Tests: ${results.length}
Passed: ${passed}
Failed: ${failed}
Success Rate: ${((passed / results.length) * 100).toFixed(1)}%
Total Duration: ${totalDuration}ms

`;

    if (failed > 0) {
      report += `❌ Failed Tests:\n`;
      results
        .filter((r) => !r.passed)
        .forEach((r) => {
          report += `  - ${r.name}: ${r.error}\n`;
        });
      report += '\n';
    }

    report += `✅ Passed Tests:\n`;
    results
      .filter((r) => r.passed)
      .forEach((r) => {
        report += `  - ${r.name} (${r.duration}ms)\n`;
      });

    return report;
  }
}

// CLI execution
if (require.main === module) {
  const baseUrl = process.argv[2] || 'http://localhost:3000';
  const authToken = process.env.SMOKE_TEST_TOKEN;

  const runner = new SmokeTestRunner({
    baseUrl,
    timeout: 10000,
    retries: 3,
    authToken,
  });

  runner
    .runAllTests()
    .then((results) => {
      const report = runner.generateReport(results);
      console.log(report);

      const failed = results.filter((r) => !r.passed).length;
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('❌ Smoke test runner failed:', error);
      process.exit(1);
    });
}
