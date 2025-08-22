import {
  AuditReportingService,
  ReportFilter,
} from '../../../../src/services/audit-logger/AuditReportingService';
import { AuditRepository } from '../../../../src/database/interfaces/AuditRepository';
import { Logger } from '../../../../src/utils/Logger';
import {
  AuditEntry,
  AuditSummary,
} from '../../../../src/models/audit';

describe('AuditReportingService', () => {
  let auditReportingService: AuditReportingService;
  let mockAuditRepository: jest.Mocked<AuditRepository>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockAuditRepository = {
      queryAuditEntries: jest.fn(),
      getAuditSummary: jest.fn(),
    } as any;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    auditReportingService = new AuditReportingService(
      mockAuditRepository,
      mockLogger
    );
  });

  describe('generateAuditReport', () => {
    it('should generate comprehensive audit report', async () => {
      const filter: ReportFilter = {
        organizationId: 'org-123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        actions: ['verification_completed'],
        severities: ['info'],
      };

      const mockEntries: AuditEntry[] = [
        {
          id: 'entry-1',
          sessionId: 'session-1',
          timestamp: new Date('2024-01-15'),
          action: 'verification_completed',
          component: 'VerificationEngine',
          details: { confidence: 95 },
          success: true,
          severity: 'info',
        },
      ];

      const mockSummary: AuditSummary = {
        totalEntries: 1,
        successfulActions: 1,
        failedActions: 0,
        uniqueUsers: 1,
        uniqueSessions: 1,
        actionCounts: { verification_completed: 1 } as any,
        severityCounts: { info: 1 } as any,
        timeRange: {
          earliest: new Date('2024-01-01'),
          latest: new Date('2024-01-31'),
        },
      };

      mockAuditRepository.queryAuditEntries.mockResolvedValue(
        mockEntries
      );
      mockAuditRepository.getAuditSummary.mockResolvedValue(
        mockSummary
      );

      const report = await auditReportingService.generateAuditReport(
        filter,
        'json',
        'user-123'
      );

      expect(report.organizationId).toBe('org-123');
      expect(report.filter).toBe(filter);
      expect(report.summary).toBe(mockSummary);
      expect(report.entries).toBe(mockEntries);
      expect(report.format).toBe('json');
      expect(report.generatedBy).toBe('user-123');
      expect(report.id).toBeDefined();
      expect(report.generatedAt).toBeInstanceOf(Date);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Generated audit report',
        expect.objectContaining({
          reportId: report.id,
          organizationId: 'org-123',
          entryCount: 1,
          format: 'json',
        })
      );
    });

    it('should handle report generation errors', async () => {
      const filter: ReportFilter = {
        organizationId: 'org-123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      const error = new Error('Database error');
      mockAuditRepository.queryAuditEntries.mockRejectedValue(error);

      await expect(
        auditReportingService.generateAuditReport(
          filter,
          'json',
          'user-123'
        )
      ).rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to generate audit report',
        expect.objectContaining({ error, filter })
      );
    });
  });

  describe('generateComplianceReport', () => {
    it('should generate compliance-focused report', async () => {
      const organizationId = 'org-123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockEntries: AuditEntry[] = [
        {
          id: 'entry-1',
          sessionId: 'session-1',
          timestamp: new Date('2024-01-15'),
          action: 'verification_completed',
          component: 'VerificationEngine',
          details: {},
          success: true,
          severity: 'info',
        },
        {
          id: 'entry-2',
          sessionId: 'session-1',
          timestamp: new Date('2024-01-15'),
          action: 'compliance_check_completed',
          component: 'ComplianceValidator',
          details: {},
          success: true,
          severity: 'info',
        },
        {
          id: 'entry-3',
          sessionId: 'session-2',
          timestamp: new Date('2024-01-16'),
          action: 'violation_detected',
          component: 'ComplianceValidator',
          details: {
            violationType: 'HIPAA_violation',
            ruleId: 'HIPAA-001',
            regulation: 'HIPAA',
          },
          success: false,
          severity: 'warning',
        },
      ];

      mockAuditRepository.queryAuditEntries.mockResolvedValue(
        mockEntries
      );

      const report =
        await auditReportingService.generateComplianceReport(
          organizationId,
          startDate,
          endDate
        );

      expect(report.organizationId).toBe(organizationId);
      expect(report.period).toEqual({ startDate, endDate });
      expect(report.totalVerifications).toBe(1);
      expect(report.complianceChecks).toBe(1);
      expect(report.violationsDetected).toBe(1);
      expect(report.violationsByType).toEqual({ HIPAA_violation: 1 });
      expect(report.violationsBySeverity).toEqual({ warning: 1 });
      expect(report.topViolatedRules).toHaveLength(1);
      expect(report.topViolatedRules[0]).toEqual({
        ruleId: 'HIPAA-001',
        count: 1,
        regulation: 'HIPAA',
      });
      expect(report.systemPerformance).toBeDefined();
      expect(report.recommendations).toBeInstanceOf(Array);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Generated compliance report',
        expect.objectContaining({
          organizationId,
          totalVerifications: 1,
          violationsDetected: 1,
        })
      );
    });

    it('should generate recommendations based on violations', async () => {
      const organizationId = 'org-123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      // Create many violations to trigger recommendations
      const mockEntries: AuditEntry[] = Array.from(
        { length: 150 },
        (_, i) => ({
          id: `entry-${i}`,
          sessionId: `session-${i}`,
          timestamp: new Date('2024-01-15'),
          action: 'violation_detected',
          component: 'ComplianceValidator',
          details: { violationType: 'test_violation' },
          success: false,
          severity: i < 5 ? 'critical' : 'warning',
        })
      );

      mockAuditRepository.queryAuditEntries.mockResolvedValue(
        mockEntries
      );

      const report =
        await auditReportingService.generateComplianceReport(
          organizationId,
          startDate,
          endDate
        );

      expect(report.recommendations).toContain(
        'High number of compliance violations detected. Consider reviewing and updating compliance rules.'
      );
      expect(report.recommendations).toContain(
        '5 critical violations found. Immediate attention required.'
      );
    });
  });

  describe('generateSecurityReport', () => {
    it('should generate security-focused report', async () => {
      const organizationId = 'org-123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockEntries: AuditEntry[] = [
        {
          id: 'entry-1',
          sessionId: 'session-1',
          timestamp: new Date('2024-01-15'),
          action: 'user_authenticated',
          component: 'AuthService',
          details: {},
          userId: 'user-1',
          success: true,
          severity: 'info',
        },
        {
          id: 'entry-2',
          sessionId: 'session-2',
          timestamp: new Date('2024-01-16'),
          action: 'user_authorized',
          component: 'AuthService',
          details: {},
          userId: 'user-2',
          success: false,
          severity: 'warning',
        },
        {
          id: 'entry-3',
          sessionId: 'session-3',
          timestamp: new Date('2024-01-17'),
          action: 'security_event',
          component: 'SecurityManager',
          details: { event: 'suspicious_activity' },
          userId: 'user-3',
          success: false,
          severity: 'critical',
        },
      ];

      mockAuditRepository.queryAuditEntries.mockResolvedValue(
        mockEntries
      );

      const report =
        await auditReportingService.generateSecurityReport(
          organizationId,
          startDate,
          endDate
        );

      expect(report.organizationId).toBe(organizationId);
      expect(report.period).toEqual({ startDate, endDate });
      expect(report.authenticationEvents).toBe(1);
      expect(report.authorizationFailures).toBe(1);
      expect(report.suspiciousActivities).toBe(1);
      expect(report.securityIncidents).toHaveLength(1);
      expect(report.riskAssessment).toBe('low');
      expect(report.accessPatterns).toHaveLength(3);
      expect(report.recommendations).toBeInstanceOf(Array);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Generated security report',
        expect.objectContaining({
          organizationId,
          riskAssessment: 'low',
          incidentCount: 1,
        })
      );
    });

    it('should assess critical risk level correctly', async () => {
      const organizationId = 'org-123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      // Create many security incidents to trigger critical risk
      const mockEntries: AuditEntry[] = Array.from(
        { length: 15 },
        (_, i) => ({
          id: `entry-${i}`,
          sessionId: `session-${i}`,
          timestamp: new Date('2024-01-15'),
          action: 'security_event',
          component: 'SecurityManager',
          details: {},
          success: false,
          severity: 'critical',
        })
      );

      mockAuditRepository.queryAuditEntries.mockResolvedValue(
        mockEntries
      );

      const report =
        await auditReportingService.generateSecurityReport(
          organizationId,
          startDate,
          endDate
        );

      expect(report.riskAssessment).toBe('critical');
      expect(report.recommendations).toContain(
        'Immediate security review required. Consider implementing additional security measures.'
      );
    });
  });

  describe('exportReport', () => {
    it('should export report as JSON', async () => {
      const mockReport = {
        id: 'report-123',
        organizationId: 'org-123',
        generatedAt: new Date(),
        data: { test: 'value' },
      };

      const result = await auditReportingService.exportReport(
        mockReport as any,
        'json'
      );

      expect(result).toBe(JSON.stringify(mockReport, null, 2));
    });

    it('should export report as CSV', async () => {
      const mockReport = {
        id: 'report-123',
        organizationId: 'org-123',
        generatedAt: new Date(),
        data: { test: 'value' },
      };

      const result = await auditReportingService.exportReport(
        mockReport as any,
        'csv'
      );

      // For now, CSV export returns JSON string (simplified implementation)
      expect(result).toBe(JSON.stringify(mockReport));
    });

    it('should throw error for unsupported format', async () => {
      const mockReport = { id: 'report-123' };

      await expect(
        auditReportingService.exportReport(
          mockReport as any,
          'xml' as any
        )
      ).rejects.toThrow('Unsupported export format: xml');
    });
  });

  describe('queryAuditEntries', () => {
    it('should query audit entries with filters', async () => {
      const query = {
        organizationId: 'org-123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        action: 'verification_completed' as const,
        limit: 100,
      };

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

      mockAuditRepository.queryAuditEntries.mockResolvedValue(
        mockEntries
      );

      const result = await auditReportingService.queryAuditEntries(
        query
      );

      expect(
        mockAuditRepository.queryAuditEntries
      ).toHaveBeenCalledWith(query);
      expect(result).toBe(mockEntries);
    });

    it('should handle query errors', async () => {
      const query = { organizationId: 'org-123' };
      const error = new Error('Query failed');

      mockAuditRepository.queryAuditEntries.mockRejectedValue(error);

      await expect(
        auditReportingService.queryAuditEntries(query)
      ).rejects.toThrow('Query failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to query audit entries',
        expect.objectContaining({ error, query })
      );
    });
  });

  describe('getAuditTrends', () => {
    it('should calculate daily audit trends', async () => {
      const organizationId = 'org-123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-03');

      const mockEntries: AuditEntry[] = [
        {
          id: 'entry-1',
          sessionId: 'session-1',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          action: 'verification_completed',
          component: 'VerificationEngine',
          details: {},
          success: true,
          severity: 'info',
        },
        {
          id: 'entry-2',
          sessionId: 'session-2',
          timestamp: new Date('2024-01-01T14:00:00Z'),
          action: 'verification_failed',
          component: 'VerificationEngine',
          details: {},
          success: false,
          severity: 'error',
        },
        {
          id: 'entry-3',
          sessionId: 'session-3',
          timestamp: new Date('2024-01-02T09:00:00Z'),
          action: 'verification_completed',
          component: 'VerificationEngine',
          details: {},
          success: true,
          severity: 'info',
        },
      ];

      mockAuditRepository.queryAuditEntries.mockResolvedValue(
        mockEntries
      );

      const trends = await auditReportingService.getAuditTrends(
        organizationId,
        startDate,
        endDate,
        'day'
      );

      expect(trends).toHaveLength(2); // 2 days with data
      expect(trends[0]).toEqual({
        period: '2024-01-01',
        count: 2,
        successRate: 50, // 1 success out of 2
      });
      expect(trends[1]).toEqual({
        period: '2024-01-02',
        count: 1,
        successRate: 100, // 1 success out of 1
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Calculated audit trends',
        expect.objectContaining({
          organizationId,
          granularity: 'day',
          periodCount: 2,
        })
      );
    });

    it('should calculate hourly audit trends', async () => {
      const organizationId = 'org-123';
      const startDate = new Date('2024-01-01T10:00:00Z');
      const endDate = new Date('2024-01-01T12:00:00Z');

      const mockEntries: AuditEntry[] = [
        {
          id: 'entry-1',
          sessionId: 'session-1',
          timestamp: new Date('2024-01-01T10:30:00Z'),
          action: 'verification_completed',
          component: 'VerificationEngine',
          details: {},
          success: true,
          severity: 'info',
        },
        {
          id: 'entry-2',
          sessionId: 'session-2',
          timestamp: new Date('2024-01-01T11:15:00Z'),
          action: 'verification_completed',
          component: 'VerificationEngine',
          details: {},
          success: true,
          severity: 'info',
        },
      ];

      mockAuditRepository.queryAuditEntries.mockResolvedValue(
        mockEntries
      );

      const trends = await auditReportingService.getAuditTrends(
        organizationId,
        startDate,
        endDate,
        'hour'
      );

      expect(trends).toHaveLength(2); // 2 hours with data
      expect(trends[0]).toEqual({
        period: '2024-01-01T10',
        count: 1,
        successRate: 100,
      });
      expect(trends[1]).toEqual({
        period: '2024-01-01T11',
        count: 1,
        successRate: 100,
      });
    });
  });
});
