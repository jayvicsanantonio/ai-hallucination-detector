import { NumericalAccuracyValidator } from '@/modules/domain/financial/NumericalAccuracyValidator';
import { ParsedContent } from '@/models/core/ParsedContent';
import {
  FinancialData,
  Calculation,
} from '@/modules/domain/financial/FinancialModule';

describe('NumericalAccuracyValidator', () => {
  let validator: NumericalAccuracyValidator;
  let mockContent: ParsedContent;

  beforeEach(() => {
    validator = new NumericalAccuracyValidator();

    mockContent = {
      id: 'test-content-1',
      originalContent: 'Financial calculations',
      extractedText:
        'Simple calculation: $100 + $50 = $150. Interest calculation: $1000 * 5% = $50.',
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
  });

  describe('validateNumericalAccuracy', () => {
    it('should validate financial data without issues', async () => {
      const financialData: FinancialData[] = [
        {
          id: 'amount-1',
          type: 'monetary_amount',
          value: '$1,500.00',
          location: { start: 0, end: 9 },
          numericValue: 1500,
        },
        {
          id: 'perc-1',
          type: 'percentage',
          value: '5.5%',
          location: { start: 20, end: 24 },
          numericValue: 5.5,
        },
      ];

      const issues = await validator.validateNumericalAccuracy(
        mockContent,
        financialData
      );

      expect(Array.isArray(issues)).toBe(true);
    });

    it('should detect negative monetary amounts', async () => {
      const financialData: FinancialData[] = [
        {
          id: 'amount-1',
          type: 'monetary_amount',
          value: '-$500.00',
          location: { start: 0, end: 8 },
          numericValue: -500,
        },
      ];

      const issues = await validator.validateNumericalAccuracy(
        mockContent,
        financialData
      );

      expect(issues.length).toBeGreaterThan(0);
      expect(
        issues.some((issue) =>
          issue.description.includes('Negative monetary amount')
        )
      ).toBe(true);
    });

    it('should detect excessive monetary amounts', async () => {
      const financialData: FinancialData[] = [
        {
          id: 'amount-1',
          type: 'monetary_amount',
          value: '$2,000,000,000,000.00',
          location: { start: 0, end: 20 },
          numericValue: 2000000000000,
        },
      ];

      const issues = await validator.validateNumericalAccuracy(
        mockContent,
        financialData
      );

      expect(issues.length).toBeGreaterThan(0);
      expect(
        issues.some((issue) =>
          issue.description.includes(
            'Extremely large monetary amount'
          )
        )
      ).toBe(true);
    });

    it('should detect precision issues in monetary amounts', async () => {
      const financialData: FinancialData[] = [
        {
          id: 'amount-1',
          type: 'monetary_amount',
          value: '$100.12345',
          location: { start: 0, end: 10 },
          numericValue: 100.12345,
        },
      ];

      const issues = await validator.validateNumericalAccuracy(
        mockContent,
        financialData
      );

      expect(issues.length).toBeGreaterThan(0);
      expect(
        issues.some((issue) =>
          issue.description.includes('more than 2 decimal places')
        )
      ).toBe(true);
    });

    it('should detect negative percentages', async () => {
      const financialData: FinancialData[] = [
        {
          id: 'perc-1',
          type: 'percentage',
          value: '-5.5%',
          location: { start: 0, end: 5 },
          numericValue: -5.5,
        },
      ];

      const issues = await validator.validateNumericalAccuracy(
        mockContent,
        financialData
      );

      expect(issues.length).toBeGreaterThan(0);
      expect(
        issues.some((issue) =>
          issue.description.includes('Negative percentage')
        )
      ).toBe(true);
    });

    it('should detect percentages over 100%', async () => {
      const financialData: FinancialData[] = [
        {
          id: 'perc-1',
          type: 'percentage',
          value: '150.5%',
          location: { start: 0, end: 6 },
          numericValue: 150.5,
        },
      ];

      const issues = await validator.validateNumericalAccuracy(
        mockContent,
        financialData
      );

      expect(issues.length).toBeGreaterThan(0);
      expect(
        issues.some((issue) =>
          issue.description.includes('Percentage over 100%')
        )
      ).toBe(true);
    });

    it('should detect negative financial ratios', async () => {
      const financialData: FinancialData[] = [
        {
          id: 'ratio-1',
          type: 'financial_ratio',
          value: '-2.5',
          location: { start: 0, end: 4 },
          numericValue: -2.5,
        },
      ];

      const issues = await validator.validateNumericalAccuracy(
        mockContent,
        financialData
      );

      expect(issues.length).toBeGreaterThan(0);
      expect(
        issues.some((issue) =>
          issue.description.includes('Negative financial ratio')
        )
      ).toBe(true);
    });
  });

  describe('validateCalculations', () => {
    it('should validate correct calculations', async () => {
      const calculations: Calculation[] = [
        {
          id: 'calc-1',
          expression: '100 + 50',
          result: 150,
          expectedResult: 150,
          location: { start: 0, end: 10 },
          isValid: true,
        },
      ];

      const result = await validator.validateCalculations(
        calculations
      );

      expect(result).toBeDefined();
      expect(result.moduleId).toBe('numerical-accuracy-validator');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.issues.length).toBe(0);
    });

    it('should detect incorrect calculations', async () => {
      const calculations: Calculation[] = [
        {
          id: 'calc-1',
          expression: '100 + 50',
          result: 200, // Wrong result
          expectedResult: 150,
          location: { start: 0, end: 10 },
          isValid: false,
        },
      ];

      const result = await validator.validateCalculations(
        calculations
      );

      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].type).toBe('factual_error');
      expect(result.issues[0].description).toContain('incorrect');
    });

    it('should detect precision issues', async () => {
      const calculations: Calculation[] = [
        {
          id: 'calc-1',
          expression: '100 / 3',
          result: 33.33,
          expectedResult: 33.333333,
          location: { start: 0, end: 10 },
          isValid: false,
        },
      ];

      const result = await validator.validateCalculations(
        calculations
      );

      expect(result.issues.length).toBeGreaterThan(0);
      // The calculation should be marked as incorrect due to the difference
      expect(
        result.issues.some((issue) =>
          issue.description.includes(
            'Mathematical calculation is incorrect'
          )
        )
      ).toBe(true);
    });
  });

  describe('updateRules', () => {
    it('should update validation rules', async () => {
      const newRules = [
        {
          id: 'test-rule',
          name: 'test-numerical-rule',
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

  describe('calculation detection in content', () => {
    it('should detect simple arithmetic in text', async () => {
      const contentWithCalculations = {
        ...mockContent,
        extractedText: 'The total is $100 + $50 = $150.',
      };

      const issues = await validator.validateNumericalAccuracy(
        contentWithCalculations,
        []
      );

      // Should not find issues with correct calculations
      expect(
        issues.filter((issue) => issue.type === 'factual_error')
          .length
      ).toBe(0);
    });

    it('should detect incorrect arithmetic in text', async () => {
      const contentWithErrors = {
        ...mockContent,
        extractedText: 'The total is $100 + $50 = $200.',
      };

      const issues = await validator.validateNumericalAccuracy(
        contentWithErrors,
        []
      );

      expect(issues.length).toBeGreaterThan(0);
      expect(
        issues.some((issue) =>
          issue.description.includes(
            'Mathematical calculation is incorrect'
          )
        )
      ).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty financial data', async () => {
      const issues = await validator.validateNumericalAccuracy(
        mockContent,
        []
      );

      expect(Array.isArray(issues)).toBe(true);
    });

    it('should handle content with no calculations', async () => {
      const contentWithoutCalcs = {
        ...mockContent,
        extractedText: 'This is just descriptive text about finance.',
      };

      const issues = await validator.validateNumericalAccuracy(
        contentWithoutCalcs,
        []
      );

      expect(Array.isArray(issues)).toBe(true);
    });

    it('should handle malformed financial data', async () => {
      const malformedData: FinancialData[] = [
        {
          id: 'bad-1',
          type: 'monetary_amount',
          value: 'invalid',
          location: { start: 0, end: 7 },
          numericValue: NaN,
        },
      ];

      const issues = await validator.validateNumericalAccuracy(
        mockContent,
        malformedData
      );

      expect(Array.isArray(issues)).toBe(true);
    });
  });
});
