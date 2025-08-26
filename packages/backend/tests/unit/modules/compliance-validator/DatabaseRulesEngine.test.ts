import { DatabaseRulesEngine } from '../../../../src/modules/compliance-validator/DatabaseRulesEngine';
import { ComplianceRepository } from '../../../../src/database/interfaces/ComplianceRepository';
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
        (!jurisdiction ||
          rule.jurisdiction === jurisdiction ||
          rule.jurisdiction === 'GLOBAL')
    );
  }

  async getAllRules(): Promise<ComplianceRule[]> {
    return Array.from(this.rules.values());
  }

  async recordViolation(violation: any): Promise<void> {
    this.violations.push(violation);
  }

  async getViolationsBySession(sessionId: string): Promise<any[]> {
    return this.violations.filter(
      (v) => v.verification_session_id === sessionId
    );
  }

  async getViolationsByRule(ruleId: string): Promise<any[]> {
    return this.violations.filter((v) => v.rule_id === ruleId);
  }

  async getViolationStats(): Promise<any> {
    return {
      totalViolations: this.violations.length,
      violationsBySeverity: {},
      violationsByRule: {},
      trendsOverTime: [],
    };
  }
}

describe('DatabaseRulesEngine', () => {
  let rulesEngine: DatabaseRulesEngine;
  let mockRepository: MockComplianceRepository;

  beforeEach(() => {
    mockRepository = new MockComplianceRepository();
    rulesEngine = new DatabaseRulesEngine(mockRepository);
  });

  describe('addRule', () => {
    it('should add a new rule successfully', async () => {
      const newRule: Omit<ComplianceRule, 'id'> = {
        ruleText: 'Test rule for database engine',
        regulation: 'TEST_REG',
        jurisdiction: 'US',
        domain: 'healthcare',
        severity: 'medium',
        examples: ['Test example'],
        keywords: ['test'],
        patterns: ['\\btest\\b'],
        lastUpdated: new Date(),
        isActive: true,
      };

      const addedRule = await rulesEngine.addRule(newRule);

      expect(addedRule.id).toBeDefined();
      expect(addedRule.ruleText).toBe(
        'Test rule for database engine'
      );
      expect(addedRule.domain).toBe('healthcare');
    });
  });

  describe('getApplicableRules', () => {
    beforeEach(async () => {
      // Add test rules
      await rulesEngine.addRule({
        ruleText: 'Healthcare rule US',
        regulation: 'HIPAA',
        jurisdiction: 'US',
        domain: 'healthcare',
        severity: 'high',
        examples: [],
        keywords: ['patient'],
        patterns: [],
        lastUpdated: new Date(),
        isActive: true,
      });

      await rulesEngine.addRule({
        ruleText: 'Healthcare rule EU',
        regulation: 'GDPR',
        jurisdiction: 'EU',
        domain: 'healthcare',
        severity: 'high',
        examples: [],
        keywords: ['personal data'],
        patterns: [],
        lastUpdated: new Date(),
        isActive: true,
      });

      await rulesEngine.addRule({
        ruleText: 'Inactive rule',
        regulation: 'OLD_REG',
        jurisdiction: 'US',
        domain: 'healthcare',
        severity: 'low',
        examples: [],
        keywords: [],
        patterns: [],
        lastUpdated: new Date(),
        isActive: false,
      });
    });

    it('should return rules for specific domain and jurisdiction', async () => {
      const rules = await rulesEngine.getApplicableRules(
        'healthcare',
        'US'
      );

      expect(rules.length).toBe(1);
      expect(rules[0].regulation).toBe('HIPAA');
      expect(rules[0].jurisdiction).toBe('US');
    });

    it('should only return active rules', async () => {
      const rules = await rulesEngine.getApplicableRules(
        'healthcare',
        'US'
      );

      expect(rules.every((rule) => rule.isActive)).toBe(true);
    });

    it('should return empty array for non-existent domain', async () => {
      const rules = await rulesEngine.getApplicableRules(
        'nonexistent' as any,
        'US'
      );

      expect(rules.length).toBe(0);
    });
  });

  describe('updateRule', () => {
    it('should update an existing rule', async () => {
      const rule = await rulesEngine.addRule({
        ruleText: 'Original rule text',
        regulation: 'TEST_REG',
        jurisdiction: 'US',
        domain: 'healthcare',
        severity: 'medium',
        examples: [],
        keywords: [],
        patterns: [],
        lastUpdated: new Date(),
        isActive: true,
      });

      const updatedRule = await rulesEngine.updateRule(rule.id, {
        ruleText: 'Updated rule text',
        severity: 'high',
      });

      expect(updatedRule.ruleText).toBe('Updated rule text');
      expect(updatedRule.severity).toBe('high');
      expect(updatedRule.id).toBe(rule.id);
    });
  });

  describe('deactivateRule', () => {
    it('should deactivate a rule', async () => {
      const rule = await rulesEngine.addRule({
        ruleText: 'Rule to deactivate',
        regulation: 'TEST_REG',
        jurisdiction: 'US',
        domain: 'healthcare',
        severity: 'medium',
        examples: [],
        keywords: [],
        patterns: [],
        lastUpdated: new Date(),
        isActive: true,
      });

      await rulesEngine.deactivateRule(rule.id);

      const deactivatedRule = await rulesEngine.getRuleById(rule.id);
      expect(deactivatedRule?.isActive).toBe(false);
    });
  });

  describe('validateRule', () => {
    it('should validate a correct rule', () => {
      const rule: Partial<ComplianceRule> = {
        ruleText: 'Valid rule text',
        regulation: 'TEST_REG',
        jurisdiction: 'US',
        domain: 'healthcare',
        severity: 'medium',
        keywords: ['test'],
        patterns: ['\\btest\\b'],
      };

      const validation = rulesEngine.validateRule(rule);

      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should reject rule with missing required fields', () => {
      const rule: Partial<ComplianceRule> = {
        ruleText: '',
        regulation: '',
      };

      const validation = rulesEngine.validateRule(rule);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors).toContain('Rule text is required');
      expect(validation.errors).toContain('Regulation is required');
    });

    it('should reject rule with invalid regex pattern', () => {
      const rule: Partial<ComplianceRule> = {
        ruleText: 'Valid rule text',
        regulation: 'TEST_REG',
        jurisdiction: 'US',
        domain: 'healthcare',
        severity: 'medium',
        patterns: ['[invalid regex'],
      };

      const validation = rulesEngine.validateRule(rule);

      expect(validation.isValid).toBe(false);
      expect(
        validation.errors.some((error) =>
          error.includes('Invalid regex pattern')
        )
      ).toBe(true);
    });

    it('should reject rule with invalid domain', () => {
      const rule: Partial<ComplianceRule> = {
        ruleText: 'Valid rule text',
        regulation: 'TEST_REG',
        jurisdiction: 'US',
        domain: 'invalid' as any,
        severity: 'medium',
      };

      const validation = rulesEngine.validateRule(rule);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        'Valid domain is required (legal, financial, healthcare, insurance)'
      );
    });
  });

  describe('importRules', () => {
    it('should import multiple rules successfully', async () => {
      const rulesToImport: Omit<ComplianceRule, 'id'>[] = [
        {
          ruleText: 'Import rule 1',
          regulation: 'REG1',
          jurisdiction: 'US',
          domain: 'healthcare',
          severity: 'medium',
          examples: [],
          keywords: [],
          patterns: [],
          lastUpdated: new Date(),
          isActive: true,
        },
        {
          ruleText: 'Import rule 2',
          regulation: 'REG2',
          jurisdiction: 'US',
          domain: 'financial',
          severity: 'high',
          examples: [],
          keywords: [],
          patterns: [],
          lastUpdated: new Date(),
          isActive: true,
        },
      ];

      const importedRules = await rulesEngine.importRules(
        rulesToImport
      );

      expect(importedRules.length).toBe(2);
      expect(importedRules[0].ruleText).toBe('Import rule 1');
      expect(importedRules[1].ruleText).toBe('Import rule 2');
    });
  });

  describe('getOutdatedRules', () => {
    it('should return rules older than specified age', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 400); // 400 days ago

      await rulesEngine.addRule({
        ruleText: 'Old rule',
        regulation: 'OLD_REG',
        jurisdiction: 'US',
        domain: 'healthcare',
        severity: 'medium',
        examples: [],
        keywords: [],
        patterns: [],
        lastUpdated: oldDate,
        isActive: true,
      });

      await rulesEngine.addRule({
        ruleText: 'New rule',
        regulation: 'NEW_REG',
        jurisdiction: 'US',
        domain: 'healthcare',
        severity: 'medium',
        examples: [],
        keywords: [],
        patterns: [],
        lastUpdated: new Date(),
        isActive: true,
      });

      const outdatedRules = await rulesEngine.getOutdatedRules(365);

      expect(outdatedRules.length).toBe(1);
      expect(outdatedRules[0].ruleText).toBe('Old rule');
    });
  });

  describe('cloneRule', () => {
    it('should clone a rule with modifications', async () => {
      const originalRule = await rulesEngine.addRule({
        ruleText: 'Original rule',
        regulation: 'ORIGINAL_REG',
        jurisdiction: 'US',
        domain: 'healthcare',
        severity: 'medium',
        examples: [],
        keywords: ['original'],
        patterns: [],
        lastUpdated: new Date(),
        isActive: true,
      });

      const clonedRule = await rulesEngine.cloneRule(
        originalRule.id,
        {
          ruleText: 'Cloned rule',
          jurisdiction: 'EU',
          keywords: ['cloned'],
        }
      );

      expect(clonedRule.id).not.toBe(originalRule.id);
      expect(clonedRule.ruleText).toBe('Cloned rule');
      expect(clonedRule.jurisdiction).toBe('EU');
      expect(clonedRule.keywords).toEqual(['cloned']);
      expect(clonedRule.regulation).toBe('ORIGINAL_REG'); // Should inherit unchanged fields
    });

    it('should throw error when cloning non-existent rule', async () => {
      await expect(
        rulesEngine.cloneRule('non-existent-id', {})
      ).rejects.toThrow('Rule with ID non-existent-id not found');
    });
  });
});
