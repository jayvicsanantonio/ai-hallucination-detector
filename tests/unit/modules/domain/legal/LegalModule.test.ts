import { LegalModule } from '@/modules/domain/legal/LegalModule';
import { ParsedContent } from '@/models/core/ParsedContent';
import { FeedbackData } from '@/models/audit/FeedbackData';
import { DomainRule } from '@/modules/interfaces/DomainModule';

describe('LegalModule', () => {
  let legalModule: LegalModule;
  let mockContent: ParsedContent;

  beforeEach(() => {
    legalModule = new LegalModule();
    mockContent = {
      id: 'test-content-1',
      originalContent: 'Test contract content',
      extractedText:
        'This is a contract between ABC Corp. and John Doe for the sum of $10,000.',
      contentType: 'text',
      structure: {
        sections: [],
        tables: [],
        figures: [],
        references: [],
      },
      entities: [],
      metadata: {
        wordCount: 15,
        characterCount: 75,
      },
      createdAt: new Date(),
    };
  });

  describe('validateContent', () => {
    it('should validate legal content and return results', async () => {
      const result = await legalModule.validateContent(mockContent);

      expect(result).toBeDefined();
      expect(result.moduleId).toBe('legal-module');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(0);
      expect(Array.isArray(result.issues)).toBe(true);
    });

    it('should detect missing essential contract elements', async () => {
      const incompleteContent = {
        ...mockContent,
        extractedText:
          'This is just some text without contract elements.',
      };

      const result = await legalModule.validateContent(
        incompleteContent
      );

      expect(result.issues.length).toBeGreaterThan(0);
      expect(
        result.issues.some((issue) =>
          issue.description.includes('missing essential element')
        )
      ).toBe(true);
    });

    it('should identify legal entities in content', async () => {
      const contentWithEntities = {
        ...mockContent,
        extractedText:
          'Agreement between Microsoft Corporation and Apple Inc. for software licensing.',
      };

      const result = await legalModule.validateContent(
        contentWithEntities
      );

      expect(result.metadata?.entitiesFound).toBeGreaterThan(0);
    });

    it('should handle validation errors gracefully', async () => {
      const invalidContent = {
        ...mockContent,
        extractedText: null as any,
      };

      const result = await legalModule.validateContent(
        invalidContent
      );

      expect(result.confidence).toBe(0);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].type).toBe('compliance_violation');
    });
  });

  describe('updateRules', () => {
    it('should update domain rules successfully', async () => {
      const newRules: DomainRule[] = [
        {
          id: 'test-rule-1',
          name: 'test-contract-rule',
          description: 'Test rule for contracts',
          severity: 'medium',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await expect(
        legalModule.updateRules(newRules)
      ).resolves.not.toThrow();
    });
  });

  describe('learnFromFeedback', () => {
    it('should process feedback for learning', async () => {
      const feedback: FeedbackData = {
        verificationId: 'test-verification-1',
        userFeedback: 'incorrect',
        corrections:
          'The contract should include termination clauses',
        userId: 'test-user',
        timestamp: new Date(),
      };

      await expect(
        legalModule.learnFromFeedback(feedback)
      ).resolves.not.toThrow();
    });
  });

  describe('getModuleInfo', () => {
    it('should return correct module information', () => {
      const info = legalModule.getModuleInfo();

      expect(info.name).toBe('Legal Domain Module');
      expect(info.domain).toBe('legal');
      expect(info.version).toBe('1.0.0');
      expect(info.capabilities).toContain('Contract term validation');
      expect(info.capabilities).toContain(
        'Legal compliance checking'
      );
      expect(info.capabilities).toContain('Legal entity recognition');
    });
  });

  describe('validateContractTerms', () => {
    it('should validate contract terms', async () => {
      const contractTerms = [
        {
          id: 'term-1',
          type: 'party' as const,
          content: 'ABC Corporation',
          location: { start: 0, end: 14 },
          isRequired: true,
        },
        {
          id: 'term-2',
          type: 'consideration' as const,
          content: '$10,000',
          location: { start: 50, end: 57 },
          isRequired: true,
        },
      ];

      const result = await legalModule.validateContractTerms(
        contractTerms
      );

      expect(result).toBeDefined();
      expect(result.moduleId).toBe('contract-term-validator');
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('checkLegalCompliance', () => {
    it('should check legal compliance for jurisdiction', async () => {
      const content =
        'This contract is governed by California law and includes consumer protection clauses.';
      const jurisdiction = 'california';

      const result = await legalModule.checkLegalCompliance(
        content,
        jurisdiction
      );

      expect(result).toBeDefined();
      expect(result.checkedRules).toBeDefined();
      expect(typeof result.isCompliant).toBe('boolean');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect compliance violations', async () => {
      const content =
        'This contract excludes people based on race and religion.';
      const jurisdiction = 'us';

      const result = await legalModule.checkLegalCompliance(
        content,
        jurisdiction
      );

      expect(result.isCompliant).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });

  describe('domain property', () => {
    it('should have correct domain', () => {
      expect(legalModule.domain).toBe('legal');
    });
  });

  describe('version property', () => {
    it('should have version defined', () => {
      expect(legalModule.version).toBeDefined();
      expect(typeof legalModule.version).toBe('string');
    });
  });
});
