import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
export const errorRate = new Rate('errors');

// Stress test configuration - aggressive load testing
export const options = {
  stages: [
    // Rapid ramp up to stress levels
    { duration: '1m', target: 50 }, // Quick ramp to 50 users
    { duration: '2m', target: 200 }, // Aggressive ramp to 200 users
    { duration: '3m', target: 500 }, // Stress level - 500 users
    { duration: '5m', target: 1000 }, // Peak stress - 1000 users

    // Sustained stress
    { duration: '10m', target: 1000 }, // Hold at peak for 10 minutes

    // Spike test
    { duration: '30s', target: 2000 }, // Sudden spike to 2000 users
    { duration: '1m', target: 2000 }, // Hold spike for 1 minute
    { duration: '30s', target: 1000 }, // Drop back to 1000

    // Recovery test
    { duration: '5m', target: 100 }, // Rapid scale down
    { duration: '2m', target: 0 }, // Complete ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% of requests should be below 5s (relaxed for stress)
    http_req_failed: ['rate<0.15'], // Error rate should be below 15% (relaxed for stress)
    errors: ['rate<0.15'], // Custom error rate should be below 15%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Stress test scenarios - more aggressive patterns
export default function () {
  const scenario = Math.random();

  if (scenario < 0.5) {
    // 50% - Heavy verification load
    stressVerificationEndpoint();
  } else if (scenario < 0.8) {
    // 30% - Concurrent batch processing
    stressBatchProcessing();
  } else {
    // 20% - Resource exhaustion tests
    stressResourceUsage();
  }

  // Minimal sleep for maximum stress
  sleep(Math.random() * 0.5);
}

function stressVerificationEndpoint() {
  // Large document for processing stress
  const largeContent =
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(
      1000
    );

  const payload = JSON.stringify({
    content: largeContent,
    contentType: 'text',
    domain: 'legal',
    urgency: 'high',
    options: {
      deepAnalysis: true,
      crossReference: true,
      complianceCheck: true,
    },
    metadata: {
      source: 'stress-test',
      timestamp: new Date().toISOString(),
      size: 'large',
    },
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer stress-test-token',
    },
    timeout: '60s',
  };

  const response = http.post(
    `${BASE_URL}/api/v1/verify`,
    payload,
    params
  );

  const success = check(response, {
    'stress verification completed': (r) =>
      r.status === 200 || r.status === 202 || r.status === 429,
    'stress verification response time acceptable': (r) =>
      r.timings.duration < 30000,
  });

  if (!success && response.status !== 429) {
    // 429 is expected under stress
    errorRate.add(1);
  }
}

function stressBatchProcessing() {
  // Large batch for memory and processing stress
  const batchSize = 20; // Larger batches
  const documents = [];

  for (let i = 0; i < batchSize; i++) {
    documents.push({
      id: `stress-batch-${i}-${Date.now()}`,
      content: 'Complex document content for stress testing. '.repeat(
        100
      ),
      contentType: 'text',
      domain: ['legal', 'financial', 'healthcare'][i % 3],
      options: {
        priority: 'high',
        thoroughAnalysis: true,
      },
    });
  }

  const payload = JSON.stringify({
    documents,
    options: {
      parallel: true,
      maxConcurrency: 10,
    },
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer stress-test-token',
    },
    timeout: '120s',
  };

  const response = http.post(
    `${BASE_URL}/api/v1/verify/batch`,
    payload,
    params
  );

  const success = check(response, {
    'stress batch processing handled': (r) =>
      r.status === 200 ||
      r.status === 202 ||
      r.status === 429 ||
      r.status === 503,
    'stress batch response time acceptable': (r) =>
      r.timings.duration < 60000,
  });

  if (!success && ![429, 503].includes(response.status)) {
    errorRate.add(1);
  }
}

function stressResourceUsage() {
  // Multiple concurrent requests to stress resources
  const requests = [];

  for (let i = 0; i < 5; i++) {
    const payload = JSON.stringify({
      content: `Resource stress test document ${i} `.repeat(200),
      contentType: 'text',
      domain: 'financial',
      options: {
        memoryIntensive: true,
        cpuIntensive: true,
      },
    });

    requests.push(
      http.asyncRequest(
        'POST',
        `${BASE_URL}/api/v1/verify`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer stress-test-token',
          },
          timeout: '45s',
        }
      )
    );
  }

  // Wait for all requests to complete
  const responses = requests.map((req) => req.response());

  responses.forEach((response, index) => {
    const success = check(response, {
      [`resource stress ${index} handled`]: (r) =>
        r.status < 500 || r.status === 503 || r.status === 429,
    });

    if (!success && ![429, 503].includes(response.status)) {
      errorRate.add(1);
    }
  });
}

export function handleSummary(data) {
  const summary = {
    testType: 'stress',
    timestamp: new Date().toISOString(),
    duration: data.state.testRunDurationMs,
    metrics: {
      totalRequests: data.metrics.http_reqs.values.count,
      failedRequests: data.metrics.http_req_failed.values.count,
      errorRate: data.metrics.http_req_failed.values.rate,
      avgResponseTime: data.metrics.http_req_duration.values.avg,
      p95ResponseTime: data.metrics.http_req_duration.values['p(95)'],
      p99ResponseTime: data.metrics.http_req_duration.values['p(99)'],
      maxResponseTime: data.metrics.http_req_duration.values.max,
      throughput: data.metrics.http_reqs.values.rate,
    },
    thresholds: data.thresholds,
    recommendations: generateStressTestRecommendations(data),
  };

  return {
    'stress-test-results.json': JSON.stringify(summary, null, 2),
    stdout: generateStressTestReport(summary),
  };
}

function generateStressTestRecommendations(data) {
  const recommendations = [];

  if (data.metrics.http_req_failed.values.rate > 0.1) {
    recommendations.push(
      'High error rate detected - consider increasing resource limits or implementing circuit breakers'
    );
  }

  if (data.metrics.http_req_duration.values['p(95)'] > 10000) {
    recommendations.push(
      'High response times under stress - consider horizontal scaling or performance optimization'
    );
  }

  if (data.metrics.http_reqs.values.rate < 50) {
    recommendations.push(
      'Low throughput under stress - investigate bottlenecks in the system'
    );
  }

  return recommendations;
}

function generateStressTestReport(summary) {
  return `
🔥 STRESS TEST RESULTS 🔥
========================

Test Duration: ${(summary.duration / 1000 / 60).toFixed(2)} minutes
Total Requests: ${summary.metrics.totalRequests}
Failed Requests: ${summary.metrics.failedRequests} (${(
    summary.metrics.errorRate * 100
  ).toFixed(2)}%)

📊 Performance Metrics:
  Average Response Time: ${summary.metrics.avgResponseTime.toFixed(
    2
  )}ms
  95th Percentile: ${summary.metrics.p95ResponseTime.toFixed(2)}ms
  99th Percentile: ${summary.metrics.p99ResponseTime.toFixed(2)}ms
  Maximum Response Time: ${summary.metrics.maxResponseTime.toFixed(
    2
  )}ms
  
🚀 Throughput: ${summary.metrics.throughput.toFixed(2)} req/s

🎯 Threshold Results:
${Object.entries(summary.thresholds)
  .map(([name, result]) => `  ${result.ok ? '✅' : '❌'} ${name}`)
  .join('\n')}

💡 Recommendations:
${summary.recommendations.map((rec) => `  • ${rec}`).join('\n')}

${
  summary.recommendations.length === 0
    ? '🎉 System performed well under stress!'
    : '⚠️  Consider implementing the above recommendations'
}
`;
}
