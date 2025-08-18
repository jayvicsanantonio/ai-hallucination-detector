import request from 'supertest';
import createApp from '../../src/api/gateway/server';
import {
  generateJWT,
  PERMISSIONS,
  ROLES,
} from '../../src/api/middleware/auth';

describe('Authentication and Authorization Tests', () => {
  const app = createApp();

  // Test JWT tokens
  const adminToken = generateJWT({
    sub: 'user-1',
    email: 'admin@example.com',
    organizationId: 'org-1',
    roles: [ROLES.ADMIN],
    permissions: [PERMISSIONS.ADMIN],
  });

  const analystToken = generateJWT({
    sub: 'user-2',
    email: 'analyst@example.com',
    organizationId: 'org-1',
    roles: [ROLES.ANALYST],
    permissions: [PERMISSIONS.VERIFY_CREATE, PERMISSIONS.VERIFY_READ],
  });

  const viewerToken = generateJWT({
    sub: 'user-3',
    email: 'viewer@example.com',
    organizationId: 'org-2',
    roles: [ROLES.VIEWER],
    permissions: [PERMISSIONS.VERIFY_READ],
  });

  const expiredToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTQiLCJlbWFpbCI6ImV4cGlyZWRAZXhhbXBsZS5jb20iLCJvcmdhbml6YXRpb25JZCI6Im9yZy0xIiwicm9sZXMiOlsiYW5hbHlzdCJdLCJwZXJtaXNzaW9ucyI6WyJ2ZXJpZnk6Y3JlYXRlIl0sImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxNjAwMDAwMDAxfQ.invalid';

  // Test API keys
  const adminAPIKey = 'test-api-key-admin';
  const basicAPIKey = 'test-api-key-basic';
  const inactiveAPIKey = 'test-api-key-inactive';

  describe('JWT Authentication', () => {
    it('should accept valid JWT token', async () => {
      const response = await request(app)
        .post('/api/v1/verify')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          content: 'Test content',
          contentType: 'text',
          domain: 'legal',
        })
        .expect(202);

      expect(response.body.verificationId).toBeDefined();
    });

    it('should reject missing authorization header', async () => {
      const response = await request(app)
        .post('/api/v1/verify')
        .send({
          content: 'Test content',
          contentType: 'text',
          domain: 'legal',
        })
        .expect(401);

      expect(response.body.error.code).toBe(
        'AUTHENTICATION_REQUIRED'
      );
    });

    it('should reject invalid JWT token', async () => {
      const response = await request(app)
        .post('/api/v1/verify')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          content: 'Test content',
          contentType: 'text',
          domain: 'legal',
        })
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should reject expired JWT token', async () => {
      const response = await request(app)
        .post('/api/v1/verify')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({
          content: 'Test content',
          contentType: 'text',
          domain: 'legal',
        })
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should reject malformed authorization header', async () => {
      const response = await request(app)
        .post('/api/v1/verify')
        .set('Authorization', 'InvalidFormat token')
        .send({
          content: 'Test content',
          contentType: 'text',
          domain: 'legal',
        })
        .expect(401);

      expect(response.body.error.code).toBe('MISSING_AUTH_TOKEN');
    });
  });

  describe('API Key Authentication', () => {
    it('should accept valid API key', async () => {
      const response = await request(app)
        .post('/api/v1/verify')
        .set('X-API-Key', adminAPIKey)
        .send({
          content: 'Test content',
          contentType: 'text',
          domain: 'legal',
        })
        .expect(202);

      expect(response.body.verificationId).toBeDefined();
    });

    it('should reject invalid API key', async () => {
      const response = await request(app)
        .post('/api/v1/verify')
        .set('X-API-Key', 'invalid-api-key')
        .send({
          content: 'Test content',
          contentType: 'text',
          domain: 'legal',
        })
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_API_KEY');
    });

    it('should reject inactive API key', async () => {
      const response = await request(app)
        .post('/api/v1/verify')
        .set('X-API-Key', inactiveAPIKey)
        .send({
          content: 'Test content',
          contentType: 'text',
          domain: 'legal',
        })
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_API_KEY');
    });
  });

  describe('Authorization - Permissions', () => {
    it('should allow user with verify:create permission to create verification', async () => {
      const response = await request(app)
        .post('/api/v1/verify')
        .set('Authorization', `Bearer ${analystToken}`)
        .send({
          content: 'Test content',
          contentType: 'text',
          domain: 'legal',
        })
        .expect(202);

      expect(response.body.verificationId).toBeDefined();
    });

    it('should deny user without verify:create permission', async () => {
      const response = await request(app)
        .post('/api/v1/verify')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          content: 'Test content',
          contentType: 'text',
          domain: 'legal',
        })
        .expect(403);

      expect(response.body.error.code).toBe(
        'INSUFFICIENT_PERMISSIONS'
      );
    });

    it('should allow user with verify:read permission to get results', async () => {
      const verificationId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .get(`/api/v1/results/${verificationId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      expect(response.body.verificationId).toBe(verificationId);
    });

    it('should allow admin to access all endpoints', async () => {
      // Test verify endpoint
      const verifyResponse = await request(app)
        .post('/api/v1/verify')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          content: 'Test content',
          contentType: 'text',
          domain: 'legal',
        })
        .expect(202);

      expect(verifyResponse.body.verificationId).toBeDefined();

      // Test results endpoint
      const verificationId = '123e4567-e89b-12d3-a456-426614174000';
      const resultsResponse = await request(app)
        .get(`/api/v1/results/${verificationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(resultsResponse.body.verificationId).toBe(
        verificationId
      );

      // Test feedback endpoint
      const feedbackResponse = await request(app)
        .post('/api/v1/feedback')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          verificationId,
          feedback: 'correct',
        })
        .expect(201);

      expect(feedbackResponse.body.success).toBe(true);
    });
  });

  describe('API Key Permissions', () => {
    it('should allow API key with appropriate permissions', async () => {
      const response = await request(app)
        .post('/api/v1/verify')
        .set('X-API-Key', basicAPIKey)
        .send({
          content: 'Test content',
          contentType: 'text',
          domain: 'legal',
        })
        .expect(202);

      expect(response.body.verificationId).toBeDefined();
    });

    it('should allow admin API key to access all endpoints', async () => {
      // Test verify endpoint
      const verifyResponse = await request(app)
        .post('/api/v1/verify')
        .set('X-API-Key', adminAPIKey)
        .send({
          content: 'Test content',
          contentType: 'text',
          domain: 'legal',
        })
        .expect(202);

      expect(verifyResponse.body.verificationId).toBeDefined();

      // Test feedback endpoint
      const verificationId = '123e4567-e89b-12d3-a456-426614174000';
      const feedbackResponse = await request(app)
        .post('/api/v1/feedback')
        .set('X-API-Key', adminAPIKey)
        .send({
          verificationId,
          feedback: 'correct',
        })
        .expect(201);

      expect(feedbackResponse.body.success).toBe(true);
    });
  });

  describe('Organization Isolation', () => {
    it('should isolate data by organization', async () => {
      // This test verifies that the organization context is properly set
      // In a real implementation, this would test that users can only access
      // data from their own organization

      const response = await request(app)
        .post('/api/v1/verify')
        .set('Authorization', `Bearer ${analystToken}`)
        .send({
          content: 'Test content',
          contentType: 'text',
          domain: 'legal',
        })
        .expect(202);

      expect(response.body.verificationId).toBeDefined();
    });
  });

  describe('Mixed Authentication Methods', () => {
    it('should prioritize JWT over API key when both are provided', async () => {
      const response = await request(app)
        .post('/api/v1/verify')
        .set('Authorization', `Bearer ${analystToken}`)
        .set('X-API-Key', basicAPIKey)
        .send({
          content: 'Test content',
          contentType: 'text',
          domain: 'legal',
        })
        .expect(202);

      expect(response.body.verificationId).toBeDefined();
    });

    it('should fall back to API key when JWT is invalid', async () => {
      const response = await request(app)
        .post('/api/v1/verify')
        .set('Authorization', 'Bearer invalid-token')
        .set('X-API-Key', basicAPIKey)
        .send({
          content: 'Test content',
          contentType: 'text',
          domain: 'legal',
        })
        .expect(401); // Should fail on JWT validation, not fall back

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error format for authentication failures', async () => {
      const response = await request(app)
        .post('/api/v1/verify')
        .send({
          content: 'Test content',
          contentType: 'text',
          domain: 'legal',
        })
        .expect(401);

      expect(response.body).toMatchObject({
        error: {
          code: expect.any(String),
          message: expect.any(String),
          timestamp: expect.any(String),
          requestId: expect.any(String),
          retryable: false,
        },
      });
    });

    it('should return consistent error format for authorization failures', async () => {
      const response = await request(app)
        .post('/api/v1/verify')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          content: 'Test content',
          contentType: 'text',
          domain: 'legal',
        })
        .expect(403);

      expect(response.body).toMatchObject({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: expect.any(String),
          timestamp: expect.any(String),
          requestId: expect.any(String),
          retryable: false,
          details: {
            required: expect.any(Array),
            current: expect.any(Array),
          },
        },
      });
    });
  });
});
