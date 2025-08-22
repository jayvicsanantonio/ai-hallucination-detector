import { EnhancedComplianceValidator } from '../../../../src/modules/compliance-validator/EnhancedComplianceValidator';
import { DatabaseRulesEngine } from '../../../../src/modules/compliance-validator/DatabaseRulesEngine';
import { ComplianceRepository } from '../../../../src/database/interfaces/ComplianceRepository';
import { ParsedContent } from '../../../../src/models/core/ParsedContent';
import { ComplianceRule } from '../../../../src/models/knowledge/ComplianceRule';

// Mock implementation of ComplianceRepository
class MockComplianceRepository implements ComplianceRepository {
  private rules: Map<string, ComplianceRule> = new Map();
  private violations: any[] = [];

  async createRule(
    rule: Omit<ComplianceRule, 'id'>
  ): Promise<ComplianceRule> {
    const id = `rule-${Date.now()}-${Math.random()}`;
    const newRule: ComplianceRule = { ...rule, id };
    this.rules.set(id, newRule);
    return newRule;
  }

  async updateRule(
    id: string,
    updates: Partial<ComplianceRule>
  ): Promise<ComplianceRule> {
    const rule = this.rules.get(id);
    if (!rule) throw new Error('Rule not found');
    const updatedRule = { ...rule, ...updates };
    this.rules.set(id, updatedRule);
    return updatedRule;
  }

  async deleteRule(id: string): Promise<void> {
    this.rules.delete(id);
  }

  async getRuleById(id: string): Promise<ComplianceRule | null> {
    return this.rules.get(id) || null;
  }

  async getRulesByDomain(
    domain: string,
    jurisdiction?: string
  ): Promise<ComplianceRule[]> {
    const allRules = Array.from(this.rules.values());
    return allRules.filter(
      (rule) =>
        rule.domain === domain &&
        rule.isActive &&
        (!jurisdiction ||
          rule.jurisdiction === jurisdiction ||
          rule.jurisdiction === 'GLOBAL')
    );
  }

  async getAllRules(): Promise<ComplianceRule[]> {
    return Array.from(this.rules.values());
  }

  async recordViolation(violation: any): Promise<void> {
    this.violations.push({
      ...violation,
      id: `violation-${Date.now()}`,
    });
  }

  async getViolationsBySession(sessionId: string): Promise<any[]> {
    return this.violations.filter(
      (v) => v.verification_session_id === sessionId
    );
  }

  async getViolationsByRule(ruleId: string): Promise<any[]> {
    return this.violations.filter((v) => v.rule_id === ruleId);
  }

  async getViolationStats(
    domain?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<any> {
    let filteredViolations = this.violations;

    if (domain) {
      filteredViolations = filteredViolations.filter(
        (v) => v.rule?.domain === domain
      );
    }

    return {
      totalViolations: filteredViolations.length,
      violationsBySeverity: {
        critical: filteredViolations.filter(
          (v) => v.severity === 'critical'
        ).length,
        high: filteredViolations.filter((v) => v.severity === 'high')
          .length,
        medium: filteredViolations.filter(
          (v) => v.severity === 'medium'
        ).length,
        low: filteredViolations.filter((v) => v.severity === 'low')
          .length,
      },
      violationsByRule: {},
      trendsOverTime: [],
    };
  }
}

describe('EnhancedComplianceValidator', () => {
  let validator: EnhancedComplianceValidator;
  let mockRepository: MockComplianceRepository;
  let rulesEngine: DatabaseRulesEngine;

  beforeEach(async () => {
    mockRepository = new MockComplianceRepository();
    rulesEngine = new DatabaseRulesEngine(mockRepository);
    validator = new EnhancedComplianceValidator(
      mockRepository,
      rulesEngine
    );

    // Add some test rules
    await rulesEngine.addRule({
      ruleText: 'PHI must be protected',
      regulation: 'HIPAA',
      jurisdiction: 'US',
      domain: 'healthcare',
      severity: 'critical',
      examples: [],
      keywords: ['ssn', 'social security', 'patient'],
      patterns: ['\\b\\d{3}-\\d{2}-\\d{4}\\b'],
      lastUpdated: new Date(),
      isActive: true,
    });

    await rulesEngine.addRule({
      ruleText: 'Financial accuracy required',
      regulation: 'SOX',
      jurisdiction: 'US',
      domain: 'financial',
      severity: 'high',
      examples: [],
      keywords: ['revenue', 'profit', 'material weakness'],
      patterns: [
        '\\b(revenue|profit)\\s+increased\\s+by\\s+\\d{3,}%\\b',
      ],
      lastUpdated: new Date(),
      isActive: true,
    });
  });

  describe('validateCompliance', () => {
    it('should detect keyword violations with contextual analysis', async () => {
      const content: ParsedContent = {
        id: 'test-1',
        originalContent:
          'Patient John Doe has confidential medical information',
        extractedText:
          'Patient John Doe has confidential medical information',
        contentType: 'text',
        structure: {
          sections: [],
          tables: [],
          figures: [],
          references: [],
        },
        entities: [],
        metadata: {},
        createdAt: new Date(),
      };

      const result = await validator.validateCompliance(
        content,
        'healthcare',
        'US'
      );

      expect(result.violations.length).toBeGreaterThan(0);

      const patientViolation = result.violations.find(
        (v) =>
          v.violationType === 'keyword_match' &&
          v.location.text.includes('patient')
      );
      expect(patientViolation).toBeDefined();
      expect(patientViolation?.confidence).toBeGreaterThan(60);
    });

    it('should detect pattern violations with confidence scoring', async () => {
      const content: ParsedContent = {
        id: 'test-2',
        originalContent: 'SSN: 123-45-6789 for patient records',
        extractedText: 'SSN: 123-45-6789 for patient records',
        contentType: 'text',
        structure: {
          sections: [],
          tables: [],
          figures: [],
          references: [],
        },
        entities: [],
        metadata: {},
        createdAt: new Date(),
      };

      const result = await validator.validateCompliance(
        content,
        'healthcare',
        'US'
      );

      expect(result.violations.length).toBeGreaterThan(0);

      const ssnViolation = result.violations.find(
        (v) =>
          v.violationType === 'pattern_match' &&
          v.location.text === '123-45-6789'
      );
      expect(ssnViolation).toBeDefined();
      expect(ssnViolation?.confidence).toBeGreaterThan(85);
    });

    it('should detect missing required disclosures', async () => {
      const content: ParsedContent = {
        id: 'test-3',
        originalContent:
          'We process your personal information for business purposes',
        extractedText:
          'We process your personal information for business purposes',
        contentType: 'text',
        structure: {
          sections: [],
          tables: [],
          figures: [],
          references: [],
        },
        entities: [],
        metadata: {},
        createdAt: new Date(),
      };

      const result = await validator.validateCompliance(
        content,
        'healthcare',
        'US'
      );

      const missingDisclosure = result.violations.find(
        (v) =>
          v.violationType === 'semantic_match' &&
          v.description.includes('Missing required disclosure')
      );
      expect(missingDisclosure).toBeDefined();
    });

    it('should detect contradictory statements', async () => {
      const content: ParsedContent = {
        id: 'test-4',
        originalContent:
          'This investment is guaranteed profitable but may lose money',
        extractedText:
          'This investment is guaranteed profitable but may lose money',
        contentType: 'text',
        structure: {
          sections: [],
          tables: [],
          figures: [],
          references: [],
        },
        entities: [],
        metadata: {},
        createdAt: new Date(),
      };

      const result = await validator.validateCompliance(
        content,
        'financial',
        'US'
      );

      const contradiction = result.violations.find(
        (v) => v.ruleId === 'contradiction-detected'
      );
      expect(contradiction).toBeDefined();
      expect(contradiction?.severity).toBe('critical');
    });

    it('should record violations when session ID provided', async () => {
      const content: ParsedContent = {
        id: 'test-5',
        originalContent: 'Patient SSN: 123-45-6789',
        extractedText: 'Patient SSN: 123-45-6789',
        contentType: 'text',
        structure: {
          sections: [],
          tables: [],
          figures: [],
          references: [],
        },
        entities: [],
        metadata: {},
        createdAt: new Date(),
      };

      const sessionId = 'test-session-123';
      await validator.validateCompliance(
        content,
        'healthcare',
        'US',
        sessionId
      );

      const recordedViolations =
        await mockRepository.getViolationsBySession(sessionId);
      expect(recordedViolations.length).toBeGreaterThan(0);
    });

    it('should calculate compliance score correctly', async () => {
      const content: ParsedContent = {
        id: 'test-6',
        originalContent: 'Clean business document with no violations',
        extractedText: 'Clean business document with no violations',
        contentType: 'text',
        structure: {
          sections: [],
          tables: [],
          figures: [],
          references: [],
        },
        entities: [],
        metadata: {},
        createdAt: new Date(),
      };

      const result = await validator.validateCompliance(
        content,
        'healthcare',
        'US'
      );

      expect(result.complianceScore).toBeGreaterThanOrEqual(0);
      expect(result.complianceScore).toBeLessThanOrEqual(100);
      expect(typeof result.complianceScore).toBe('number');
    });

    it('should handle different domains correctly', async () => {
      const content: ParsedContent = {
        id: 'test-7',
        originalContent:
          'Revenue increased by 500% with no material weaknesses',
        extractedText:
          'Revenue increased by 500% with no material weaknesses',
        contentType: 'text',
        structure: {
          sections: [],
          tables: [],
          figures: [],
          references: [],
        },
        entities: [],
        metadata: {},
        createdAt: new Date(),
      };

      const result = await validator.validateCompliance(
        content,
        'financial',
        'US'
      );

      expect(result.violations.length).toBeGreaterThan(0);
      expect(
        result.applicableRules.every(
          (rule) => rule.domain === 'financial'
        )
      ).toBe(true);
    });

    it('should return appropriate risk levels', async () => {
      const criticalContent: ParsedContent = {
        id: 'test-8',
        originalContent:
          'Patient SSN: 123-45-6789 with critical health data',
        extractedText:
          'Patient SSN: 123-45-6789 with critical health data',
        contentType: 'text',
        structure: {
          sections: [],
          tables: [],
          figures: [],
          references: [],
        },
        entities: [],
        metadata: {},
        createdAt: new Date(),
      };

      const result = await validator.validateCompliance(
        criticalContent,
        'healthcare',
        'US'
      );

      expect(['high', 'critical']).toContain(result.overallRisk);
    });
  });

  describe('addRule', () => {
    it('should add a valid rule', async () => {
      const newRule: Omit<ComplianceRule, 'id'> = {
        ruleText: 'New test rule',
        regulation: 'TEST_REG',
        jurisdiction: 'US',
        domain: 'legal',
        severity: 'medium',
        examples: [],
        keywords: ['test'],
        patterns: [],
        lastUpdated: new Date(),
        isActive: true,
      };

      const addedRule = await validator.addRule(newRule);

      expect(addedRule.id).toBeDefined();
      expect(addedRule.ruleText).toBe('New test rule');
    });

    it('should reject invalid rule', async () => {
      const invalidRule: Omit<ComplianceRule, 'id'> = {
        ruleText: '', // Invalid: empty
        regulation: 'TEST_REG',
        jurisdiction: 'US',
        domain: 'legal',
        severity: 'medium',
        examples: [],
        keywords: [],
        patterns: [],
        lastUpdated: new Date(),
        isActive: true,
      };

      await expect(validator.addRule(invalidRule)).rejects.toThrow(
        'Invalid rule'
      );
    });
  });

  describe('updateRule', () => {
    it('should update an existing rule', async () => {
      const rule = await validator.addRule({
        ruleText: 'Original rule',
        regulation: 'TEST_REG',
        jurisdiction: 'US',
        domain: 'legal',
        severity: 'medium',
        examples: [],
        keywords: [],
        patterns: [],
        lastUpdated: new Date(),
        isActive: true,
      });

      const updatedRule = await validator.updateRule(rule.id, {
        ruleText: 'Updated rule',
        severity: 'high',
      });

      expect(updatedRule.ruleText).toBe('Updated rule');
      expect(updatedRule.severity).toBe('high');
    });

    it('should reject invalid updates', async () => {
      const rule = await validator.addRule({
        ruleText: 'Original rule',
        regulation: 'TEST_REG',
        jurisdiction: 'US',
        domain: 'legal',
        severity: 'medium',
        examples: [],
        keywords: [],
        patterns: [],
        lastUpdated: new Date(),
        isActive: true,
      });

      await expect(
        validator.updateRule(rule.id, {
          domain: 'invalid' as any,
        })
      ).rejects.toThrow('Invalid rule updates');
    });
  });

  describe('getViolationStats', () => {
    it('should return violation statistics', async () => {
      // First create some violations by running compliance checks
      const content: ParsedContent = {
        id: 'test-stats',
        originalContent: 'Patient SSN: 123-45-6789',
        extractedText: 'Patient SSN: 123-45-6789',
        contentType: 'text',
        structure: {
          sections: [],
          tables: [],
          figures: [],
          references: [],
        },
        entities: [],
        metadata: {},
        createdAt: new Date(),
      };

      await validator.validateCompliance(
        content,
        'healthcare',
        'US',
        'session-stats'
      );

      const stats = await validator.getViolationStats('healthcare');

      expect(stats.totalViolations).toBeGreaterThanOrEqual(0);
      expect(stats.violationsBySeverity).toBeDefined();
      expect(typeof stats.violationsBySeverity.critical).toBe(
        'number'
      );
    });
  });

  describe('contextual risk assessment', () => {
    it('should assess higher risk for sensitive contexts', async () => {
      const sensitiveContent: ParsedContent = {
        id: 'test-context-1',
        originalContent:
          'Patient John Doe has confidential diagnosis information',
        extractedText:
          'Patient John Doe has confidential diagnosis information',
        contentType: 'text',
        structure: {
          sections: [],
          tables: [],
          figures: [],
          references: [],
        },
        entities: [],
        metadata: {},
        createdAt: new Date(),
      };

      const result = await validator.validateCompliance(
        sensitiveContent,
        'healthcare',
        'US'
      );

      const patientViolation = result.violations.find((v) =>
        v.location.text.includes('patient')
      );
      expect(patientViolation?.confidence).toBeGreaterThan(70);
    });

    it('should assess lower risk for non-sensitive contexts', async () => {
      const nonSensitiveContent: ParsedContent = {
        id: 'test-context-2',
        originalContent:
          'The patient portal system is being updated for better user experience',
        extractedText:
          'The patient portal system is being updated for better user experience',
        contentType: 'text',
        structure: {
          sections: [],
          tables: [],
          figures: [],
          references: [],
        },
        entities: [],
        metadata: {},
        createdAt: new Date(),
      };

      const result = await validator.validateCompliance(
        nonSensitiveContent,
        'healthcare',
        'US'
      );

      // Should have fewer violations or lower confidence scores
      const patientViolations = result.violations.filter(
        (v) =>
          v.location.text.includes('patient') &&
          v.violationType === 'keyword_match'
      );

      // In a technical context like "patient portal system", the risk should be lower
      // or there should be no keyword violations due to contextual analysis
      if (patientViolations.length > 0) {
        expect(patientViolations[0].confidence).toBeLessThan(90);
      } else {
        // It's also acceptable to have no violations in this context
        expect(patientViolations.length).toBe(0);
      }
    });
  });
});
