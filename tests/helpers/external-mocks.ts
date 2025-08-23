import nock from 'nock';

export function mockExternalServices(): void {
  // Mock Wikipedia API
  nock('https://en.wikipedia.org')
    .persist()
    .get('/api/rest_v1/page/summary/*')
    .reply(200, {
      title: 'Mock Wikipedia Article',
      extract:
        'This is a mock Wikipedia extract for testing purposes.',
      content_urls: {
        desktop: {
          page: 'https://en.wikipedia.org/wiki/Mock_Article',
        },
      },
    });

  // Mock Government Data API
  nock('https://api.data.gov')
    .persist()
    .get(/.*/)
    .reply(200, {
      results: [
        {
          title: 'Mock Government Data',
          description: 'Mock government data for testing',
          source: 'data.gov',
          last_updated: new Date().toISOString(),
        },
      ],
    });

  // Mock Federal Reserve API
  nock('https://api.stlouisfed.org')
    .persist()
    .get(/.*/)
    .reply(200, {
      observations: [
        {
          date: '2023-09-01',
          value: '3.25',
          realtime_start: '2023-09-01',
          realtime_end: '2023-09-01',
        },
      ],
    });

  // Mock FDA API
  nock('https://api.fda.gov')
    .persist()
    .get(/.*/)
    .reply(200, {
      results: [
        {
          brand_name: ['Lisinopril'],
          generic_name: ['lisinopril'],
          indications_and_usage: ['Treatment of hypertension'],
          dosage_and_administration: ['10mg daily'],
        },
      ],
    });

  // Mock Legal Database API
  nock('https://api.courtlistener.com')
    .persist()
    .get(/.*/)
    .reply(200, {
      results: [
        {
          case_name: 'Mock Legal Case',
          court: 'Mock Court',
          date_filed: '2023-01-01',
          snippet: 'Mock legal precedent for testing',
        },
      ],
    });

  // Mock External Knowledge Base
  nock('https://api.knowledge-base.com')
    .persist()
    .post('/verify')
    .reply(200, {
      verified: true,
      confidence: 0.85,
      sources: [
        {
          url: 'https://example.com/source1',
          title: 'Mock Source 1',
          credibility: 0.9,
        },
      ],
    });

  // Mock Compliance Database
  nock('https://api.compliance-db.com')
    .persist()
    .get(/.*/)
    .reply(200, {
      rules: [
        {
          id: 'mock-rule-1',
          regulation: 'Mock Regulation',
          description: 'Mock compliance rule for testing',
          severity: 'high',
        },
      ],
    });

  // Mock ML Model API
  nock('https://api.ml-models.com')
    .persist()
    .post('/predict')
    .reply(200, {
      prediction: 'compliant',
      confidence: 0.92,
      features: {
        sentiment: 'neutral',
        complexity: 'medium',
        risk_indicators: [],
      },
    });

  // Mock Authentication Service
  nock('https://auth.enterprise.com')
    .persist()
    .post('/oauth/token')
    .reply(200, {
      access_token: 'mock-access-token',
      token_type: 'Bearer',
      expires_in: 3600,
    });

  // Mock SSO Provider
  nock('https://sso.enterprise.com')
    .persist()
    .get('/userinfo')
    .reply(200, {
      sub: 'mock-user-id',
      name: 'Mock User',
      email: 'mock@example.com',
      roles: ['user'],
    });

  console.log('✅ External service mocks configured');
}

export function mockExternalServiceFailures(): void {
  // Mock service timeouts
  nock('https://slow-service.com')
    .persist()
    .get(/.*/)
    .delay(10000) // 10 second delay
    .reply(200, { data: 'slow response' });

  // Mock service errors
  nock('https://error-service.com')
    .persist()
    .get(/.*/)
    .reply(500, { error: 'Internal Server Error' });

  // Mock network errors
  nock('https://network-error.com')
    .persist()
    .get(/.*/)
    .replyWithError('Network Error');

  // Mock rate limiting
  nock('https://rate-limited.com').persist().get(/.*/).reply(429, {
    error: 'Rate limit exceeded',
    retry_after: 60,
  });

  console.log('✅ External service failure mocks configured');
}

export function clearExternalMocks(): void {
  nock.cleanAll();
  console.log('✅ External service mocks cleared');
}

export function mockSpecificScenarios(): void {
  // Mock scenario: Conflicting information
  nock('https://source1.com')
    .persist()
    .get('/fact-check')
    .reply(200, {
      claim: 'Interest rate is 3.25%',
      verified: true,
      confidence: 0.9,
    });

  nock('https://source2.com')
    .persist()
    .get('/fact-check')
    .reply(200, {
      claim: 'Interest rate is 3.50%',
      verified: true,
      confidence: 0.8,
    });

  // Mock scenario: PII detection
  nock('https://pii-detector.com')
    .persist()
    .post('/detect')
    .reply(200, {
      pii_found: true,
      entities: [
        {
          type: 'SSN',
          value: '***-**-****',
          confidence: 0.95,
          location: { start: 10, end: 21 },
        },
      ],
    });

  // Mock scenario: Compliance violation
  nock('https://compliance-checker.com')
    .persist()
    .post('/check')
    .reply(200, {
      violations: [
        {
          rule_id: 'HIPAA-001',
          severity: 'high',
          description: 'Unprotected PII detected',
          location: { start: 0, end: 50 },
        },
      ],
    });

  console.log('✅ Specific scenario mocks configured');
}
