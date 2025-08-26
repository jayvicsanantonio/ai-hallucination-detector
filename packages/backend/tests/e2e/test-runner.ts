import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: number;
  errors: string[];
}

interface TestReport {
  timestamp: Date;
  environment: string;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  totalDuration: number;
  overallCoverage: number;
  suites: TestResult[];
  summary: {
    success: boolean;
    passRate: number;
    coverageThreshold: number;
    meetsRequirements: boolean;
  };
}

export class IntegrationTestRunner {
  private testSuites = [
    'verification-workflows',
    'performance-benchmarks',
    'security-penetration',
  ];

  private coverageThreshold = 80;
  private performanceThresholds = {
    responseTime: 2000, // 2 seconds
    throughput: 167, // per minute (10,000/hour)
    successRate: 95, // percentage
  };

  async runAllTests(): Promise<TestReport> {
    console.log(
      '🚀 Starting comprehensive integration test suite...\n'
    );

    const report: TestReport = {
      timestamp: new Date(),
      environment: process.env.NODE_ENV || 'test',
      totalTests: 0,
      totalPassed: 0,
      totalFailed: 0,
      totalSkipped: 0,
      totalDuration: 0,
      overallCoverage: 0,
      suites: [],
      summary: {
        success: false,
        passRate: 0,
        coverageThreshold: this.coverageThreshold,
        meetsRequirements: false,
      },
    };

    // Setup test environment
    await this.setupTestEnvironment();

    try {
      // Run each test suite
      for (const suite of this.testSuites) {
        console.log(`📋 Running ${suite} test suite...`);
        const result = await this.runTestSuite(suite);
        report.suites.push(result);

        report.totalTests +=
          result.passed + result.failed + result.skipped;
        report.totalPassed += result.passed;
        report.totalFailed += result.failed;
        report.totalSkipped += result.skipped;
        report.totalDuration += result.duration;
      }

      // Generate coverage report
      report.overallCoverage = await this.generateCoverageReport();

      // Calculate summary metrics
      report.summary.passRate =
        (report.totalPassed / report.totalTests) * 100;
      report.summary.success = report.totalFailed === 0;
      report.summary.meetsRequirements =
        this.validateRequirements(report);

      // Generate reports
      await this.generateHtmlReport(report);
      await this.generateJsonReport(report);
      await this.generateJunitReport(report);

      console.log('\n📊 Test execution completed!');
      this.printSummary(report);

      return report;
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      throw error;
    } finally {
      await this.cleanupTestEnvironment();
    }
  }

  private async setupTestEnvironment(): Promise<void> {
    console.log('🔧 Setting up test environment...');

    // Start test database
    try {
      execSync(
        'docker-compose -f docker-compose.test.yml up -d postgres redis',
        {
          stdio: 'inherit',
        }
      );

      // Wait for services to be ready
      await new Promise((resolve) => setTimeout(resolve, 10000));

      // Run database migrations
      execSync('npm run db:migrate:test', { stdio: 'inherit' });

      console.log('✅ Test environment ready');
    } catch (error) {
      console.error('❌ Failed to setup test environment:', error);
      throw error;
    }
  }

  private async runTestSuite(suiteName: string): Promise<TestResult> {
    const startTime = Date.now();
    const result: TestResult = {
      suite: suiteName,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      errors: [],
    };

    try {
      // Run Jest for specific test suite
      const output = execSync(
        `npx jest tests/e2e/${suiteName}.test.ts --json --coverage`,
        { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 }
      );

      const jestResult = JSON.parse(output);

      if (
        jestResult.testResults &&
        jestResult.testResults.length > 0
      ) {
        const testResult = jestResult.testResults[0];

        result.passed = testResult.numPassingTests || 0;
        result.failed = testResult.numFailingTests || 0;
        result.skipped = testResult.numPendingTests || 0;

        // Collect error messages
        if (testResult.assertionResults) {
          testResult.assertionResults.forEach((assertion: any) => {
            if (assertion.status === 'failed') {
              result.errors.push(
                assertion.failureMessages?.join('\n') ||
                  'Unknown error'
              );
            }
          });
        }
      }

      result.duration = Date.now() - startTime;

      console.log(
        `✅ ${suiteName}: ${result.passed} passed, ${result.failed} failed, ${result.skipped} skipped`
      );
    } catch (error) {
      result.failed = 1;
      result.errors.push(
        error instanceof Error ? error.message : String(error)
      );
      result.duration = Date.now() - startTime;

      console.log(`❌ ${suiteName}: Test suite failed - ${error}`);
    }

    return result;
  }

  private async generateCoverageReport(): Promise<number> {
    try {
      console.log('📈 Generating coverage report...');

      // Run coverage analysis
      execSync(
        'npx jest --coverage --coverageReporters=json-summary',
        {
          stdio: 'pipe',
        }
      );

      // Read coverage summary
      const coveragePath = path.join(
        process.cwd(),
        'coverage',
        'coverage-summary.json'
      );
      if (fs.existsSync(coveragePath)) {
        const coverageData = JSON.parse(
          fs.readFileSync(coveragePath, 'utf8')
        );
        return coverageData.total.lines.pct || 0;
      }

      return 0;
    } catch (error) {
      console.warn('⚠️ Could not generate coverage report:', error);
      return 0;
    }
  }

  private validateRequirements(report: TestReport): boolean {
    const requirements = {
      passRate: report.summary.passRate >= 95,
      coverage: report.overallCoverage >= this.coverageThreshold,
      noFailures: report.totalFailed === 0,
    };

    // Check performance requirements from performance test results
    const performanceSuite = report.suites.find(
      (s) => s.suite === 'performance-benchmarks'
    );
    const performanceOk = performanceSuite
      ? performanceSuite.failed === 0
      : false;

    // Check security requirements from security test results
    const securitySuite = report.suites.find(
      (s) => s.suite === 'security-penetration'
    );
    const securityOk = securitySuite
      ? securitySuite.failed === 0
      : false;

    return (
      requirements.passRate &&
      requirements.coverage &&
      requirements.noFailures &&
      performanceOk &&
      securityOk
    );
  }

  private async generateHtmlReport(
    report: TestReport
  ): Promise<void> {
    const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <title>CertaintyAI Integration Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: white; padding: 15px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .success { color: #28a745; }
        .failure { color: #dc3545; }
        .warning { color: #ffc107; }
        .suite { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .errors { background: #f8d7da; padding: 10px; border-radius: 3px; margin-top: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>CertaintyAI Integration Test Report</h1>
        <p><strong>Timestamp:</strong> ${report.timestamp.toISOString()}</p>
        <p><strong>Environment:</strong> ${report.environment}</p>
        <p><strong>Status:</strong> <span class="${
          report.summary.success ? 'success' : 'failure'
        }">
            ${report.summary.success ? '✅ PASSED' : '❌ FAILED'}
        </span></p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>Tests</h3>
            <p><strong>${report.totalTests}</strong> total</p>
            <p class="success">${report.totalPassed} passed</p>
            <p class="failure">${report.totalFailed} failed</p>
            <p class="warning">${report.totalSkipped} skipped</p>
        </div>
        <div class="metric">
            <h3>Pass Rate</h3>
            <p><strong>${report.summary.passRate.toFixed(
              1
            )}%</strong></p>
        </div>
        <div class="metric">
            <h3>Coverage</h3>
            <p><strong>${report.overallCoverage.toFixed(
              1
            )}%</strong></p>
            <p>Threshold: ${report.summary.coverageThreshold}%</p>
        </div>
        <div class="metric">
            <h3>Duration</h3>
            <p><strong>${(report.totalDuration / 1000).toFixed(
              1
            )}s</strong></p>
        </div>
    </div>

    <h2>Test Suites</h2>
    ${report.suites
      .map(
        (suite) => `
        <div class="suite">
            <h3>${suite.suite}</h3>
            <table>
                <tr>
                    <th>Metric</th>
                    <th>Value</th>
                </tr>
                <tr>
                    <td>Passed</td>
                    <td class="success">${suite.passed}</td>
                </tr>
                <tr>
                    <td>Failed</td>
                    <td class="failure">${suite.failed}</td>
                </tr>
                <tr>
                    <td>Skipped</td>
                    <td class="warning">${suite.skipped}</td>
                </tr>
                <tr>
                    <td>Duration</td>
                    <td>${(suite.duration / 1000).toFixed(1)}s</td>
                </tr>
            </table>
            ${
              suite.errors.length > 0
                ? `
                <div class="errors">
                    <h4>Errors:</h4>
                    ${suite.errors
                      .map((error) => `<pre>${error}</pre>`)
                      .join('')}
                </div>
            `
                : ''
            }
        </div>
    `
      )
      .join('')}

    <h2>Requirements Validation</h2>
    <table>
        <tr>
            <th>Requirement</th>
            <th>Status</th>
            <th>Details</th>
        </tr>
        <tr>
            <td>Response Time (&lt; 2s)</td>
            <td class="${
              report.suites.find(
                (s) => s.suite === 'performance-benchmarks'
              )?.failed === 0
                ? 'success'
                : 'failure'
            }">
                ${
                  report.suites.find(
                    (s) => s.suite === 'performance-benchmarks'
                  )?.failed === 0
                    ? '✅'
                    : '❌'
                }
            </td>
            <td>Verified in performance benchmarks</td>
        </tr>
        <tr>
            <td>Throughput (10,000/hour)</td>
            <td class="${
              report.suites.find(
                (s) => s.suite === 'performance-benchmarks'
              )?.failed === 0
                ? 'success'
                : 'failure'
            }">
                ${
                  report.suites.find(
                    (s) => s.suite === 'performance-benchmarks'
                  )?.failed === 0
                    ? '✅'
                    : '❌'
                }
            </td>
            <td>Verified in throughput tests</td>
        </tr>
        <tr>
            <td>Security Controls</td>
            <td class="${
              report.suites.find(
                (s) => s.suite === 'security-penetration'
              )?.failed === 0
                ? 'success'
                : 'failure'
            }">
                ${
                  report.suites.find(
                    (s) => s.suite === 'security-penetration'
                  )?.failed === 0
                    ? '✅'
                    : '❌'
                }
            </td>
            <td>Verified in security penetration tests</td>
        </tr>
        <tr>
            <td>Code Coverage (&gt; ${
              report.summary.coverageThreshold
            }%)</td>
            <td class="${
              report.overallCoverage >=
              report.summary.coverageThreshold
                ? 'success'
                : 'failure'
            }">
                ${
                  report.overallCoverage >=
                  report.summary.coverageThreshold
                    ? '✅'
                    : '❌'
                }
            </td>
            <td>${report.overallCoverage.toFixed(
              1
            )}% coverage achieved</td>
        </tr>
    </table>
</body>
</html>`;

    const reportPath = path.join(
      process.cwd(),
      'test-reports',
      'integration-report.html'
    );
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, htmlTemplate);

    console.log(`📄 HTML report generated: ${reportPath}`);
  }

  private async generateJsonReport(
    report: TestReport
  ): Promise<void> {
    const reportPath = path.join(
      process.cwd(),
      'test-reports',
      'integration-report.json'
    );
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`📄 JSON report generated: ${reportPath}`);
  }

  private async generateJunitReport(
    report: TestReport
  ): Promise<void> {
    const junitXml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="CertaintyAI Integration Tests" 
           tests="${report.totalTests}" 
           failures="${report.totalFailed}" 
           skipped="${report.totalSkipped}" 
           time="${(report.totalDuration / 1000).toFixed(3)}">
  ${report.suites
    .map(
      (suite) => `
  <testsuite name="${suite.suite}" 
             tests="${suite.passed + suite.failed + suite.skipped}" 
             failures="${suite.failed}" 
             skipped="${suite.skipped}" 
             time="${(suite.duration / 1000).toFixed(3)}">
    ${suite.errors
      .map(
        (error, index) => `
    <testcase name="test-${index}" classname="${suite.suite}">
      <failure message="Test failed">${error}</failure>
    </testcase>`
      )
      .join('')}
  </testsuite>`
    )
    .join('')}
</testsuites>`;

    const reportPath = path.join(
      process.cwd(),
      'test-reports',
      'junit-report.xml'
    );
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, junitXml);

    console.log(`📄 JUnit report generated: ${reportPath}`);
  }

  private printSummary(report: TestReport): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 INTEGRATION TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(
      `Status: ${report.summary.success ? '✅ PASSED' : '❌ FAILED'}`
    );
    console.log(
      `Tests: ${report.totalPassed}/${
        report.totalTests
      } passed (${report.summary.passRate.toFixed(1)}%)`
    );
    console.log(
      `Coverage: ${report.overallCoverage.toFixed(1)}% (threshold: ${
        report.summary.coverageThreshold
      }%)`
    );
    console.log(
      `Duration: ${(report.totalDuration / 1000).toFixed(1)} seconds`
    );
    console.log(
      `Requirements Met: ${
        report.summary.meetsRequirements ? '✅ YES' : '❌ NO'
      }`
    );

    if (report.totalFailed > 0) {
      console.log('\n❌ FAILED TESTS:');
      report.suites.forEach((suite) => {
        if (suite.failed > 0) {
          console.log(`  - ${suite.suite}: ${suite.failed} failures`);
          suite.errors.forEach((error) => {
            console.log(`    ${error.split('\n')[0]}`);
          });
        }
      });
    }

    console.log('\n📄 Reports generated in ./test-reports/');
    console.log('='.repeat(60));
  }

  private async cleanupTestEnvironment(): Promise<void> {
    console.log('🧹 Cleaning up test environment...');

    try {
      execSync('docker-compose -f docker-compose.test.yml down', {
        stdio: 'inherit',
      });
      console.log('✅ Test environment cleaned up');
    } catch (error) {
      console.warn('⚠️ Cleanup warning:', error);
    }
  }
}

// CLI execution
if (require.main === module) {
  const runner = new IntegrationTestRunner();

  runner
    .runAllTests()
    .then((report) => {
      process.exit(report.summary.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    });
}
