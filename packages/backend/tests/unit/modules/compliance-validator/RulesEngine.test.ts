import { RulesEngine } from '../../../../src/modules/compliance-validator/RulesEngine';
import { ComplianceRule } from '../../../../src/models/knowledge/ComplianceRule';

describe('RulesEngine', () => {
  let rulesEngine: RulesEngine;

  beforeEach(() => {
    rulesEngine = new RulesEngine();
  });

  describe('getApplicableRules', () => {
    it('should return healthcare rules for healthcare domain', async () => {
      const rules = await rulesEngine.getApplicableRules(
        'healthcare',
        'US'
      );

      expect(rules.length).toBeGreaterThan(0);
      expect(
        rules.every((rule) => rule.domain === 'healthcare')
      ).toBe(true);
      expect(
        rules.every(
          (rule) =>
            rule.jurisdiction === 'US' ||
            rule.jurisdiction === 'GLOBAL'
        )
      ).toBe(true);
    });

    it('should return financial rules for financial domain', async () => {
      const rules = await rulesEngine.getApplicableRules(
        'financial',
        'US'
      );

      expect(rules.length).toBeGreaterThan(0);
      expect(rules.every((rule) => rule.domain === 'financial')).toBe(
        true
      );
    });

    it('should return legal rules for legal domain', async () => {
      const rules = await rulesEngine.getApplicableRules(
        'legal',
        'EU'
      );

      expect(rules.length).toBeGreaterThan(0);
      expect(rules.every((rule) => rule.domain === 'legal')).toBe(
        true
      );
    });

    it('should return insurance rules for insurance domain', async () => {
      const rules = await rulesEngine.getApplicableRules(
        'insurance',
        'US'
      );

      expect(rules.length).toBeGreaterThan(0);
      expect(rules.every((rule) => rule.domain === 'insurance')).toBe(
        true
      );
    });

    it('should filter by jurisdiction', async () => {
      const usRules = await rulesEngine.getApplicableRules(
        'healthcare',
        'US'
      );
      const euRules = await rulesEngine.getApplicableRules(
        'healthcare',
        'EU'
      );

      expect(
        usRules.every(
          (rule) =>
            rule.jurisdiction === 'US' ||
            rule.jurisdiction === 'GLOBAL'
        )
      ).toBe(true);
      expect(
        euRules.every(
          (rule) =>
            rule.jurisdiction === 'EU' ||
            rule.jurisdiction === 'GLOBAL'
        )
      ).toBe(true);
    });

    it('should only return active rules', async () => {
      const rules = await rulesEngine.getApplicableRules(
        'healthcare',
        'US'
      );

      expect(rules.every((rule) => rule.isActive)).toBe(true);
    });
  });

  describe('addRule', () => {
    it('should add a new rule successfully', async () => {
      const newRule: ComplianceRule = {
        id: 'test-rule-1',
        ruleText: 'Test rule for unit testing',
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

      await rulesEngine.addRule(newRule);

      const rules = await rulesEngine.getApplicableRules(
        'healthcare',
        'US'
      );
      const addedRule = rules.find(
        (rule) => rule.id === 'test-rule-1'
      );

      expect(addedRule).toBeDefined();
      expect(addedRule?.ruleText).toBe('Test rule for unit testing');
    });
  });

  describe('updateRule', () => {
    it('should update an existing rule', async () => {
      const rules = await rulesEngine.getApplicableRules(
        'healthcare',
        'US'
      );
      const existingRule = rules[0];

      await rulesEngine.updateRule(existingRule.id, {
        ruleText: 'Updated rule text',
        severity: 'critical',
      });

      const updatedRule = await rulesEngine.getRuleById(
        existingRule.id
      );

      expect(updatedRule?.ruleText).toBe('Updated rule text');
      expect(updatedRule?.severity).toBe('critical');
    });
  });

  describe('deactivateRule', () => {
    it('should deactivate a rule', async () => {
      const rules = await rulesEngine.getApplicableRules(
        'healthcare',
        'US'
      );
      const ruleToDeactivate = rules[0];

      await rulesEngine.deactivateRule(ruleToDeactivate.id);

      const updatedRule = await rulesEngine.getRuleById(
        ruleToDeactivate.id
      );
      expect(updatedRule?.isActive).toBe(false);

      const activeRules = await rulesEngine.getApplicableRules(
        'healthcare',
        'US'
      );
      const deactivatedRule = activeRules.find(
        (rule) => rule.id === ruleToDeactivate.id
      );
      expect(deactivatedRule).toBeUndefined();
    });
  });

  describe('getRuleById', () => {
    it('should return rule by ID', async () => {
      const rules = await rulesEngine.getApplicableRules(
        'healthcare',
        'US'
      );
      const existingRule = rules[0];

      const foundRule = await rulesEngine.getRuleById(
        existingRule.id
      );

      expect(foundRule).toBeDefined();
      expect(foundRule?.id).toBe(existingRule.id);
    });

    it('should return null for non-existent rule', async () => {
      const foundRule = await rulesEngine.getRuleById(
        'non-existent-id'
      );

      expect(foundRule).toBeNull();
    });
  });

  describe('getAllRules', () => {
    it('should return all rules across domains', async () => {
      const allRules = await rulesEngine.getAllRules();

      expect(allRules.length).toBeGreaterThan(0);

      const domains = new Set(allRules.map((rule) => rule.domain));
      expect(domains.size).toBeGreaterThan(1); // Should have multiple domains
    });
  });

  describe('default rules initialization', () => {
    it('should have HIPAA rules for healthcare', async () => {
      const rules = await rulesEngine.getApplicableRules(
        'healthcare',
        'US'
      );
      const hipaaRule = rules.find(
        (rule) => rule.regulation === 'HIPAA'
      );

      expect(hipaaRule).toBeDefined();
      expect(hipaaRule?.keywords).toContain('ssn');
    });

    it('should have SOX rules for financial', async () => {
      const rules = await rulesEngine.getApplicableRules(
        'financial',
        'US'
      );
      const soxRule = rules.find((rule) => rule.regulation === 'SOX');

      expect(soxRule).toBeDefined();
      expect(soxRule?.keywords).toContain('material weakness');
    });

    it('should have GDPR rules for legal', async () => {
      const rules = await rulesEngine.getApplicableRules(
        'legal',
        'EU'
      );
      const gdprRule = rules.find(
        (rule) => rule.regulation === 'GDPR'
      );

      expect(gdprRule).toBeDefined();
      expect(gdprRule?.keywords).toContain('personal data');
    });
  });
});
