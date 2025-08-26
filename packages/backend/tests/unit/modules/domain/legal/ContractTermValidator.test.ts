import { ContractTermValidator } from '@/modules/domain/legal/ContractTermValidator';
import { ParsedContent } from '@/models/core/ParsedContent';
import {
  LegalEntity,
  ContractTerm,
} from '@/modules/domain/legal/LegalModule';

describe('ContractTermValidator', () => {
  let validator: ContractTermValidator;
  let mockContent: ParsedContent;
  let mockEntities: LegalEntity[];

  beforeEach(() => {
    validator = new ContractTermValidator();

    mockContent = {
      id: 'test-content-1',
      originalContent: 'Contract between parties',
      extractedText:
        'This agreement is between ABC Corporation and John Doe. The consideration is $10,000 for services rendered. Both parties agree to the terms and conditions.',
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
        jurisdiction: 'delaware',
        location: { start: 25, end: 39 },
      },
      {
        name: 'John Doe',
        type: 'individual',
        jurisdiction: 'unknown',
        location: { start: 44, end: 52 },
      },
    ];
  });

  describe('validateContractTerms', () => {
    it('should validate contract terms and return issues', async () => {
      const issues = await validator.validateContractTerms(
        mockContent,
        mockEntities
      );

      expect(Array.isArray(issues)).toBe(true);
    });

    it('should detect missing essential elements', async () => {
      const incompleteContent = {
        ...mockContent,
        extractedText:
          'This is just some text without proper contract elements.',
      };

      const issues = await validator.validateContractTerms(
        incompleteContent,
        []
      );

      expect(issues.length).toBeGreaterThan(0);
      expect(
        issues.some((issue) =>
          issue.description.includes('missing essential element')
        )
      ).toBe(true);
    });

    it('should validate parties correctly', async () => {
      const singlePartyContent = {
        ...mockContent,
        extractedText:
          'This agreement involves only ABC Corporation.',
      };

      const issues = await validator.validateContractTerms(
        singlePartyContent,
        mockEntities.slice(0, 1)
      );

      expect(
        issues.some((issue) =>
          issue.description.includes('at least two parties')
        )
      ).toBe(true);
    });

    it('should validate consideration clauses', async () => {
      const noConsiderationContent = {
        ...mockContent,
        extractedText:
          'This agreement is between ABC Corporation and John Doe. They agree to work together.',
      };

      const issues = await validator.validateContractTerms(
        noConsiderationContent,
        mockEntities
      );

      expect(
        issues.some((issue) =>
          issue.description.includes('consideration')
        )
      ).toBe(true);
    });

    it('should detect vague party identification', async () => {
      const vaguePartyContent = {
        ...mockContent,
        extractedText:
          'This agreement is between Party A and Party B for $1000.',
      };

      const issues = await validator.validateContractTerms(
        vaguePartyContent,
        []
      );

      expect(
        issues.some((issue) => issue.description.includes('vague'))
      ).toBe(true);
    });
  });

  describe('validateTerms', () => {
    it('should validate individual contract terms', async () => {
      const terms: ContractTerm[] = [
        {
          id: 'term-1',
          type: 'party',
          content: 'ABC Corporation',
          location: { start: 0, end: 14 },
          isRequired: true,
        },
        {
          id: 'term-2',
          type: 'consideration',
          content: '$10,000',
          location: { start: 50, end: 57 },
          isRequired: true,
        },
      ];

      const result = await validator.validateTerms(terms);

      expect(result).toBeDefined();
      expect(result.moduleId).toBe('contract-term-validator');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should detect missing required terms', async () => {
      const terms: ContractTerm[] = [
        {
          id: 'term-1',
          type: 'party',
          content: '',
          location: { start: 0, end: 0 },
          isRequired: true,
        },
      ];

      const result = await validator.validateTerms(terms);

      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].description).toContain(
        'missing or incomplete'
      );
    });

    it('should validate party identification requirements', async () => {
      const terms: ContractTerm[] = [
        {
          id: 'term-1',
          type: 'party',
          content: 'A',
          location: { start: 0, end: 1 },
          isRequired: true,
        },
      ];

      const result = await validator.validateTerms(terms);

      expect(
        result.issues.some((issue) =>
          issue.description.includes(
            'does not meet standard requirements'
          )
        )
      ).toBe(true);
    });

    it('should validate consideration requirements', async () => {
      const terms: ContractTerm[] = [
        {
          id: 'term-1',
          type: 'consideration',
          content: 'something',
          location: { start: 0, end: 9 },
          isRequired: true,
        },
      ];

      const result = await validator.validateTerms(terms);

      expect(
        result.issues.some((issue) =>
          issue.description.includes('invalid or insufficient')
        )
      ).toBe(true);
    });
  });

  describe('updateRules', () => {
    it('should update validation rules', async () => {
      const newRules = [
        {
          id: 'test-rule',
          name: 'test-contract-rule',
          description: 'Test rule',
          severity: 'medium' as const,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await expect(
        validator.updateRules(newRules)
      ).resolves.not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty content gracefully', async () => {
      const emptyContent = {
        ...mockContent,
        extractedText: '',
      };

      const issues = await validator.validateContractTerms(
        emptyContent,
        []
      );

      expect(Array.isArray(issues)).toBe(true);
    });

    it('should handle content with special characters', async () => {
      const specialContent = {
        ...mockContent,
        extractedText:
          'Contract between ABC Corp. & XYZ Ltd. for €10,000 consideration.',
      };

      const issues = await validator.validateContractTerms(
        specialContent,
        mockEntities
      );

      expect(Array.isArray(issues)).toBe(true);
    });

    it('should detect termination clause requirements', async () => {
      const noTerminationContent = {
        ...mockContent,
        extractedText:
          'Agreement between ABC Corp and John Doe for $10,000 services.',
      };

      const issues = await validator.validateContractTerms(
        noTerminationContent,
        mockEntities
      );

      expect(
        issues.some((issue) =>
          issue.description.includes('termination')
        )
      ).toBe(true);
    });
  });
});
