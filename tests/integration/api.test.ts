import request from 'supertest';
import createApp from '../../src/api/gateway/server';

describe('API Gateway Integration Tests', () => {
  const app = createApp();

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        version: expect.any(String),
        environment: expect.any(String),
        uptime: expect.any(Number),
      });
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('API Info', () => {
    it('should return API information', async () => {
      const response = await request(app).get('/api/v1').expect(200);

      expect(response.body).toMatchObject({
        name: 'CertaintyAI API',
        version: '1.0.0',
        description: expect.any(String),
        endpoints: expect.any(Object),
      });
    });
  });

  describe('POST /api/v1/verify', () => {
    it('should accept valid verification request', async () => {
      const validRequest = {
        content: 'This is a test document for verification.',
        contentType: 'text',
        domain: 'legal',
        urgency: 'medium',
        metadata: { source: 'test' },
      };

      const response = await request(app)
        .post('/api/v1/verify')
        .send(validRequest)
        .expect(202);

      expect(response.body).toMatchObject({
        verificationId: expect.any(String),
        status: 'processing',
        estimatedProcessingTime: expect.any(Number),
      });
      expect(response.headers['x-request-id']).toBeDefined();
    });

    it('should reject invalid content type', async () => {
      const invalidRequest = {
        content: 'Test content',
        contentType: 'invalid',
        domain: 'legal',
      };

      const response = await request(app)
        .post('/api/v1/verify')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing required fields', async () => {
      const invalidRequest = {
        content: 'Test content',
        // Missing contentType and domain
      };

      const response = await request(app)
        .post('/api/v1/verify')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject empty content', async () => {
      const invalidRequest = {
        content: '',
        contentType: 'text',
        domain: 'legal',
      };

      const response = await request(app)
        .post('/api/v1/verify')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/verify/batch', () => {
    it('should accept valid batch verification request', async () => {
      const validRequest = {
        documents: [
          {
            id: 'doc1',
            content: 'First test document',
            contentType: 'text',
            domain: 'legal',
          },
          {
            id: 'doc2',
            content: 'Second test document',
            contentType: 'text',
            domain: 'legal',
          },
        ],
        domain: 'legal',
        urgency: 'high',
      };

      const response = await request(app)
        .post('/api/v1/verify/batch')
        .send(validRequest)
        .expect(202);

      expect(response.body).toMatchObject({
        batchId: expect.any(String),
        status: 'processing',
        totalDocuments: 2,
        completedDocuments: 0,
        results: expect.arrayContaining([
          expect.objectContaining({
            documentId: 'doc1',
            verificationId: expect.any(String),
            status: 'processing',
          }),
          expect.objectContaining({
            documentId: 'doc2',
            verificationId: expect.any(String),
            status: 'processing',
          }),
        ]),
      });
    });

    it('should reject empty document array', async () => {
      const invalidRequest = {
        documents: [],
        domain: 'legal',
      };

      const response = await request(app)
        .post('/api/v1/verify/batch')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject batch with too many documents', async () => {
      const documents = Array.from({ length: 101 }, (_, i) => ({
        id: `doc${i}`,
        content: `Document ${i}`,
        contentType: 'text',
        domain: 'legal',
      }));

      const invalidRequest = {
        documents,
        domain: 'legal',
      };

      const response = await request(app)
        .post('/api/v1/verify/batch')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/results/:verificationId', () => {
    it('should return results for valid verification ID', async () => {
      const verificationId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .get(`/api/v1/results/${verificationId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        verificationId,
        status: expect.stringMatching(
          /^(processing|completed|failed)$/
        ),
        createdAt: expect.any(String),
      });

      if (response.body.status === 'completed') {
        expect(response.body.result).toBeDefined();
        expect(response.body.completedAt).toBeDefined();
      }
    });

    it('should reject invalid UUID format', async () => {
      const invalidId = 'not-a-uuid';

      const response = await request(app)
        .get(`/api/v1/results/${invalidId}`)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should include audit trail when requested', async () => {
      const verificationId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .get(`/api/v1/results/${verificationId}`)
        .query({ includeAuditTrail: true })
        .expect(200);

      if (
        response.body.status === 'completed' &&
        response.body.result
      ) {
        expect(response.body.result.auditTrail).toBeDefined();
        expect(Array.isArray(response.body.result.auditTrail)).toBe(
          true
        );
      }
    });
  });

  describe('POST /api/v1/feedback', () => {
    it('should accept valid feedback', async () => {
      const validFeedback = {
        verificationId: '123e4567-e89b-12d3-a456-426614174000',
        feedback: 'correct',
        expertNotes: 'The verification was accurate',
      };

      const response = await request(app)
        .post('/api/v1/feedback')
        .send(validFeedback)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.any(String),
        feedbackId: expect.any(String),
      });
    });

    it('should accept feedback with corrections', async () => {
      const validFeedback = {
        verificationId: '123e4567-e89b-12d3-a456-426614174000',
        feedback: 'incorrect',
        corrections: 'The actual founding date is 1994, not 1995',
        expertNotes: 'Verified from company records',
      };

      const response = await request(app)
        .post('/api/v1/feedback')
        .send(validFeedback)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should reject invalid feedback type', async () => {
      const invalidFeedback = {
        verificationId: '123e4567-e89b-12d3-a456-426614174000',
        feedback: 'invalid_type',
      };

      const response = await request(app)
        .post('/api/v1/feedback')
        .send(invalidFeedback)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid verification ID format', async () => {
      const invalidFeedback = {
        verificationId: 'not-a-uuid',
        feedback: 'correct',
      };

      const response = await request(app)
        .post('/api/v1/feedback')
        .send(invalidFeedback)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent')
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.requestId).toBeDefined();
    });

    it('should include request ID in all responses', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.headers['x-request-id']).toBeDefined();
    });

    it('should handle rate limiting', async () => {
      // This test would need to be adjusted based on rate limiting configuration
      // For now, just verify the rate limiter is configured
      const response = await request(app).get('/health').expect(200);

      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
    });
  });
});
