import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
export const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    // Ramp up
    { duration: '2m', target: 10 }, // Ramp up to 10 users over 2 minutes
    { duration: '5m', target: 50 }, // Ramp up to 50 users over 5 minutes
    { duration: '10m', target: 100 }, // Ramp up to 100 users over 10 minutes

    // Sustained load
    { duration: '15m', target: 100 }, // Stay at 100 users for 15 minutes
    { duration: '10m', target: 200 }, // Spike to 200 users for 10 minutes
    { duration: '15m', target: 100 }, // Back to 100 users for 15 minutes

    // Ramp down
    { duration: '5m', target: 50 }, // Ramp down to 50 users
    { duration: '2m', target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
    http_req_failed: ['rate<0.05'], // Error rate should be below 5%
    errors: ['rate<0.05'], // Custom error rate should be below 5%
  },
};

// Base URL - adjust based on your deployment
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test data
const testContent = {
  small: 'This is a small test document for verification.',
  medium:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(
      50
    ),
  large:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(
      500
    ),
};

const domains = ['legal', 'financial', 'healthcare'];

export default function () {
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const contentSize = ['small', 'medium', 'large'][
    Math.floor(Math.random() * 3)
  ];
  const content = testContent[contentSize];

  // Test scenarios with different weights
  const scenario = Math.random();

  if (scenario < 0.4) {
    // 40% - Single document verification
    testSingleVerification(content, domain);
  } else if (scenario < 0.7) {
    // 30% - Batch verification
    testBatchVerification(domain);
  } else if (scenario < 0.9) {
    // 20% - Results retrieval
    testResultsRetrieval();
  } else {
    // 10% - Health checks and monitoring
    testHealthEndpoints();
  }

  // Random sleep between 1-3 seconds
  sleep(Math.random() * 2 + 1);
}

function testSingleVerification(content, domain) {
  const payload = JSON.stringify({
    content: content,
    contentType: 'text',
    domain: domain,
    urgency: 'medium',
    metadata: {
      source: 'load-test',
      timestamp: new Date().toISOString(),
    },
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-token',
    },
    timeout: '30s',
  };

  const response = http.post(
    `${BASE_URL}/api/v1/verify`,
    payload,
    params
  );

  const success = check(response, {
    'verification status is 200 or 202': (r) =>
      r.status === 200 || r.status === 202,
    'verification response time < 5s': (r) =>
      r.timings.duration < 5000,
    'verification has verificationId': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.verificationId !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (!success) {
    errorRate.add(1);
  }
}

function testBatchVerification(domain) {
  const batchSize = Math.floor(Math.random() * 5) + 1; // 1-5 documents
  const documents = [];

  for (let i = 0; i < batchSize; i++) {
    documents.push({
      id: `batch-doc-${i}`,
      content: testContent.small,
      contentType: 'text',
      domain: domain,
    });
  }

  const payload = JSON.stringify({ documents });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-token',
    },
    timeout: '60s',
  };

  const response = http.post(
    `${BASE_URL}/api/v1/verify/batch`,
    payload,
    params
  );

  const success = check(response, {
    'batch verification status is 200 or 202': (r) =>
      r.status === 200 || r.status === 202,
    'batch verification response time < 10s': (r) =>
      r.timings.duration < 10000,
    'batch verification has results': (r) => {
      try {
        const body = JSON.parse(r.body);
        return (
          Array.isArray(body.results) &&
          body.results.length === batchSize
        );
      } catch {
        return false;
      }
    },
  });

  if (!success) {
    errorRate.add(1);
  }
}

function testResultsRetrieval() {
  // Simulate retrieving results for a verification
  const verificationId = `test-${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  const params = {
    headers: {
      Authorization: 'Bearer test-token',
    },
    timeout: '10s',
  };

  const response = http.get(
    `${BASE_URL}/api/v1/results/${verificationId}`,
    params
  );

  const success = check(response, {
    'results retrieval status is 200 or 404': (r) =>
      r.status === 200 || r.status === 404,
    'results retrieval response time < 2s': (r) =>
      r.timings.duration < 2000,
  });

  if (!success && response.status !== 404) {
    errorRate.add(1);
  }
}

function testHealthEndpoints() {
  // Test health endpoint
  const healthResponse = http.get(`${BASE_URL}/health`, {
    timeout: '5s',
  });

  const healthSuccess = check(healthResponse, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 1s': (r) =>
      r.timings.duration < 1000,
  });

  // Test metrics endpoint (if available)
  const metricsResponse = http.get(`${BASE_URL}/metrics`, {
    timeout: '5s',
  });

  const metricsSuccess = check(metricsResponse, {
    'metrics endpoint accessible': (r) =>
      r.status === 200 || r.status === 401 || r.status === 403,
    'metrics response time < 2s': (r) => r.timings.duration < 2000,
  });

  if (!healthSuccess || !metricsSuccess) {
    errorRate.add(1);
  }
}

// Scenario-specific configurations
export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options = {}) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let summary = `
${indent}Load Test Summary
${indent}================
${indent}
${indent}Scenarios executed: ${data.metrics.iterations.values.count}
${indent}Total requests: ${data.metrics.http_reqs.values.count}
${indent}Failed requests: ${
    data.metrics.http_req_failed.values.count
  } (${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%)
${indent}
${indent}Response Times:
${indent}  Average: ${data.metrics.http_req_duration.values.avg.toFixed(
    2
  )}ms
${indent}  95th percentile: ${data.metrics.http_req_duration.values[
    'p(95)'
  ].toFixed(2)}ms
${indent}  99th percentile: ${data.metrics.http_req_duration.values[
    'p(99)'
  ].toFixed(2)}ms
${indent}
${indent}Throughput: ${data.metrics.http_reqs.values.rate.toFixed(
    2
  )} req/s
${indent}
${indent}Thresholds:
`;

  Object.entries(data.thresholds).forEach(([name, threshold]) => {
    const status = threshold.ok ? '✓' : '✗';
    summary += `${indent}  ${status} ${name}\n`;
  });

  return summary;
}
