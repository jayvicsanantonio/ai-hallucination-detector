import {
  VerificationSession,
  VerificationSessionValidator,
  AuditModelFactory,
  AuditModelSerializer,
  AuditValidationError,
} from '../../../../src/models/audit';
import { VerificationResult } from '../../../../src/models/core';

describe('VerificationSession Model', () => {
  describe('VerificationSessionValidator', () => {
    const validSession: VerificationSession = {
      id: 'session-123',
      userId: 'user-456',
      organizationId: 'org-789',
      contentId: 'content-abc',
      domain: 'legal',
      status: 'processing',
      createdAt: new Date(),
    };

    it('should validate a valid VerificationSession', () => {
      expect(() =>
        VerificationSessionValidator.validate(validSession)
      ).not.toThrow();
    });

    it('should throw AuditValidationError for missing id', () => {
      const invalid = { ...validSession, id: '' };
      expect(() =>
        VerificationSessionValidator.validate(invalid)
      ).toThrow(AuditValidationError);
      expect(() =>
        VerificationSessionValidator.validate(invalid)
      ).toThrow('VerificationSession must have a valid id');
    });

    it('should throw AuditValidationError for missing userId', () => {
      const invalid = { ...validSession, userId: '' };
      expect(() =>
        VerificationSessionValidator.validate(invalid)
      ).toThrow(AuditValidationError);
      expect(() =>
        VerificationSessionValidator.validate(invalid)
      ).toThrow('VerificationSession must have a valid userId');
    });

    it('should throw AuditValidationError for missing organizationId', () => {
      const invalid = { ...validSession, organizationId: '' };
      expect(() =>
        VerificationSessionValidator.validate(invalid)
      ).toThrow(AuditValidationError);
      expect(() =>
        VerificationSessionValidator.validate(invalid)
      ).toThrow(
        'VerificationSession must have a valid organizationId'
      );
    });

    it('should throw AuditValidationError for missing contentId', () => {
      const invalid = { ...validSession, contentId: '' };
      expect(() =>
        VerificationSessionValidator.validate(invalid)
      ).toThrow(AuditValidationError);
      expect(() =>
        VerificationSessionValidator.validate(invalid)
      ).toThrow('VerificationSession must have a valid contentId');
    });

    it('should throw AuditValidationError for invalid domain', () => {
      const invalid = { ...validSession, domain: 'invalid' as any };
      expect(() =>
        VerificationSessionValidator.validate(invalid)
      ).toThrow(AuditValidationError);
      expect(() =>
        VerificationSessionValidator.validate(invalid)
      ).toThrow('VerificationSession must have a valid domain');
    });

    it('should throw AuditValidationError for invalid status', () => {
      const invalid = { ...validSession, status: 'invalid' as any };
      expect(() =>
        VerificationSessionValidator.validate(invalid)
      ).toThrow(AuditValidationError);
      expect(() =>
        VerificationSessionValidator.validate(invalid)
      ).toThrow('VerificationSession must have a valid status');
    });

    it('should throw AuditValidationError for invalid createdAt', () => {
      const invalid = {
        ...validSession,
        createdAt: 'not-a-date' as any,
      };
      expect(() =>
        VerificationSessionValidator.validate(invalid)
      ).toThrow(AuditValidationError);
      expect(() =>
        VerificationSessionValidator.validate(invalid)
      ).toThrow(
        'VerificationSession must have a valid createdAt date'
      );
    });

    it('should throw AuditValidationError for invalid completedAt', () => {
      const invalid = {
        ...validSession,
        completedAt: 'not-a-date' as any,
      };
      expect(() =>
        VerificationSessionValidator.validate(invalid)
      ).toThrow(AuditValidationError);
      expect(() =>
        VerificationSessionValidator.validate(invalid)
      ).toThrow(
        'VerificationSession completedAt must be a valid date'
      );
    });

    it('should throw AuditValidationError when completedAt is before createdAt', () => {
      const createdAt = new Date();
      const completedAt = new Date(createdAt.getTime() - 1000); // 1 second before
      const invalid = { ...validSession, createdAt, completedAt };

      expect(() =>
        VerificationSessionValidator.validate(invalid)
      ).toThrow(AuditValidationError);
      expect(() =>
        VerificationSessionValidator.validate(invalid)
      ).toThrow(
        'VerificationSession completedAt cannot be before createdAt'
      );
    });

    it('should throw AuditValidationError for completed status without results or error', () => {
      const invalid = { ...validSession, status: 'completed' as any };
      expect(() =>
        VerificationSessionValidator.validate(invalid)
      ).toThrow(AuditValidationError);
      expect(() =>
        VerificationSessionValidator.validate(invalid)
      ).toThrow(
        'Completed VerificationSession must have results or errorMessage'
      );
    });

    it('should throw AuditValidationError for failed status without error message', () => {
      const invalid = { ...validSession, status: 'failed' as any };
      expect(() =>
        VerificationSessionValidator.validate(invalid)
      ).toThrow(AuditValidationError);
      expect(() =>
        VerificationSessionValidator.validate(invalid)
      ).toThrow('Failed VerificationSession must have errorMessage');
    });

    it('should validate completed session with results', () => {
      const mockResults: VerificationResult = {
        verificationId: 'test-verification',
        overallConfidence: 85,
        riskLevel: 'medium',
        issues: [],
        auditTrail: [],
        processingTime: 1500,
        recommendations: [],
        timestamp: new Date(),
      };

      const completedSession = {
        ...validSession,
        status: 'completed' as any,
        results: mockResults,
        completedAt: new Date(),
      };

      expect(() =>
        VerificationSessionValidator.validate(completedSession)
      ).not.toThrow();
    });

    it('should validate failed session with error message', () => {
      const failedSession = {
        ...validSession,
        status: 'failed' as any,
        errorMessage: 'Processing failed due to invalid content',
        completedAt: new Date(),
      };

      expect(() =>
        VerificationSessionValidator.validate(failedSession)
      ).not.toThrow();
    });
  });

  describe('AuditModelFactory', () => {
    it('should create valid VerificationSession with minimal data', () => {
      const session = AuditModelFactory.createVerificationSession({
        userId: 'user-123',
        organizationId: 'org-456',
        contentId: 'content-789',
      });

      expect(session.id).toBeDefined();
      expect(session.userId).toBe('user-123');
      expect(session.organizationId).toBe('org-456');
      expect(session.contentId).toBe('content-789');
      expect(session.domain).toBe('legal');
      expect(session.status).toBe('processing');
      expect(session.createdAt).toBeInstanceOf(Date);
    });

    it('should create valid VerificationSession with full data', () => {
      const inputData: Partial<VerificationSession> = {
        id: 'custom-session-id',
        userId: 'user-123',
        organizationId: 'org-456',
        contentId: 'content-789',
        domain: 'financial',
        status: 'completed',
        completedAt: new Date(),
        results: {
          verificationId: 'test-verification',
          overallConfidence: 90,
          riskLevel: 'low',
          issues: [],
          auditTrail: [],
          processingTime: 1200,
          recommendations: [],
          timestamp: new Date(),
        },
      };

      const session =
        AuditModelFactory.createVerificationSession(inputData);

      expect(session.id).toBe('custom-session-id');
      expect(session.domain).toBe('financial');
      expect(session.status).toBe('completed');
      expect(session.results).toBeDefined();
      expect(session.completedAt).toBeInstanceOf(Date);
    });

    it('should throw AuditValidationError for invalid data', () => {
      expect(() =>
        AuditModelFactory.createVerificationSession({
          userId: 'user-123',
          organizationId: 'org-456',
          contentId: 'content-789',
          domain: 'invalid' as any,
        })
      ).toThrow(AuditValidationError);
    });
  });

  describe('AuditModelSerializer', () => {
    const testSession: VerificationSession = {
      id: 'test-session',
      userId: 'user-123',
      organizationId: 'org-456',
      contentId: 'content-789',
      domain: 'healthcare',
      status: 'completed',
      createdAt: new Date('2023-01-01T10:00:00Z'),
      completedAt: new Date('2023-01-01T10:05:00Z'),
      results: {
        verificationId: 'test-verification',
        overallConfidence: 95,
        riskLevel: 'low',
        issues: [],
        auditTrail: [],
        processingTime: 300000,
        recommendations: ['All checks passed'],
        timestamp: new Date('2023-01-01T10:05:00Z'),
      },
    };

    it('should serialize and deserialize VerificationSession correctly', () => {
      const serialized =
        AuditModelSerializer.serializeVerificationSession(
          testSession
        );
      const deserialized =
        AuditModelSerializer.deserializeVerificationSession(
          serialized
        );

      expect(deserialized).toEqual(testSession);
      expect(deserialized.createdAt).toBeInstanceOf(Date);
      expect(deserialized.completedAt).toBeInstanceOf(Date);
      expect(deserialized.results?.timestamp).toBeInstanceOf(Date);
    });

    it('should throw AuditValidationError when deserializing invalid data', () => {
      const invalidJson = JSON.stringify({
        id: '',
        userId: 'user-123',
      });

      expect(() =>
        AuditModelSerializer.deserializeVerificationSession(
          invalidJson
        )
      ).toThrow(AuditValidationError);
    });
  });
});
