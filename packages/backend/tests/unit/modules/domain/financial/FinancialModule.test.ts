import { FinancialModule } from '@/modules/domain/financial/FinancialModule';
import { ParsedContent } from '@/models/core/ParsedContent';
import { FeedbackData } from '@/models/audit/FeedbackData';
import { DomainRule } from '@/modules/interfaces/DomainModule';

describe('FinancialModule', () => {
  let financialModule: FinancialModule;
  let mockContent: ParsedContent;

  beforeEach(() => {
    financialModule = new FinancialModule();
    mockContent = {
      id: 'test-content-1',
      originalContent: 'Test financial content',
      extractedText:
        'The investment return is $10,000 with a 5% annual rate. Total calculation: $1000 + $500 = $1500.',
      contentType: 'text',
      structure: {
        sections: [],
        tables: [],
        figures: [],
        references: [],
      },
      entities: [],
      metadata: {
        wordCount: 20,
        characterCount: 100,
      },
      createdAt: new Date(),
    };
  });

  describe('validateContent', () => {
    it('should validate financial content and return results', async () => {
      const result = await financialModule.validateContent(
        mockContent
      );

      expect(result).toBeDefined();
      expect(result.moduleId).toBe('financial-module');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(0);
      expect(Array.isArray(result.issues)).toBe(true);
    });

    it('should detect financial data in content', async () => {
      const contentWithFinancialData = {
        ...mockContent,
        extractedText:
          'Investment of $50,000 at 7.5% interest rate with P/E ratio of 15:1.',
      };

      const result = await financialModule.validateContent(
        contentWithFinancialData
      );

      expect(result.metadata?.financialDataFound).toBeGreaterThan(0);
    });

    it('should identify calculation errors', async () => {
      const contentWithErrors = {
        ...mockContent,
        extractedText:
          'Simple calculation: $100 + $50 = $200. This is clearly wrong.',
      };

      const result = await financialModule.validateContent(
        contentWithErrors
      );

      expect(result.issues.length).toBeGreaterThan(0);
      expect(
        result.issues.some((issue) =>
          issue.description.includes('calculation')
        )
      ).toBe(true);
    });

    it('should handle validation errors gracefully', async () => {
      const invalidContent = {
        ...mockContent,
        extractedText: null as any,
      };

      const result = await financialModule.validateContent(
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
          name: 'test-financial-rule',
          description: 'Test rule for financial validation',
          severity: 'medium',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await expect(
        financialModule.updateRules(newRules)
      ).resolves.not.toThrow();
    });
  });

  describe('learnFromFeedback', () => {
    it('should process feedback for learning', async () => {
      const feedback: FeedbackData = {
        verificationId: 'test-verification-1',
        userFeedback: 'incorrect',
        corrections:
          'The calculation should include compound interest',
        userId: 'test-user',
        timestamp: new Date(),
      };

      await expect(
        financialModule.learnFromFeedback(feedback)
      ).resolves.not.toThrow();
    });
  });

  describe('getModuleInfo', () => {
    it('should return correct module information', () => {
      const info = financialModule.getModuleInfo();

      expect(info.name).toBe('Financial Domain Module');
      expect(info.domain).toBe('financial');
      expect(info.version).toBe('1.0.0');
      expect(info.capabilities).toContain(
        'Numerical accuracy validation'
      );
      expect(info.capabilities).toContain(
        'Financial regulation compliance checking'
      );
      expect(info.capabilities).toContain(
        'Calculation verification and audit trail'
      );
    });
  });

  describe('validateNumericalAccuracy', () => {
    it('should validate numerical calculations', async () => {
      const calculations = [
        {
          id: 'calc-1',
          expression: '100 + 50',
          result: 150,
          expectedResult: 150,
          location: { start: 0, end: 10 },
          isValid: true,
        },
        {
          id: 'calc-2',
          expression: '200 * 0.05',
          result: 10,
          expectedResult: 10,
          location: { start: 20, end: 30 },
          isValid: true,
        },
      ];

      const result = await financialModule.validateNumericalAccuracy(
        calculations
      );

      expect(result).toBeDefined();
      expect(result.moduleId).toBe('numerical-accuracy-validator');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect calculation errors', async () => {
      const calculations = [
        {
          id: 'calc-1',
          expression: '100 + 50',
          result: 200, // Wrong result
          expectedResult: 150,
          location: { start: 0, end: 10 },
          isValid: false,
        },
      ];

      const result = await financialModule.validateNumericalAccuracy(
        calculations
      );

      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].type).toBe('factual_error');
    });
  });

  describe('checkRegulatoryCompliance', () => {
    it('should check regulatory compliance', async () => {
      const content =
        'This financial statement complies with GAAP standards and includes required SEC disclosures.';
      const regulations = ['GAAP', 'SEC'];

      const result = await financialModule.checkRegulatoryCompliance(
        content,
        regulations
      );

      expect(result).toBeDefined();
      expect(result.checkedRules).toBeDefined();
      expect(typeof result.isCompliant).toBe('boolean');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect compliance violations', async () => {
      const content =
        'This investment guarantees 20% returns with no risk whatsoever.';
      const regulations = ['SEC'];

      const result = await financialModule.checkRegulatoryCompliance(
        content,
        regulations
      );

      expect(result.isCompliant).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });

  describe('domain property', () => {
    it('should have correct domain', () => {
      expect(financialModule.domain).toBe('financial');
    });
  });

  describe('version property', () => {
    it('should have version defined', () => {
      expect(financialModule.version).toBeDefined();
      expect(typeof financialModule.version).toBe('string');
    });
  });

  describe('financial data extraction', () => {
    it('should extract monetary amounts', async () => {
      const contentWithAmounts = {
        ...mockContent,
        extractedText:
          'The total cost is $1,500.00 and the profit margin is $250.50.',
      };

      const result = await financialModule.validateContent(
        contentWithAmounts
      );

      expect(result.metadata?.financialDataFound).toBeGreaterThan(0);
    });

    it('should extract percentages', async () => {
      const contentWithPercentages = {
        ...mockContent,
        extractedText:
          'The interest rate is 5.25% and the growth rate is 12.5%.',
      };

      const result = await financialModule.validateContent(
        contentWithPercentages
      );

      expect(result.metadata?.financialDataFound).toBeGreaterThan(0);
    });

    it('should extract financial ratios', async () => {
      const contentWithRatios = {
        ...mockContent,
        extractedText:
          'The P/E ratio is 15.5 and the debt-to-equity ratio: 2.3.',
      };

      const result = await financialModule.validateContent(
        contentWithRatios
      );

      expect(result.metadata?.financialDataFound).toBeGreaterThan(0);
    });
  });
});
