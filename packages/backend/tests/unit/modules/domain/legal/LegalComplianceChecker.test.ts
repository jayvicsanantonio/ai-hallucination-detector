import { LegalComplianceChecker } from '@/modules/domain/legal/LegalComplianceChecker';
import { ParsedContent } from '@/models/core/ParsedContent';
import { LegalEntity } from '@/modules/domain/legal/LegalModule';

describe('LegalComplianceChecker', () => {
  let checker: LegalComplianceChecker;
  let mockContent: ParsedContent;
  let mockEntities: LegalEntity[];

  beforeEach(() => {
    checker = new LegalComplianceChecker();

    mockContent = {
      id: 'test-content-1',
      originalContent: 'Legal document content',
      extractedText:
        'This contract complies with all applicable laws and regulations. Both parties have legal capacity to enter into this agreement.',
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

    mockEntities = [
      {
        name: 'ABC Corporation',
        type: 'corporation',
        jurisdiction: 'california',
        location: { start: 0, end: 14 },
      },
    ];
  });

  describe('checkCompliance', () => {
    it('should check general compliance and return issues', async () => {
      const issues = await checker.checkCompliance(
        mockContent,
        mockEntities
      );

      expect(Array.isArray(issues)).toBe(true);
    });

    it('should detect discriminatory language', async () => {
      const discriminatoryContent = {
        ...mockContent,
        extractedText:
          'This contract excludes people based on race and religion from participation.',
      };

      const issues = await checker.checkCompliance(
        discriminatoryContent,
        []
      );

      expect(issues.length).toBeGreaterThan(0);
      expect(
        issues.some((issue) =>
          issue.description.includes('discriminatory language')
        )
      ).toBe(true);
    });

    it('should detect unconscionable terms', async () => {
      const unconscionableContent = {
        ...mockContent,
        extractedText:
          'Party agrees to waive all rights and accept unlimited liability with no recourse.',
      };

      const issues = await checker.checkCompliance(
        unconscionableContent,
        []
      );

      expect(issues.length).toBeGreaterThan(0);
      expect(
        issues.some((issue) =>
          issue.description.includes('unconscionable')
        )
      ).toBe(true);
    });

    it('should check jurisdiction-specific compliance', async () => {
      const californiaEntity: LegalEntity = {
        name: 'California Corp',
        type: 'corporation',
        jurisdiction: 'california',
        location: { start: 0, end: 14 },
      };

      const issues = await checker.checkCompliance(mockContent, [
        californiaEntity,
      ]);

      expect(Array.isArray(issues)).toBe(true);
    });
  });

  describe('checkJurisdictionCompliance', () => {
    it('should check compliance for specific jurisdiction', async () => {
      const content =
        'This contract includes consumer protection clauses and right to cancel within 3 days.';

      const result = await checker.checkJurisdictionCompliance(
        content,
        'california'
      );

      expect(result).toBeDefined();
      expect(typeof result.isCompliant).toBe('boolean');
      expect(Array.isArray(result.violations)).toBe(true);
      expect(Array.isArray(result.checkedRules)).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect missing required clauses for California', async () => {
      const content =
        'This is a simple contract without consumer protection clauses.';

      const result = await checker.checkJurisdictionCompliance(
        content,
        'california'
      );

      expect(result.isCompliant).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(
        result.violations.some((v) =>
          v.description.includes('California consumer protection')
        )
      ).toBe(true);
    });

    it('should check New York jurisdiction requirements', async () => {
      const content = 'This contract is governed by New York law.';

      const result = await checker.checkJurisdictionCompliance(
        content,
        'new york'
      );

      expect(result).toBeDefined();
      expect(result.checkedRules.length).toBeGreaterThan(0);
    });

    it('should check EU GDPR compliance', async () => {
      const content =
        'This contract processes personal data without data protection clauses.';

      const result = await checker.checkJurisdictionCompliance(
        content,
        'eu'
      );

      expect(result.isCompliant).toBe(false);
      expect(
        result.violations.some((v) => v.description.includes('GDPR'))
      ).toBe(true);
    });

    it('should handle unknown jurisdictions gracefully', async () => {
      const content = 'This is a contract.';

      const result = await checker.checkJurisdictionCompliance(
        content,
        'unknown-jurisdiction'
      );

      expect(result).toBeDefined();
      expect(result.isCompliant).toBe(true);
      expect(result.violations.length).toBe(0);
    });
  });

  describe('updateRules', () => {
    it('should update compliance rules', async () => {
      const newRules = [
        {
          id: 'test-rule',
          name: 'test-compliance-rule',
          description: 'Test compliance rule',
          severity: 'high' as const,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await expect(
        checker.updateRules(newRules)
      ).resolves.not.toThrow();
    });
  });

  describe('contract law compliance', () => {
    it('should check statute of frauds compliance', async () => {
      const highValueContent = {
        ...mockContent,
        extractedText:
          'This oral agreement is for $1000 without any written documentation.',
      };

      const issues = await checker.checkCompliance(
        highValueContent,
        []
      );

      expect(
        issues.some((issue) =>
          issue.description.includes('Statute of Frauds')
        )
      ).toBe(true);
    });

    it('should check capacity acknowledgment', async () => {
      const noCapacityContent = {
        ...mockContent,
        extractedText:
          'This contract is between two parties for services.',
      };

      const issues = await checker.checkCompliance(
        noCapacityContent,
        []
      );

      expect(
        issues.some((issue) =>
          issue.description.includes('legal capacity')
        )
      ).toBe(true);
    });
  });

  describe('disclosure requirements', () => {
    it('should check for required disclosures', async () => {
      const noDisclosureContent = {
        ...mockContent,
        extractedText:
          'Simple contract between parties for services.',
      };

      const issues = await checker.checkCompliance(
        noDisclosureContent,
        []
      );

      expect(
        issues.some((issue) =>
          issue.description.includes('disclosure')
        )
      ).toBe(true);
    });

    it('should validate presence of dispute resolution', async () => {
      const withDisputeResolution = {
        ...mockContent,
        extractedText:
          'This contract includes dispute resolution through arbitration and right to cancel.',
      };

      const issues = await checker.checkCompliance(
        withDisputeResolution,
        []
      );

      // Should have fewer disclosure-related issues
      const disclosureIssues = issues.filter((issue) =>
        issue.description.includes('disclosure')
      );
      expect(disclosureIssues.length).toBeLessThan(3);
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', async () => {
      const emptyContent = {
        ...mockContent,
        extractedText: '',
      };

      const issues = await checker.checkCompliance(emptyContent, []);

      expect(Array.isArray(issues)).toBe(true);
    });

    it('should handle content with multiple jurisdictions', async () => {
      const multiJurisdictionEntities: LegalEntity[] = [
        {
          name: 'California Corp',
          type: 'corporation',
          jurisdiction: 'california',
          location: { start: 0, end: 14 },
        },
        {
          name: 'New York LLC',
          type: 'llc',
          jurisdiction: 'new york',
          location: { start: 20, end: 32 },
        },
      ];

      const issues = await checker.checkCompliance(
        mockContent,
        multiJurisdictionEntities
      );

      expect(Array.isArray(issues)).toBe(true);
    });
  });
});
