import { ComplianceAuditLogger } from '../../../../src/modules/compliance-validator/ComplianceAuditLogger';
import { AuditRepository } from '../../../../src/database/interfaces/AuditRepository';
import {
  ComplianceRule,
  ComplianceViolation,
} from '../../../../src/models/knowledge/ComplianceRule';
import { AuditEntry } from '../../../../src/models/audit/AuditEntry';

describe('ComplianceAuditLogger', () => {
  let logger: ComplianceAuditLogger;
  let mockAuditRepository: jest.Mocked<AuditRepository>;

  const mockRule: ComplianceRule = {
    id: 'test-rule-1',
    ruleText: 'Test compliance rule',
    regulation: 'TEST_REG',
    jurisdiction: 'US',
    domain: 'healthcare',
    severity: 'high',
    examples: ['Example 1'],
    keywords: ['test', 'compliance'],
    patterns: ['test.*pattern'],
    lastUpdated: new Date('2023-01-01'),
    isActive: true,
  };

  const mockViolation: ComplianceViolation = {
    ruleId: 'test-rule-1',
    rule: mockRule,
    violationType: 'keyword_match',
    location: { start: 0, end: 10, text: 'test text' },
    confidence: 85,
    severity: 'high',
    description: 'Test violation',
    regulatoryReference: 'TEST_REG - Test rule',
    suggestedFix: 'Fix the violation',
  };

  beforeEach(() => {
    mockAuditRepository = {
      createVerificationSession: jest.fn(),
      getVerificationSession: jest.fn(),
      updateVerificationSession: jest.fn(),
      deleteVerificationSession: jest.fn(),
      getVerificationSessionsByUser: jest.fn(),
      getVerificationSessionsByOrganization: jest.fn(),
      createEntry: jest.fn(),
      createAuditEntry: jest.fn(),
      getAuditEntry: jest.fn(),
      getEntriesBySession: jest.fn(),
      getAuditEntriesBySession: jest.fn(),
      queryEntries: jest.fn(),
      queryAuditEntries: jest.fn(),
      getAuditSummary: jest.fn(),
      createFeedbackData: jest.fn(),
      getFeedbackData: jest.fn(),
      getFeedbackByUser: jest.fn(),
      updateFeedbackData: jest.fn(),
      createAuditEntriesBatch: jest.fn(),
      cleanupExpiredAuditData: jest.fn(),
      archiveOldSessions: jest.fn(),
    };

    logger = new ComplianceAuditLogger(mockAuditRepository);
  });

  describe('logComplianceCheckStarted', () => {
    it('should log compliance check start with correct details', async () => {
      await logger.logComplianceCheckStarted(
        'session-1',
        'healthcare',
        'US',
        5,
        'user-1',
        'org-1'
      );

      expect(mockAuditRepository.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-1',
          userId: 'user-1',
          organizationId: 'org-1',
          action: 'compliance_check_started',
          component: 'ComplianceValidator',
          details: {
            domain: 'healthcare',
            jurisdiction: 'US',
            rulesCount: 5,
            timestamp: expect.any(String),
          },
          severity: 'info',
          success: true,
        })
      );
    });

    it('should handle optional parameters', async () => {
      await logger.logComplianceCheckStarted(
        'session-1',
        'healthcare',
        'US',
        5
      );

      expect(mockAuditRepository.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-1',
          userId: undefined,
          organizationId: undefined,
          action: 'compliance_check_started',
        })
      );
    });
  });

  describe('logComplianceCheckCompleted', () => {
    it('should log completion with appropriate severity based on risk', async () => {
      await logger.logComplianceCheckCompleted(
        'session-1',
        3,
        75,
        'critical',
        1500,
        'user-1',
        'org-1'
      );

      expect(mockAuditRepository.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-1',
          action: 'compliance_check_completed',
          details: {
            violationsCount: 3,
            complianceScore: 75,
            overallRisk: 'critical',
            processingTimeMs: 1500,
            timestamp: expect.any(String),
          },
          severity: 'critical',
        })
      );
    });

    it('should map risk levels to appropriate severities', async () => {
      // Test high risk -> error severity
      await logger.logComplianceCheckCompleted(
        'session-1',
        2,
        80,
        'high',
        1000
      );
      expect(
        mockAuditRepository.createEntry
      ).toHaveBeenLastCalledWith(
        expect.objectContaining({ severity: 'error' })
      );

      // Test medium risk -> warning severity
      await logger.logComplianceCheckCompleted(
        'session-1',
        1,
        90,
        'medium',
        1000
      );
      expect(
        mockAuditRepository.createEntry
      ).toHaveBeenLastCalledWith(
        expect.objectContaining({ severity: 'warning' })
      );

      // Test low risk -> info severity
      await logger.logComplianceCheckCompleted(
        'session-1',
        0,
        100,
        'low',
        1000
      );
      expect(
        mockAuditRepository.createEntry
      ).toHaveBeenLastCalledWith(
        expect.objectContaining({ severity: 'info' })
      );
    });
  });

  describe('logComplianceCheckFailed', () => {
    it('should log failure with error severity', async () => {
      await logger.logComplianceCheckFailed(
        'session-1',
        'Database connection failed',
        'rule_loading',
        'user-1',
        'org-1'
      );

      expect(mockAuditRepository.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-1',
          action: 'compliance_check_failed',
          details: {
            error: 'Database connection failed',
            stage: 'rule_loading',
            timestamp: expect.any(String),
          },
          severity: 'error',
        })
      );
    });
  });

  describe('logViolationDetected', () => {
    it('should log violation with details and appropriate severity', async () => {
      await logger.logViolationDetected(
        'session-1',
        mockViolation,
        'user-1',
        'org-1'
      );

      expect(mockAuditRepository.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-1',
          action: 'violation_detected',
          details: {
            ruleId: 'test-rule-1',
            regulation: 'TEST_REG',
            violationType: 'keyword_match',
            severity: 'high',
            confidence: 85,
            location: { start: 0, end: 10, text: 'test text' },
            description: 'Test violation',
            regulatoryReference: 'TEST_REG - Test rule',
            timestamp: expect.any(String),
          },
          severity: 'error', // high violation -> error severity
        })
      );
    });

    it('should map violation severities correctly', async () => {
      // Test critical violation
      const criticalViolation = {
        ...mockViolation,
        severity: 'critical' as const,
      };
      await logger.logViolationDetected(
        'session-1',
        criticalViolation
      );
      expect(
        mockAuditRepository.createEntry
      ).toHaveBeenLastCalledWith(
        expect.objectContaining({ severity: 'critical' })
      );

      // Test medium violation
      const mediumViolation = {
        ...mockViolation,
        severity: 'medium' as const,
      };
      await logger.logViolationDetected('session-1', mediumViolation);
      expect(
        mockAuditRepository.createEntry
      ).toHaveBeenLastCalledWith(
        expect.objectContaining({ severity: 'warning' })
      );

      // Test low violation
      const lowViolation = {
        ...mockViolation,
        severity: 'low' as const,
      };
      await logger.logViolationDetected('session-1', lowViolation);
      expect(
        mockAuditRepository.createEntry
      ).toHaveBeenLastCalledWith(
        expect.objectContaining({ severity: 'info' })
      );
    });
  });

  describe('logRuleApplied', () => {
    it('should log rule application with match count', async () => {
      await logger.logRuleApplied(
        'session-1',
        mockRule,
        3,
        'user-1',
        'org-1'
      );

      expect(mockAuditRepository.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-1',
          action: 'rule_applied',
          details: {
            ruleId: 'test-rule-1',
            regulation: 'TEST_REG',
            domain: 'healthcare',
            jurisdiction: 'US',
            severity: 'high',
            matchesFound: 3,
            timestamp: expect.any(String),
          },
          severity: 'info',
        })
      );
    });
  });

  describe('logRuleSkipped', () => {
    it('should log rule skipping with reason', async () => {
      await logger.logRuleSkipped(
        'session-1',
        mockRule,
        'Rule not applicable to content type',
        'user-1',
        'org-1'
      );

      expect(mockAuditRepository.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-1',
          action: 'rule_skipped',
          details: {
            ruleId: 'test-rule-1',
            regulation: 'TEST_REG',
            reason: 'Rule not applicable to content type',
            timestamp: expect.any(String),
          },
          severity: 'info',
        })
      );
    });
  });

  describe('rule management logging', () => {
    it('should log rule creation', async () => {
      await logger.logRuleCreated(mockRule, 'user-1', 'org-1');

      expect(mockAuditRepository.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'rule_created',
          details: {
            ruleId: 'test-rule-1',
            regulation: 'TEST_REG',
            domain: 'healthcare',
            jurisdiction: 'US',
            severity: 'high',
            keywordsCount: 2,
            patternsCount: 1,
            timestamp: expect.any(String),
          },
          severity: 'info',
        })
      );
    });

    it('should log rule updates', async () => {
      const updates = {
        severity: 'critical' as const,
        ruleText: 'Updated rule text',
      };
      await logger.logRuleUpdated(
        'test-rule-1',
        updates,
        'user-1',
        'org-1'
      );

      expect(mockAuditRepository.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'rule_updated',
          details: {
            ruleId: 'test-rule-1',
            updatedFields: ['severity', 'ruleText'],
            updates: {
              severity: 'critical',
              ruleText: 'Updated rule text',
            },
            timestamp: expect.any(String),
          },
          severity: 'info',
        })
      );
    });

    it('should log rule deletion with warning severity', async () => {
      await logger.logRuleDeleted(
        'test-rule-1',
        'TEST_REG',
        'user-1',
        'org-1'
      );

      expect(mockAuditRepository.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'rule_deleted',
          details: {
            ruleId: 'test-rule-1',
            regulation: 'TEST_REG',
            timestamp: expect.any(String),
          },
          severity: 'warning',
        })
      );
    });
  });

  describe('reporting and remediation logging', () => {
    it('should log report generation', async () => {
      await logger.logReportGenerated(
        'session-1',
        'report-1',
        'detailed_analysis',
        5,
        'user-1',
        'org-1'
      );

      expect(mockAuditRepository.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'compliance_report_generated',
          details: {
            reportId: 'report-1',
            reportType: 'detailed_analysis',
            violationsCount: 5,
            timestamp: expect.any(String),
          },
        })
      );
    });

    it('should log report export', async () => {
      await logger.logReportExported(
        'session-1',
        'report-1',
        'pdf',
        'user-1',
        'org-1'
      );

      expect(mockAuditRepository.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'compliance_report_exported',
          details: {
            reportId: 'report-1',
            format: 'pdf',
            timestamp: expect.any(String),
          },
        })
      );
    });

    it('should log remediation start and completion', async () => {
      const remediationPlan = {
        priority: 75,
        estimatedEffort: 'medium',
        suggestedActions: ['Fix issue', 'Review policy'],
      };

      await logger.logRemediationStarted(
        'session-1',
        'violation-1',
        remediationPlan,
        'user-1',
        'org-1'
      );

      expect(mockAuditRepository.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'remediation_started',
          details: {
            violationId: 'violation-1',
            priority: 75,
            estimatedEffort: 'medium',
            actionsCount: 2,
            timestamp: expect.any(String),
          },
        })
      );

      await logger.logRemediationCompleted(
        'session-1',
        'violation-1',
        'Issue resolved by updating content',
        'user-1',
        'org-1'
      );

      expect(mockAuditRepository.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'remediation_completed',
          details: {
            violationId: 'violation-1',
            resolutionDetails: 'Issue resolved by updating content',
            timestamp: expect.any(String),
          },
        })
      );
    });
  });

  describe('threshold monitoring', () => {
    it('should log threshold exceedance with warning severity', async () => {
      await logger.logThresholdExceeded(
        'session-1',
        'violation_rate',
        15,
        10,
        'user-1',
        'org-1'
      );

      expect(mockAuditRepository.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'compliance_threshold_exceeded',
          details: {
            threshold: 'violation_rate',
            currentValue: 15,
            thresholdValue: 10,
            exceedancePercentage: 50, // (15-10)/10 * 100
            timestamp: expect.any(String),
          },
          severity: 'warning',
        })
      );
    });
  });

  describe('queryEvents', () => {
    it('should query and filter compliance events', async () => {
      const mockEntries: AuditEntry[] = [
        {
          id: 'entry-1',
          sessionId: 'session-1',
          timestamp: new Date(),
          action: 'compliance_check_started',
          component: 'ComplianceValidator',
          details: {
            ruleId: 'rule-1',
            regulation: 'HIPAA',
            domain: 'healthcare',
          },
          success: true,
          severity: 'info',
        },
        {
          id: 'entry-2',
          sessionId: 'session-1',
          timestamp: new Date(),
          action: 'violation_detected',
          component: 'ComplianceValidator',
          details: {
            ruleId: 'rule-2',
            regulation: 'SOX',
            domain: 'financial',
          },
          success: true,
          severity: 'error',
        },
      ];

      mockAuditRepository.queryEntries.mockResolvedValue(mockEntries);

      const results = await logger.queryEvents({
        sessionId: 'session-1',
        ruleId: 'rule-1',
      });

      expect(results).toHaveLength(1);
      expect(results[0].details.ruleId).toBe('rule-1');
    });
  });

  describe('generateAuditSummary', () => {
    it('should generate comprehensive audit summary', async () => {
      const mockEntries: AuditEntry[] = [
        {
          id: 'entry-1',
          sessionId: 'session-1',
          timestamp: new Date('2023-01-01'),
          action: 'violation_detected',
          component: 'ComplianceValidator',
          details: { ruleId: 'rule-1', regulation: 'HIPAA' },
          userId: 'user-1',
          success: true,
          severity: 'error',
        },
        {
          id: 'entry-2',
          sessionId: 'session-2',
          timestamp: new Date('2023-01-02'),
          action: 'remediation_completed',
          component: 'ComplianceValidator',
          details: { ruleId: 'rule-1', regulation: 'HIPAA' },
          userId: 'user-1',
          success: true,
          severity: 'info',
        },
        {
          id: 'entry-3',
          sessionId: 'session-3',
          timestamp: new Date('2023-01-03'),
          action: 'rule_created',
          component: 'ComplianceValidator',
          details: { ruleId: 'rule-2', regulation: 'SOX' },
          userId: 'user-2',
          success: true,
          severity: 'info',
        },
      ];

      mockAuditRepository.queryEntries.mockResolvedValue(mockEntries);

      const summary = await logger.generateAuditSummary({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
      });

      expect(summary.totalEvents).toBe(3);
      expect(summary.violationEvents).toBe(1);
      expect(summary.remediationEvents).toBe(1);
      expect(summary.ruleManagementEvents).toBe(1);
      expect(summary.topRules).toHaveLength(2);
      expect(summary.topUsers).toHaveLength(2);
      expect(summary.timeRange.earliest).toEqual(
        new Date('2023-01-01')
      );
      expect(summary.timeRange.latest).toEqual(
        new Date('2023-01-03')
      );
    });
  });

  describe('error handling', () => {
    it('should handle audit repository failures gracefully', async () => {
      mockAuditRepository.createEntry.mockRejectedValue(
        new Error('Database error')
      );

      // Should not throw error - audit failures shouldn't break compliance checks
      await expect(
        logger.logComplianceCheckStarted(
          'session-1',
          'healthcare',
          'US',
          5
        )
      ).resolves.toBeUndefined();
    });

    it('should sanitize sensitive data in rule updates', async () => {
      const updates = {
        ruleText: 'Updated rule',
        regulation: 'NEW_REG',
        sensitiveField: 'should not be logged',
      };

      await logger.logRuleUpdated(
        'rule-1',
        updates as any,
        'user-1',
        'org-1'
      );

      const loggedDetails = (
        mockAuditRepository.createEntry as jest.Mock
      ).mock.calls[0][0].details;
      expect(loggedDetails.updates).toHaveProperty('ruleText');
      expect(loggedDetails.updates).toHaveProperty('regulation');
      expect(loggedDetails.updates).not.toHaveProperty(
        'sensitiveField'
      );
    });
  });
});
