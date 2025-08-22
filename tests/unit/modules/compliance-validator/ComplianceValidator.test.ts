import { ComplianceValidator } from '../../../../src/modules/compliance-validator/ComplianceValidator';
import { RulesEngine } from '../../../../src/modules/compliance-validator/RulesEngine';
import { ParsedContent } from '../../../../src/models/core/ParsedContent';

describe('ComplianceValidator', () => {
  let validator: ComplianceValidator;
  let rulesEngine: RulesEngine;

  beforeEach(() => {
    rulesEngine = new RulesEngine();
    validator = new ComplianceValidator(rulesEngine);
  });

  describe('validateCompliance', () => {
    it('should detect HIPAA violations in healthcare content', async () => {
      const content: ParsedContent = {
        id: 'test-1',
        originalContent:
          'Patient John Doe has diabetes. SSN: 123-45-6789',
        extractedText:
          'Patient John Doe has diabetes. SSN: 123-45-6789',
        contentType: 'text',
        structure: {
          sections: [],
          tables: [],
          figures: [],
          references: [],
        },
        entities: [],
        metadata: {
          author: 'Dr. Smith',
          customFields: { title: 'Medical Record' },
        },
        createdAt: new Date(),
      };

      const result = await validator.validateCompliance(
        content,
        'healthcare',
        'US'
      );

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.overallRisk).toBe('critical');
      expect(result.complianceScore).toBeLessThan(80);

      const ssnViolation = result.violations.find(
        (v) => v.location.text === '123-45-6789'
      );
      expect(ssnViolation).toBeDefined();
      expect(ssnViolation?.severity).toBe('critical');
    });

    it('should detect SOX violations in financial content', async () => {
      const content: ParsedContent = {
        id: 'test-2',
        originalContent:
          'Revenue increased by 500% with no material weaknesses identified.',
        extractedText:
          'Revenue increased by 500% with no material weaknesses identified.',
        contentType: 'text',
        structure: {
          sections: [],
          tables: [],
          figures: [],
          references: [],
        },
        entities: [],
        metadata: {
          author: 'CFO',
          customFields: { title: 'Financial Report' },
        },
        createdAt: new Date(),
      };

      const result = await validator.validateCompliance(
        content,
        'financial',
        'US'
      );

      expect(result.violations.length).toBeGreaterThan(0);
      expect(['high', 'critical']).toContain(result.overallRisk);

      const revenueViolation = result.violations.find((v) =>
        v.location.text.includes('Revenue increased by 500%')
      );
      expect(revenueViolation).toBeDefined();
      expect(revenueViolation?.severity).toBe('high');
    });

    it('should detect GDPR violations in legal content', async () => {
      const content: ParsedContent = {
        id: 'test-3',
        originalContent:
          'We collect email addresses without consent and share personal data with third parties automatically.',
        extractedText:
          'We collect email addresses without consent and share personal data with third parties automatically.',
        contentType: 'text',
        structure: {
          sections: [],
          tables: [],
          figures: [],
          references: [],
        },
        entities: [],
        metadata: {
          author: 'Legal Team',
          customFields: { title: 'Privacy Policy' },
        },
        createdAt: new Date(),
      };

      const result = await validator.validateCompliance(
        content,
        'legal',
        'EU'
      );

      expect(result.violations.length).toBeGreaterThan(0);
      expect(['high', 'critical']).toContain(result.overallRisk);

      const consentViolation = result.violations.find((v) =>
        v.description.includes('without consent')
      );
      expect(consentViolation).toBeDefined();
    });

    it('should return low risk for compliant content', async () => {
      const content: ParsedContent = {
        id: 'test-4',
        originalContent:
          'This document contains general business information with no sensitive data.',
        extractedText:
          'This document contains general business information with no sensitive data.',
        contentType: 'text',
        structure: {
          sections: [],
          tables: [],
          figures: [],
          references: [],
        },
        entities: [],
        metadata: {
          author: 'Manager',
          customFields: { title: 'Business Report' },
        },
        createdAt: new Date(),
      };

      const result = await validator.validateCompliance(
        content,
        'legal',
        'US'
      );

      expect(result.violations.length).toBe(0);
      expect(result.overallRisk).toBe('low');
      expect(result.complianceScore).toBe(100);
    });

    it('should calculate compliance score correctly', async () => {
      const content: ParsedContent = {
        id: 'test-5',
        originalContent:
          'Patient information with diagnosis details.',
        extractedText: 'Patient information with diagnosis details.',
        contentType: 'text',
        structure: {
          sections: [],
          tables: [],
          figures: [],
          references: [],
        },
        entities: [],
        metadata: {
          author: 'Doctor',
          customFields: { title: 'Medical Note' },
        },
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

    it('should handle empty content gracefully', async () => {
      const content: ParsedContent = {
        id: 'test-6',
        originalContent: '',
        extractedText: '',
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

      expect(result.violations.length).toBe(0);
      expect(result.overallRisk).toBe('low');
      expect(result.complianceScore).toBe(100);
    });

    it('should include applicable rules in result', async () => {
      const content: ParsedContent = {
        id: 'test-7',
        originalContent: 'Test content',
        extractedText: 'Test content',
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

      expect(result.applicableRules).toBeDefined();
      expect(Array.isArray(result.applicableRules)).toBe(true);
      expect(result.checkedRules).toBeGreaterThan(0);
    });
  });
});
