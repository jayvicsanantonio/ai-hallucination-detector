import { ComplianceReporter } from '../../../../src/modules/compliance-validator/ComplianceReporter';
import { ComplianceRepository } from '../../../../src/database/interfaces/ComplianceRepository';
import { AuditRepository } from '../../../../src/database/interfaces/AuditRepository';
import {
  ComplianceRule,
  ComplianceViolation,
  ComplianceCheckResult,
} from '../../../../src/models/knowledge/ComplianceRule';
import { AuditEntry } from '../../../../src/models/audit/AuditEntry';

describe('ComplianceReporter', () => {
  let reporter: ComplianceReporter;
  let mockComplianceRepository: jest.Mocked<ComplianceRepository>;
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

  const mockCheckResult: ComplianceCheckResult = {
    violations: [mockViolation],
    overallRisk: 'high',
    complianceScore: 75,
    checkedRules: 5,
    applicableRules: [mockRule],
  };

  beforeEach(() => {
    mockComplianceRepository = {
      createRule: jest.fn(),
      updateRule: jest.fn(),
      deleteRule: jest.fn(),
      getRuleById: jest.fn(),
      getRulesByDomain: jest.fn(),
      getAllRules: jest.fn(),
      recordViolation: jest.fn(),
      getViolationsBySession: jest.fn(),
      getViolationsByRule: jest.fn(),
      getViolationStats: jest.fn(),
    };

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

    reporter = new ComplianceReporter(
      mockComplianceRepository,
      mockAuditRepository
    );
  });

  describe('generateReport', () => {
    it('should generate a comprehensive compliance report', async () => {
      const mockAuditEntries: AuditEntry[] = [
        {
          id: 'audit-1',
          sessionId: 'session-1',
          timestamp: new Date(),
          action: 'compliance_check_started',
          component: 'ComplianceValidator',
          details: { domain: 'healthcare' },
          success: true,
          severity: 'info',
        },
      ];

      mockAuditRepository.getEntriesBySession.mockResolvedValue(
        mockAuditEntries
      );

      const report = await reporter.generateReport(
        'session-1',
        'org-1',
        'healthcare',
        mockCheckResult
      );

      expect(report).toBeDefined();
      expect(report.sessionId).toBe('session-1');
      expect(report.organizationId).toBe('org-1');
      expect(report.domain).toBe('healthcare');
      expect(report.summary.totalViolations).toBe(1);
      expect(report.summary.overallRisk).toBe('high');
      expect(report.summary.complianceScore).toBe(75);
      expect(report.violations).toHaveLength(1);
      expect(
        report.recommendations.some((r) =>
          r.includes('High priority: 1 high-severity violations')
        )
      ).toBe(true);
      expect(report.auditTrail).toEqual(mockAuditEntries);

      // Verify audit logging
      expect(mockAuditRepository.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-1',
          action: 'compliance_report_started',
          component: 'ComplianceReporter',
        })
      );
    });

    it('should handle critical violations with immediate recommendations', async () => {
      const criticalViolation: ComplianceViolation = {
        ...mockViolation,
        severity: 'critical',
      };

      const criticalCheckResult: ComplianceCheckResult = {
        ...mockCheckResult,
        violations: [criticalViolation],
        overallRisk: 'critical',
      };

      mockAuditRepository.getEntriesBySession.mockResolvedValue([]);

      const report = await reporter.generateReport(
        'session-1',
        'org-1',
        'healthcare',
        criticalCheckResult
      );

      expect(report.summary.violationsBySeverity.critical).toBe(1);
      expect(
        report.recommendations.some((r) =>
          r.includes(
            'Immediate action required: 1 critical compliance violations'
          )
        )
      ).toBe(true);
      expect(report.violations[0].urgency).toBe('immediate');
      expect(report.violations[0].impact).toBe('critical');
    });

    it('should generate domain-specific recommendations', async () => {
      const hipaaViolation: ComplianceViolation = {
        ...mockViolation,
        rule: { ...mockRule, regulation: 'HIPAA' },
      };

      const hipaaCheckResult: ComplianceCheckResult = {
        ...mockCheckResult,
        violations: [hipaaViolation],
      };

      mockAuditRepository.getEntriesBySession.mockResolvedValue([]);

      const report = await reporter.generateReport(
        'session-1',
        'org-1',
        'healthcare',
        hipaaCheckResult
      );

      // Should include healthcare-specific recommendations
      expect(
        report.recommendations.some(
          (r) =>
            r.includes('HIPAA') || r.includes('patient information')
        )
      ).toBe(true);
    });

    it('should handle report generation errors', async () => {
      mockAuditRepository.getEntriesBySession.mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        reporter.generateReport(
          'session-1',
          'org-1',
          'healthcare',
          mockCheckResult
        )
      ).rejects.toThrow('Database error');

      // Should log the failure
      expect(mockAuditRepository.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'compliance_report_failed',
          details: expect.objectContaining({
            error: 'Database error',
          }),
        })
      );
    });
  });

  describe('generateMetrics', () => {
    it('should generate compliance metrics for an organization', async () => {
      const mockStats = {
        totalViolations: 10,
        violationsBySeverity: {
          critical: 2,
          high: 3,
          medium: 4,
          low: 1,
        },
        violationsByRule: { 'rule-1': 5, 'rule-2': 3, 'rule-3': 2 },
        trendsOverTime: [
          { date: new Date('2023-01-01'), count: 5 },
          { date: new Date('2023-01-02'), count: 3 },
        ],
      };

      mockComplianceRepository.getViolationStats.mockResolvedValue(
        mockStats
      );
      mockComplianceRepository.getRuleById
        .mockResolvedValueOnce({
          ...mockRule,
          id: 'rule-1',
          regulation: 'REG1',
        })
        .mockResolvedValueOnce({
          ...mockRule,
          id: 'rule-2',
          regulation: 'REG2',
        })
        .mockResolvedValueOnce({
          ...mockRule,
          id: 'rule-3',
          regulation: 'REG3',
        });

      const metrics = await reporter.generateMetrics('org-1');

      expect(metrics.complianceScore).toBeLessThan(100); // Should be reduced due to violations
      expect(metrics.riskLevel).toBe('critical'); // Due to critical violations
      expect(metrics.violationTrends).toHaveLength(2);
      expect(metrics.topViolationTypes).toHaveLength(3);
      expect(metrics.topViolationTypes[0].count).toBe(5); // Highest count first
    });

    it('should calculate compliance score correctly', async () => {
      const lowViolationStats = {
        totalViolations: 2,
        violationsBySeverity: { low: 2 },
        violationsByRule: { 'rule-1': 2 },
        trendsOverTime: [],
      };

      mockComplianceRepository.getViolationStats.mockResolvedValue(
        lowViolationStats
      );
      mockComplianceRepository.getRuleById.mockResolvedValue(
        mockRule
      );

      const metrics = await reporter.generateMetrics('org-1');

      expect(metrics.complianceScore).toBeGreaterThan(90); // Should be high for low violations
      expect(metrics.riskLevel).toBe('low');
    });
  });

  describe('exportReport', () => {
    let mockReport: any;

    beforeEach(() => {
      mockReport = {
        id: 'report-1',
        sessionId: 'session-1',
        generatedAt: new Date('2023-01-01'),
        violations: [
          {
            violation: mockViolation,
            impact: 'high',
            urgency: 'high',
            remediation: {
              priority: 75,
              estimatedEffort: 'medium',
              suggestedActions: ['Fix the issue'],
              status: 'pending',
            },
          },
        ],
      };
    });

    it('should export report as JSON', async () => {
      const result = await reporter.exportReport(mockReport, 'json');

      expect(typeof result).toBe('string');
      const parsed = JSON.parse(result as string);
      expect(parsed.id).toBe('report-1');
      expect(parsed.sessionId).toBe('session-1');
    });

    it('should export report as CSV', async () => {
      const result = await reporter.exportReport(mockReport, 'csv');

      expect(typeof result).toBe('string');
      expect(result).toContain(
        '"Violation ID","Rule ID","Regulation"'
      );
      expect(result).toContain('test-rule-1');
      expect(result).toContain('TEST_REG');
    });

    it('should export report as XML', async () => {
      const result = await reporter.exportReport(mockReport, 'xml');

      expect(typeof result).toBe('string');
      expect(result).toContain(
        '<?xml version="1.0" encoding="UTF-8"?>'
      );
      expect(result).toContain('<ComplianceReport>');
      expect(result).toContain('<ruleId>test-rule-1</ruleId>');
    });

    it('should throw error for unsupported format', async () => {
      await expect(
        reporter.exportReport(mockReport, 'unsupported' as any)
      ).rejects.toThrow('Unsupported export format: unsupported');
    });

    it('should log export activity', async () => {
      await reporter.exportReport(mockReport, 'json');

      expect(mockAuditRepository.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'compliance_report_exported',
          details: expect.objectContaining({
            reportId: 'report-1',
            format: 'json',
          }),
        })
      );
    });
  });

  describe('violation assessment', () => {
    it('should assess violation impact correctly for high-risk domains', async () => {
      mockAuditRepository.getEntriesBySession.mockResolvedValue([]);

      // Test healthcare domain (high-risk)
      const healthcareReport = await reporter.generateReport(
        'session-1',
        'org-1',
        'healthcare',
        mockCheckResult
      );

      expect(healthcareReport.violations[0].impact).toBe('critical'); // Escalated from 'high'

      // Test legal domain (high-risk)
      const legalReport = await reporter.generateReport(
        'session-1',
        'org-1',
        'legal',
        mockCheckResult
      );

      expect(legalReport.violations[0].impact).toBe('high'); // Legal is not in high-impact domains
    });

    it('should create appropriate remediation plans', async () => {
      mockAuditRepository.getEntriesBySession.mockResolvedValue([]);

      const report = await reporter.generateReport(
        'session-1',
        'org-1',
        'healthcare',
        mockCheckResult
      );

      const remediation = report.violations[0].remediation;
      expect(remediation.priority).toBeGreaterThan(50); // High priority for high severity
      expect(remediation.estimatedEffort).toBe('medium');
      expect(remediation.suggestedActions).toContain(
        'Fix the violation'
      );
      expect(remediation.suggestedActions).toContain(
        'Verify compliance with TEST_REG'
      );
      expect(remediation.status).toBe('pending');
    });

    it('should generate regulatory context', async () => {
      mockAuditRepository.getEntriesBySession.mockResolvedValue([]);

      const report = await reporter.generateReport(
        'session-1',
        'org-1',
        'healthcare',
        mockCheckResult
      );

      const regulatoryContext =
        report.violations[0].regulatoryContext;
      expect(regulatoryContext.regulation).toBe('TEST_REG');
      expect(regulatoryContext.description).toBe(
        'Test compliance rule'
      );
      expect(regulatoryContext.penalties).toContain(
        'Regulatory penalties may apply'
      );
    });
  });

  describe('regulatory references', () => {
    it('should collect unique regulatory references', async () => {
      const multipleViolations: ComplianceViolation[] = [
        mockViolation,
        {
          ...mockViolation,
          ruleId: 'test-rule-2',
          rule: { ...mockRule, id: 'test-rule-2' },
        },
        {
          ...mockViolation,
          ruleId: 'test-rule-3',
          rule: {
            ...mockRule,
            id: 'test-rule-3',
            regulation: 'DIFFERENT_REG',
          },
        },
      ];

      const multiViolationResult: ComplianceCheckResult = {
        ...mockCheckResult,
        violations: multipleViolations,
      };

      mockAuditRepository.getEntriesBySession.mockResolvedValue([]);

      const report = await reporter.generateReport(
        'session-1',
        'org-1',
        'healthcare',
        multiViolationResult
      );

      expect(report.regulatoryReferences).toHaveLength(2); // TEST_REG and DIFFERENT_REG
      expect(report.regulatoryReferences[0].regulation).toBe(
        'TEST_REG'
      );
      expect(report.regulatoryReferences[1].regulation).toBe(
        'DIFFERENT_REG'
      );
    });
  });
});
