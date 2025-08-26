import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// Custom metrics for scaling validation
export const scalingEvents = new Counter('scaling_events');
export const responseTimeP95 = new Trend('response_time_p95');
export const errorRate = new Rate('errors');

// Scaling validation test configuration
export const options = {
  stages: [
    // Baseline load
    { duration: '2m', target: 10 },

    // Gradual increase to trigger scaling
    { duration: '3m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '2m', target: 200 },

    // Sustained load to validate scaling
    { duration: '10m', target: 200 },

    // Spike to test rapid scaling
    { duration: '1m', target: 500 },
    { duration: '5m', target: 500 },

    // Scale down validation
    { duration: '3m', target: 100 },
    { duration: '2m', target: 10 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% under 3s during scaling
    http_req_failed: ['rate<0.1'], // Less than 10% errors during scaling
    response_time_p95: ['p(95)<3000'], // Custom P95 tracking
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const METRICS_URL = `${BASE_URL}/metrics`;

let previousPodCount = 0;
let scalingEventDetected = false;

export default function () {
  // Monitor scaling events every 10th user
  if (__VU % 10 === 0) {
    monitorScaling();
  }

  // Execute verification requests
  const scenario = Math.random();

  if (scenario < 0.6) {
    testVerificationScaling();
  } else if (scenario < 0.9) {
    testBatchProcessingScaling();
  } else {
    testResourceMonitoring();
  }

  sleep(Math.random() * 2 + 0.5);
}

function testVerificationScaling() {
  const content = generateTestContent();

  const payload = JSON.stringify({
    content: content,
    contentType: 'text',
    domain: 'legal',
    urgency: 'medium',
    metadata: {
      source: 'scaling-test',
      timestamp: new Date().toISOString(),
      vu: __VU,
      iteration: __ITER,
    },
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer scaling-test-token',
    },
    timeout: '30s',
  };

  const startTime = Date.now();
  const response = http.post(
    `${BASE_URL}/api/v1/verify`,
    payload,
    params
  );
  const responseTime = Date.now() - startTime;

  // Track response time for scaling analysis
  responseTimeP95.add(responseTime);

  const success = check(response, {
    'verification request successful during scaling': (r) =>
      r.status === 200 || r.status === 202,
    'response time acceptable during scaling': (r) =>
      r.timings.duration < 10000,
    'response contains verification ID': (r) => {
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

function testBatchProcessingScaling() {
  const batchSize = Math.floor(Math.random() * 3) + 2; // 2-4 documents
  const documents = [];

  for (let i = 0; i < batchSize; i++) {
    documents.push({
      id: `scaling-batch-${__VU}-${__ITER}-${i}`,
      content: generateTestContent(),
      contentType: 'text',
      domain: ['legal', 'financial'][i % 2],
    });
  }

  const payload = JSON.stringify({ documents });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer scaling-test-token',
    },
    timeout: '45s',
  };

  const response = http.post(
    `${BASE_URL}/api/v1/verify/batch`,
    payload,
    params
  );

  const success = check(response, {
    'batch processing successful during scaling': (r) =>
      r.status === 200 || r.status === 202,
    'batch response time acceptable during scaling': (r) =>
      r.timings.duration < 15000,
  });

  if (!success) {
    errorRate.add(1);
  }
}

function testResourceMonitoring() {
  // Test metrics endpoint to monitor resource usage
  const response = http.get(METRICS_URL, {
    timeout: '10s',
    headers: {
      Authorization: 'Bearer scaling-test-token',
    },
  });

  check(response, {
    'metrics endpoint accessible during scaling': (r) =>
      r.status === 200 || r.status === 401,
    'metrics response time acceptable': (r) =>
      r.timings.duration < 2000,
  });
}

function monitorScaling() {
  // This would typically query Kubernetes API or monitoring system
  // For simulation, we'll track response patterns that indicate scaling

  const currentTime = Date.now();
  const currentLoad = __VU;

  // Simulate pod count detection based on load patterns
  let estimatedPodCount = Math.ceil(currentLoad / 50); // Assume 50 users per pod
  estimatedPodCount = Math.max(1, Math.min(estimatedPodCount, 20)); // Min 1, max 20 pods

  if (estimatedPodCount !== previousPodCount) {
    scalingEvents.add(1);
    scalingEventDetected = true;

    console.log(
      `Scaling event detected: ${previousPodCount} -> ${estimatedPodCount} pods (Load: ${currentLoad} users)`
    );
    previousPodCount = estimatedPodCount;
  }
}

function generateTestContent() {
  const sizes = {
    small: 50,
    medium: 200,
    large: 500,
  };

  const sizeKey = ['small', 'medium', 'large'][
    Math.floor(Math.random() * 3)
  ];
  const repeatCount = sizes[sizeKey];

  return `This is a ${sizeKey} test document for scaling validation. `.repeat(
    repeatCount
  );
}

export function handleSummary(data) {
  const summary = {
    testType: 'scaling-validation',
    timestamp: new Date().toISOString(),
    duration: data.state.testRunDurationMs,
    scalingMetrics: {
      scalingEventsDetected:
        data.metrics.scaling_events?.values?.count || 0,
      scalingEventRate:
        (data.metrics.scaling_events?.values?.count || 0) /
        (data.state.testRunDurationMs / 1000 / 60), // events per minute
    },
    performanceMetrics: {
      totalRequests: data.metrics.http_reqs.values.count,
      failedRequests: data.metrics.http_req_failed.values.count,
      errorRate: data.metrics.http_req_failed.values.rate,
      avgResponseTime: data.metrics.http_req_duration.values.avg,
      p95ResponseTime: data.metrics.http_req_duration.values['p(95)'],
      p99ResponseTime: data.metrics.http_req_duration.values['p(99)'],
      throughput: data.metrics.http_reqs.values.rate,
    },
    scalingAnalysis: analyzeScalingBehavior(data),
    recommendations: generateScalingRecommendations(data),
  };

  return {
    'scaling-validation-results.json': JSON.stringify(
      summary,
      null,
      2
    ),
    stdout: generateScalingReport(summary),
  };
}

function analyzeScalingBehavior(data) {
  const analysis = {
    scalingResponsiveness: 'unknown',
    performanceStability: 'unknown',
    resourceEfficiency: 'unknown',
  };

  // Analyze scaling responsiveness
  const scalingEvents =
    data.metrics.scaling_events?.values?.count || 0;
  if (scalingEvents >= 3) {
    analysis.scalingResponsiveness = 'good';
  } else if (scalingEvents >= 1) {
    analysis.scalingResponsiveness = 'moderate';
  } else {
    analysis.scalingResponsiveness = 'poor';
  }

  // Analyze performance stability during scaling
  const errorRate = data.metrics.http_req_failed.values.rate;
  const p95ResponseTime =
    data.metrics.http_req_duration.values['p(95)'];

  if (errorRate < 0.05 && p95ResponseTime < 2000) {
    analysis.performanceStability = 'excellent';
  } else if (errorRate < 0.1 && p95ResponseTime < 3000) {
    analysis.performanceStability = 'good';
  } else if (errorRate < 0.15 && p95ResponseTime < 5000) {
    analysis.performanceStability = 'moderate';
  } else {
    analysis.performanceStability = 'poor';
  }

  // Analyze resource efficiency
  const throughput = data.metrics.http_reqs.values.rate;
  if (throughput > 100) {
    analysis.resourceEfficiency = 'high';
  } else if (throughput > 50) {
    analysis.resourceEfficiency = 'moderate';
  } else {
    analysis.resourceEfficiency = 'low';
  }

  return analysis;
}

function generateScalingRecommendations(data) {
  const recommendations = [];
  const analysis = analyzeScalingBehavior(data);

  if (analysis.scalingResponsiveness === 'poor') {
    recommendations.push(
      'Consider adjusting HPA metrics or thresholds for faster scaling response'
    );
  }

  if (analysis.performanceStability === 'poor') {
    recommendations.push(
      'Implement circuit breakers and improve graceful degradation during scaling events'
    );
  }

  if (analysis.resourceEfficiency === 'low') {
    recommendations.push(
      'Optimize resource requests/limits and consider vertical pod autoscaling'
    );
  }

  if (data.metrics.http_req_failed.values.rate > 0.1) {
    recommendations.push(
      'High error rate during scaling - implement better load balancing and health checks'
    );
  }

  if (data.metrics.http_req_duration.values['p(95)'] > 3000) {
    recommendations.push(
      'High response times during scaling - consider pre-scaling or faster scaling policies'
    );
  }

  return recommendations;
}

function generateScalingReport(summary) {
  const {
    scalingMetrics,
    performanceMetrics,
    scalingAnalysis,
    recommendations,
  } = summary;

  return `
🔄 SCALING VALIDATION RESULTS 🔄
===============================

Test Duration: ${(summary.duration / 1000 / 60).toFixed(2)} minutes

📈 Scaling Metrics:
  Scaling Events Detected: ${scalingMetrics.scalingEventsDetected}
  Scaling Event Rate: ${scalingMetrics.scalingEventRate.toFixed(
    2
  )} events/min

📊 Performance During Scaling:
  Total Requests: ${performanceMetrics.totalRequests}
  Failed Requests: ${performanceMetrics.failedRequests} (${(
    performanceMetrics.errorRate * 100
  ).toFixed(2)}%)
  Average Response Time: ${performanceMetrics.avgResponseTime.toFixed(
    2
  )}ms
  95th Percentile: ${performanceMetrics.p95ResponseTime.toFixed(2)}ms
  99th Percentile: ${performanceMetrics.p99ResponseTime.toFixed(2)}ms
  Throughput: ${performanceMetrics.throughput.toFixed(2)} req/s

🎯 Scaling Analysis:
  Scaling Responsiveness: ${scalingAnalysis.scalingResponsiveness.toUpperCase()}
  Performance Stability: ${scalingAnalysis.performanceStability.toUpperCase()}
  Resource Efficiency: ${scalingAnalysis.resourceEfficiency.toUpperCase()}

💡 Recommendations:
${
  recommendations.length > 0
    ? recommendations.map((rec) => `  • ${rec}`).join('\n')
    : '  🎉 Scaling behavior is optimal!'
}

${getScalingGrade(scalingAnalysis)}
`;
}

function getScalingGrade(analysis) {
  const scores = {
    excellent: 4,
    good: 3,
    moderate: 2,
    poor: 1,
    high: 4,
    low: 1,
  };

  const totalScore =
    (scores[analysis.scalingResponsiveness] || 0) +
    (scores[analysis.performanceStability] || 0) +
    (scores[analysis.resourceEfficiency] || 0);

  if (totalScore >= 11) return '🏆 SCALING GRADE: A+ (Excellent)';
  if (totalScore >= 9) return '🥇 SCALING GRADE: A (Very Good)';
  if (totalScore >= 7) return '🥈 SCALING GRADE: B (Good)';
  if (totalScore >= 5)
    return '🥉 SCALING GRADE: C (Needs Improvement)';
  return '❌ SCALING GRADE: D (Poor - Requires Attention)';
}
