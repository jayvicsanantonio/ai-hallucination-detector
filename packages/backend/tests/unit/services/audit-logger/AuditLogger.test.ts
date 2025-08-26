import {
  AuditLogger,
  AuditLoggerConfig,
  AuditContext,
} from '../../../../src/services/audit-logger/AuditLogger';
import { AuditRepository } from '../../../../src/database/interfaces/AuditRepository';
import { Logger } from '../../../../src/utils/Logger';
import {
  AuditEntry,
  AuditAction,
  AuditSeverity,
} from '../../../../src/models/audit';

describe('AuditLogger', () => {
  let auditLogger: AuditLogger;
  let mockAuditRepository: jest.Mocked<AuditRepository>;
  let mockLogger: jest.Mocked<Logger>;
  let config: AuditLoggerConfig;
  let context: AuditContext;

  beforeEach(() => {
    mockAuditRepository = {
      createAuditEntry: jest.fn(),
      createAuditEntriesBatch: jest.fn(),
      queryAuditEntries: jest.fn(),
      getAuditSummary: jest.fn(),
      cleanupExpiredAuditData: jest.fn(),
    } as any;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    config = {
      enableStructuredLogging: true,
      enableConsoleOutput: true,
      enableFileOutput: false,
      logLevel: 'info',
      batchSize: 10,
      flushInterval: 1000,
      retentionDays: 2555, // 7 years
    };

    context = {
      sessionId: 'test-session-123',
      userId: 'user-456',
      organizationId: 'org-789',
      ipAddress: '192.168.1.1',
      userAgent: 'Test Agent',
    };

    auditLogger = new AuditLogger(
      mockAuditRepository,
      mockLogger,
      config
    );
  });

  afterEach(async () => {
    await auditLogger.shutdown();
  });

  describe('logEntry', () => {
    it('should create and queue audit entry', async () => {
      const action: AuditAction = 'verification_started';
      const component = 'VerificationEngine';
      const details = { contentType: 'pdf', size: 1024 };

      await auditLogger.logEntry(action, component, context, details);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Audit: verification_started'),
        expect.objectContaining({
          action,
          component,
          sessionId: context.sessionId,
          userId: context.userId,
        })
      );
    });

    it('should immediately flush critical entries', async () => {
      mockAuditRepository.createAuditEntriesBatch.mockResolvedValue(
        []
      );

      await auditLogger.logEntry(
        'system_error',
        'TestComponent',
        context,
        {},
        { severity: 'critical' }
      );

      expect(
        mockAuditRepository.createAuditEntriesBatch
      ).toHaveBeenCalled();
    });

    it('should immediately flush failed entries', async () => {
      mockAuditRepository.createAuditEntriesBatch.mockResolvedValue(
        []
      );

      await auditLogger.logEntry(
        'verification_failed',
        'TestComponent',
        context,
        {},
        { success: false, errorMessage: 'Test error' }
      );

      expect(
        mockAuditRepository.createAuditEntriesBatch
      ).toHaveBeenCalled();
    });

    it('should flush when batch size is reached', async () => {
      mockAuditRepository.createAuditEntriesBatch.mockResolvedValue(
        []
      );

      // Add entries up to batch size
      for (let i = 0; i < config.batchSize; i++) {
        await auditLogger.logEntry(
          'session_created',
          'TestComponent',
          context
        );
      }

      expect(
        mockAuditRepository.createAuditEntriesBatch
      ).toHaveBeenCalled();
    });
  });

  describe('logSessionCreated', () => {
    it('should log session creation with correct details', async () => {
      const details = { domain: 'legal', contentType: 'pdf' };

      await auditLogger.logSessionCreated(context, details);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Audit: session_created'),
        expect.objectContaining({
          action: 'session_created',
          component: 'VerificationEngine',
          details,
        })
      );
    });
  });

  describe('logContentProcessing', () => {
    it('should log content upload', async () => {
      const details = { contentSize: 1024, format: 'pdf' };

      await auditLogger.logContentProcessing(
        context,
        'uploaded',
        details
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Audit: content_uploaded'),
        expect.objectContaining({
          action: 'content_uploaded',
          component: 'ContentProcessor',
        })
      );
    });

    it('should log content parsing with processing time', async () => {
      const details = { processingTime: 500, format: 'pdf' };

      await auditLogger.logContentProcessing(
        context,
        'parsed',
        details
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Audit: content_parsed'),
        expect.objectContaining({
          action: 'content_parsed',
          component: 'ContentProcessor',
          duration: 500,
        })
      );
    });
  });

  describe('logVerification', () => {
    it('should log verification started', async () => {
      const details = { modules: ['fact-checker', 'logic-analyzer'] };

      await auditLogger.logVerification(context, 'started', details);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Audit: verification_started'),
        expect.objectContaining({
          action: 'verification_started',
          component: 'VerificationEngine',
          success: true,
        })
      );
    });

    it('should log verification completed with results', async () => {
      const details = {
        modules: ['fact-checker'],
        issuesFound: 2,
        confidence: 85,
        processingTime: 1500,
      };

      await auditLogger.logVerification(
        context,
        'completed',
        details
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Audit: verification_completed'),
        expect.objectContaining({
          action: 'verification_completed',
          component: 'VerificationEngine',
          success: true,
          duration: 1500,
        })
      );
    });

    it('should log verification failed with error', async () => {
      const details = { errorMessage: 'Processing timeout' };

      await auditLogger.logVerification(context, 'failed', details);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Audit: verification_failed'),
        expect.objectContaining({
          action: 'verification_failed',
          component: 'VerificationEngine',
          success: false,
          severity: 'error',
        })
      );
    });
  });

  describe('logIssueDetected', () => {
    it('should log issue detection with correct severity', async () => {
      const details = {
        issueType: 'factual_error',
        severity: 'warning' as AuditSeverity,
        module: 'FactChecker',
        confidence: 0.9,
        location: 'paragraph 3',
      };

      await auditLogger.logIssueDetected(context, details);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Audit: issue_detected'),
        expect.objectContaining({
          action: 'issue_detected',
          component: 'FactChecker',
          severity: 'warning',
        })
      );
    });
  });

  describe('logComplianceEvent', () => {
    it('should log compliance check started', async () => {
      const details = { ruleId: 'HIPAA-001', regulation: 'HIPAA' };

      await auditLogger.logComplianceEvent(
        context,
        'check_started',
        details
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Audit: compliance_check_started'),
        expect.objectContaining({
          action: 'compliance_check_started',
          component: 'ComplianceValidator',
        })
      );
    });

    it('should log violation detection with warning severity', async () => {
      const details = {
        ruleId: 'SOX-002',
        regulation: 'SOX',
        violationType: 'financial_disclosure',
        severity: 'warning' as AuditSeverity,
      };

      await auditLogger.logComplianceEvent(
        context,
        'violation_detected',
        details
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Audit: violation_detected'),
        expect.objectContaining({
          action: 'violation_detected',
          component: 'ComplianceValidator',
          severity: 'warning',
        })
      );
    });
  });

  describe('logSecurityEvent', () => {
    it('should log authentication event', async () => {
      const details = { method: 'JWT', success: true };

      await auditLogger.logSecurityEvent(
        context,
        'authentication',
        details
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Audit: security_event'),
        expect.objectContaining({
          action: 'security_event',
          component: 'SecurityManager',
          severity: 'info',
        })
      );
    });

    it('should log access denied with warning severity', async () => {
      const details = {
        resource: '/admin/config',
        reason: 'insufficient_permissions',
      };

      await auditLogger.logSecurityEvent(
        context,
        'access_denied',
        details
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Audit: security_event'),
        expect.objectContaining({
          action: 'security_event',
          component: 'SecurityManager',
          severity: 'warning',
          success: false,
        })
      );
    });
  });

  describe('logSystemError', () => {
    it('should log system error with error details', async () => {
      const error = new Error('Database connection failed');
      const details = { connectionString: 'postgres://...' };

      await auditLogger.logSystemError(
        context,
        'DatabaseService',
        error,
        details
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Audit: system_error'),
        expect.objectContaining({
          action: 'system_error',
          component: 'DatabaseService',
          success: false,
          severity: 'error',
        })
      );
    });
  });

  describe('queryEntries', () => {
    it('should query audit entries from repository', async () => {
      const query = { organizationId: 'org-123', limit: 100 };
      const mockEntries: AuditEntry[] = [];
      mockAuditRepository.queryAuditEntries.mockResolvedValue(
        mockEntries
      );

      const result = await auditLogger.queryEntries(query);

      expect(
        mockAuditRepository.queryAuditEntries
      ).toHaveBeenCalledWith(query);
      expect(result).toBe(mockEntries);
    });
  });

  describe('generateAuditReport', () => {
    it('should generate JSON audit report', async () => {
      const organizationId = 'org-123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockEntries: AuditEntry[] = [
        {
          id: 'entry-1',
          sessionId: 'session-1',
          timestamp: new Date(),
          action: 'verification_completed',
          component: 'VerificationEngine',
          details: {},
          success: true,
          severity: 'info',
        },
      ];

      const mockSummary = {
        totalEntries: 1,
        successfulActions: 1,
        failedActions: 0,
        uniqueUsers: 1,
        uniqueSessions: 1,
        actionCounts: { verification_completed: 1 } as any,
        severityCounts: { info: 1 } as any,
        timeRange: { earliest: startDate, latest: endDate },
      };

      mockAuditRepository.queryAuditEntries.mockResolvedValue(
        mockEntries
      );
      mockAuditRepository.getAuditSummary.mockResolvedValue(
        mockSummary
      );

      const report = await auditLogger.generateAuditReport(
        organizationId,
        startDate,
        endDate
      );

      expect(report).toContain('"summary"');
      expect(report).toContain('"entries"');
      expect(report).toContain('"generatedAt"');
    });

    it('should generate CSV audit report', async () => {
      const organizationId = 'org-123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockAuditRepository.queryAuditEntries.mockResolvedValue([]);
      mockAuditRepository.getAuditSummary.mockResolvedValue(
        {} as any
      );

      const report = await auditLogger.generateAuditReport(
        organizationId,
        startDate,
        endDate,
        'csv'
      );

      expect(report).toContain('Timestamp,Action,Component');
    });
  });

  describe('flush', () => {
    it('should flush pending entries to repository', async () => {
      mockAuditRepository.createAuditEntriesBatch.mockResolvedValue(
        []
      );

      // Add some entries
      await auditLogger.logEntry(
        'session_created',
        'TestComponent',
        context
      );
      await auditLogger.logEntry(
        'verification_started',
        'TestComponent',
        context
      );

      await auditLogger.flush();

      expect(
        mockAuditRepository.createAuditEntriesBatch
      ).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ action: 'session_created' }),
          expect.objectContaining({ action: 'verification_started' }),
        ])
      );
    });

    it.skip('should handle flush errors gracefully', async () => {
      const error = new Error('Database error');
      mockAuditRepository.createAuditEntriesBatch.mockRejectedValue(
        error
      );

      // Add an entry to the pending queue
      await auditLogger.logEntry(
        'session_created',
        'TestComponent',
        context
      );

      // Now flush should fail and throw the error
      await expect(auditLogger.flush()).rejects.toThrow(
        'Database error'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to flush audit entries',
        expect.objectContaining({ error })
      );
    });
  });

  describe('cleanupOldData', () => {
    it('should cleanup old audit data and log the action', async () => {
      const organizationId = 'org-123';
      const retentionYears = 7;
      const deletedCount = 150;

      mockAuditRepository.cleanupExpiredAuditData.mockResolvedValue(
        deletedCount
      );
      mockAuditRepository.createAuditEntriesBatch.mockResolvedValue(
        []
      );

      const result = await auditLogger.cleanupOldData(
        organizationId,
        retentionYears
      );

      expect(result).toBe(deletedCount);
      expect(
        mockAuditRepository.cleanupExpiredAuditData
      ).toHaveBeenCalledWith(organizationId, retentionYears);
    });
  });

  describe('shutdown', () => {
    it('should flush pending entries and clear timer', async () => {
      mockAuditRepository.createAuditEntriesBatch.mockResolvedValue(
        []
      );

      await auditLogger.logEntry(
        'session_created',
        'TestComponent',
        context
      );
      await auditLogger.shutdown();

      expect(
        mockAuditRepository.createAuditEntriesBatch
      ).toHaveBeenCalled();
    });
  });
});
