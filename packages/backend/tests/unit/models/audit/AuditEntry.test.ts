import {
  AuditEntry,
  AuditEntryValidator,
  AuditModelFactory,
  AuditModelSerializer,
  AuditValidationError,
} from '../../../../src/models/audit';

describe('AuditEntry Model', () => {
  describe('AuditEntryValidator', () => {
    const validAuditEntry: AuditEntry = {
      id: 'audit-123',
      sessionId: 'session-456',
      timestamp: new Date(),
      action: 'verification_started',
      component: 'verification-engine',
      details: { contentType: 'pdf', fileSize: 1024 },
      success: true,
      severity: 'info',
    };

    it('should validate a valid AuditEntry', () => {
      expect(() =>
        AuditEntryValidator.validate(validAuditEntry)
      ).not.toThrow();
    });

    it('should throw AuditValidationError for missing id', () => {
      const invalid = { ...validAuditEntry, id: '' };
      expect(() => AuditEntryValidator.validate(invalid)).toThrow(
        AuditValidationError
      );
      expect(() => AuditEntryValidator.validate(invalid)).toThrow(
        'AuditEntry must have a valid id'
      );
    });

    it('should throw AuditValidationError for missing sessionId', () => {
      const invalid = { ...validAuditEntry, sessionId: '' };
      expect(() => AuditEntryValidator.validate(invalid)).toThrow(
        AuditValidationError
      );
      expect(() => AuditEntryValidator.validate(invalid)).toThrow(
        'AuditEntry must have a valid sessionId'
      );
    });

    it('should throw AuditValidationError for invalid timestamp', () => {
      const invalid = {
        ...validAuditEntry,
        timestamp: 'not-a-date' as any,
      };
      expect(() => AuditEntryValidator.validate(invalid)).toThrow(
        AuditValidationError
      );
      expect(() => AuditEntryValidator.validate(invalid)).toThrow(
        'AuditEntry must have a valid timestamp'
      );
    });

    it('should throw AuditValidationError for invalid action', () => {
      const invalid = {
        ...validAuditEntry,
        action: 'invalid_action' as any,
      };
      expect(() => AuditEntryValidator.validate(invalid)).toThrow(
        AuditValidationError
      );
      expect(() => AuditEntryValidator.validate(invalid)).toThrow(
        'AuditEntry must have a valid action'
      );
    });

    it('should throw AuditValidationError for missing component', () => {
      const invalid = { ...validAuditEntry, component: '' };
      expect(() => AuditEntryValidator.validate(invalid)).toThrow(
        AuditValidationError
      );
      expect(() => AuditEntryValidator.validate(invalid)).toThrow(
        'AuditEntry must have a valid component'
      );
    });

    it('should throw AuditValidationError for invalid severity', () => {
      const invalid = {
        ...validAuditEntry,
        severity: 'invalid' as any,
      };
      expect(() => AuditEntryValidator.validate(invalid)).toThrow(
        AuditValidationError
      );
      expect(() => AuditEntryValidator.validate(invalid)).toThrow(
        'AuditEntry must have a valid severity'
      );
    });

    it('should throw AuditValidationError for invalid success type', () => {
      const invalid = { ...validAuditEntry, success: 'true' as any };
      expect(() => AuditEntryValidator.validate(invalid)).toThrow(
        AuditValidationError
      );
      expect(() => AuditEntryValidator.validate(invalid)).toThrow(
        'AuditEntry must have a valid success boolean'
      );
    });

    it('should throw AuditValidationError for negative duration', () => {
      const invalid = { ...validAuditEntry, duration: -100 };
      expect(() => AuditEntryValidator.validate(invalid)).toThrow(
        AuditValidationError
      );
      expect(() => AuditEntryValidator.validate(invalid)).toThrow(
        'AuditEntry duration must be a non-negative number'
      );
    });

    it('should throw AuditValidationError for failed entry without error message', () => {
      const invalid = { ...validAuditEntry, success: false };
      expect(() => AuditEntryValidator.validate(invalid)).toThrow(
        AuditValidationError
      );
      expect(() => AuditEntryValidator.validate(invalid)).toThrow(
        'Failed AuditEntry must have an errorMessage'
      );
    });

    it('should throw AuditValidationError for invalid details type', () => {
      const invalid = {
        ...validAuditEntry,
        details: 'not-an-object' as any,
      };
      expect(() => AuditEntryValidator.validate(invalid)).toThrow(
        AuditValidationError
      );
      expect(() => AuditEntryValidator.validate(invalid)).toThrow(
        'AuditEntry details must be an object'
      );
    });

    it('should throw AuditValidationError for array details', () => {
      const invalid = { ...validAuditEntry, details: [] as any };
      expect(() => AuditEntryValidator.validate(invalid)).toThrow(
        AuditValidationError
      );
      expect(() => AuditEntryValidator.validate(invalid)).toThrow(
        'AuditEntry details must be an object'
      );
    });

    it('should validate failed entry with error message', () => {
      const failedEntry = {
        ...validAuditEntry,
        success: false,
        errorMessage: 'Verification failed due to timeout',
        severity: 'error' as any,
      };

      expect(() =>
        AuditEntryValidator.validate(failedEntry)
      ).not.toThrow();
    });

    it('should validate entry with all optional fields', () => {
      const completeEntry: AuditEntry = {
        id: 'audit-123',
        sessionId: 'session-456',
        timestamp: new Date(),
        action: 'user_authenticated',
        component: 'auth-service',
        details: { method: 'SSO', provider: 'Azure AD' },
        userId: 'user-789',
        organizationId: 'org-abc',
        ipAddress: '192.168.1.100',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        duration: 1500,
        success: true,
        severity: 'info',
      };

      expect(() =>
        AuditEntryValidator.validate(completeEntry)
      ).not.toThrow();
    });

    it('should validate all valid audit actions', () => {
      const validActions = [
        'session_created',
        'content_uploaded',
        'content_parsed',
        'verification_started',
        'verification_completed',
        'verification_failed',
        'issue_detected',
        'feedback_submitted',
        'results_accessed',
        'export_requested',
        'user_authenticated',
        'user_authorized',
        'configuration_changed',
        'system_error',
        'security_event',
      ];

      validActions.forEach((action) => {
        const entry = { ...validAuditEntry, action: action as any };
        expect(() =>
          AuditEntryValidator.validate(entry)
        ).not.toThrow();
      });
    });

    it('should validate all valid severity levels', () => {
      const validSeverities = [
        'info',
        'warning',
        'error',
        'critical',
      ];

      validSeverities.forEach((severity) => {
        const entry = {
          ...validAuditEntry,
          severity: severity as any,
        };
        expect(() =>
          AuditEntryValidator.validate(entry)
        ).not.toThrow();
      });
    });
  });

  describe('AuditModelFactory', () => {
    it('should create valid AuditEntry with minimal data', () => {
      const entry = AuditModelFactory.createAuditEntry({
        sessionId: 'session-123',
        component: 'test-component',
      });

      expect(entry.id).toBeDefined();
      expect(entry.sessionId).toBe('session-123');
      expect(entry.component).toBe('test-component');
      expect(entry.action).toBe('session_created');
      expect(entry.success).toBe(true);
      expect(entry.severity).toBe('info');
      expect(entry.details).toEqual({});
      expect(entry.timestamp).toBeInstanceOf(Date);
    });

    it('should create valid AuditEntry with full data', () => {
      const inputData: Partial<AuditEntry> = {
        id: 'custom-audit-id',
        sessionId: 'session-123',
        action: 'verification_completed',
        component: 'verification-engine',
        details: {
          confidence: 95,
          issues: 2,
          processingTime: 1500,
        },
        userId: 'user-456',
        organizationId: 'org-789',
        ipAddress: '10.0.0.1',
        userAgent: 'CertaintyAI-Client/1.0',
        duration: 2000,
        success: true,
        severity: 'info',
      };

      const entry = AuditModelFactory.createAuditEntry(inputData);

      expect(entry.id).toBe('custom-audit-id');
      expect(entry.sessionId).toBe('session-123');
      expect(entry.action).toBe('verification_completed');
      expect(entry.component).toBe('verification-engine');
      expect(entry.details).toEqual({
        confidence: 95,
        issues: 2,
        processingTime: 1500,
      });
      expect(entry.userId).toBe('user-456');
      expect(entry.organizationId).toBe('org-789');
      expect(entry.ipAddress).toBe('10.0.0.1');
      expect(entry.userAgent).toBe('CertaintyAI-Client/1.0');
      expect(entry.duration).toBe(2000);
      expect(entry.success).toBe(true);
      expect(entry.severity).toBe('info');
    });

    it('should create valid failed AuditEntry', () => {
      const entry = AuditModelFactory.createAuditEntry({
        sessionId: 'session-123',
        action: 'verification_failed',
        component: 'verification-engine',
        success: false,
        errorMessage: 'Content parsing failed',
        severity: 'error',
      });

      expect(entry.success).toBe(false);
      expect(entry.errorMessage).toBe('Content parsing failed');
      expect(entry.severity).toBe('error');
    });

    it('should throw AuditValidationError for invalid data', () => {
      expect(() =>
        AuditModelFactory.createAuditEntry({
          sessionId: 'session-123',
          component: 'test-component',
          action: 'invalid_action' as any,
        })
      ).toThrow(AuditValidationError);
    });

    it('should throw AuditValidationError for failed entry without error message', () => {
      expect(() =>
        AuditModelFactory.createAuditEntry({
          sessionId: 'session-123',
          component: 'test-component',
          success: false,
          // Missing errorMessage
        })
      ).toThrow(AuditValidationError);
    });
  });

  describe('AuditModelSerializer', () => {
    const testEntry: AuditEntry = {
      id: 'audit-123',
      sessionId: 'session-456',
      timestamp: new Date('2023-01-01T12:00:00Z'),
      action: 'issue_detected',
      component: 'fact-checker',
      details: {
        issueType: 'factual_error',
        confidence: 0.85,
        location: { start: 100, end: 150 },
      },
      userId: 'user-789',
      organizationId: 'org-abc',
      ipAddress: '192.168.1.50',
      userAgent: 'Mozilla/5.0',
      duration: 750,
      success: true,
      severity: 'warning',
    };

    it('should serialize and deserialize AuditEntry correctly', () => {
      const serialized =
        AuditModelSerializer.serializeAuditEntry(testEntry);
      const deserialized =
        AuditModelSerializer.deserializeAuditEntry(serialized);

      expect(deserialized).toEqual(testEntry);
      expect(deserialized.timestamp).toBeInstanceOf(Date);
    });

    it('should handle AuditEntry without optional fields', () => {
      const minimalEntry: AuditEntry = {
        id: 'audit-123',
        sessionId: 'session-456',
        timestamp: new Date('2023-01-01T12:00:00Z'),
        action: 'session_created',
        component: 'api-gateway',
        details: {},
        success: true,
        severity: 'info',
      };

      const serialized =
        AuditModelSerializer.serializeAuditEntry(minimalEntry);
      const deserialized =
        AuditModelSerializer.deserializeAuditEntry(serialized);

      expect(deserialized).toEqual(minimalEntry);
      expect(deserialized.timestamp).toBeInstanceOf(Date);
      expect(deserialized.userId).toBeUndefined();
      expect(deserialized.organizationId).toBeUndefined();
      expect(deserialized.duration).toBeUndefined();
      expect(deserialized.errorMessage).toBeUndefined();
    });

    it('should throw AuditValidationError when deserializing invalid data', () => {
      const invalidJson = JSON.stringify({
        id: '',
        sessionId: 'session-123',
        action: 'session_created',
      });

      expect(() =>
        AuditModelSerializer.deserializeAuditEntry(invalidJson)
      ).toThrow(AuditValidationError);
    });

    it('should handle complex details object', () => {
      const entryWithComplexDetails: AuditEntry = {
        id: 'audit-123',
        sessionId: 'session-456',
        timestamp: new Date('2023-01-01T12:00:00Z'),
        action: 'verification_completed',
        component: 'verification-engine',
        details: {
          results: {
            confidence: 92,
            issues: [
              { type: 'factual_error', severity: 'medium' },
              { type: 'compliance_violation', severity: 'high' },
            ],
            recommendations: [
              'Review section 3',
              'Update compliance data',
            ],
          },
          performance: {
            processingTime: 2500,
            memoryUsage: '128MB',
            cpuUsage: '15%',
          },
        },
        success: true,
        severity: 'info',
      };

      const serialized = AuditModelSerializer.serializeAuditEntry(
        entryWithComplexDetails
      );
      const deserialized =
        AuditModelSerializer.deserializeAuditEntry(serialized);

      expect(deserialized).toEqual(entryWithComplexDetails);
      expect(deserialized.details.results.issues).toHaveLength(2);
      expect(deserialized.details.performance.processingTime).toBe(
        2500
      );
    });
  });
});
