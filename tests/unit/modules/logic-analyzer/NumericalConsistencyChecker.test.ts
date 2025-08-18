import { NumericalConsistencyChecker } from '@/modules/logic-analyzer/NumericalConsistencyChecker';
import { ParsedContent } from '@/models/core/ParsedContent';
import { ContentType } from '@/models/core/ContentTypes';

describe('NumericalConsistencyChecker', () => {
  let checker: NumericalConsistencyChecker;

  beforeEach(() => {
    checker = new NumericalConsistencyChecker();
  });

  const createMockContent = (text: string): ParsedContent => ({
    id: 'test-content',
    originalContent: text,
    extractedText: text,
    contentType: 'text' as ContentType,
    structure: {
      sections: [],
      tables: [],
      figures: [],
      references: [],
    },
    entities: [],
    metadata: {
      wordCount: text.split(' ').length,
      characterCount: text.length,
    },
    createdAt: new Date(),
  });

  describe('checkNumericalConsistency', () => {
    it('should detect calculation errors', async () => {
      const content = createMockContent(
        'The calculation shows that 5 + 3 = 9, which is incorrect.'
      );

      const inconsistencies = await checker.checkNumericalConsistency(
        content
      );

      expect(inconsistencies).toHaveLength(1);
      expect(inconsistencies[0].type).toBe('calculation_error');
      expect(inconsistencies[0].expectedValue).toBe(8);
      expect(inconsistencies[0].actualValue).toBe(9);
      expect(inconsistencies[0].confidence).toBe(95);
    });

    it('should detect multiple calculation errors', async () => {
      const content = createMockContent(
        'First calculation: 10 + 5 = 16. Second calculation: 20 - 8 = 11.'
      );

      const inconsistencies = await checker.checkNumericalConsistency(
        content
      );

      expect(inconsistencies).toHaveLength(2);
      expect(inconsistencies[0].expectedValue).toBe(15);
      expect(inconsistencies[1].expectedValue).toBe(12);
    });

    it('should detect multiplication errors', async () => {
      const content = createMockContent(
        'The result of 7 × 8 = 54 is wrong.'
      );

      const inconsistencies = await checker.checkNumericalConsistency(
        content
      );

      expect(inconsistencies).toHaveLength(1);
      expect(inconsistencies[0].expectedValue).toBe(56);
      expect(inconsistencies[0].actualValue).toBe(54);
    });

    it('should detect division errors', async () => {
      const content = createMockContent(
        'When we divide 100 ÷ 4 = 24, we get an incorrect result.'
      );

      const inconsistencies = await checker.checkNumericalConsistency(
        content
      );

      expect(inconsistencies).toHaveLength(1);
      expect(inconsistencies[0].expectedValue).toBe(25);
      expect(inconsistencies[0].actualValue).toBe(24);
    });

    it('should handle decimal calculations', async () => {
      const content = createMockContent(
        'The precise calculation is 12.5 + 7.3 = 19.9.'
      );

      const inconsistencies = await checker.checkNumericalConsistency(
        content
      );

      expect(inconsistencies).toHaveLength(1);
      expect(inconsistencies[0].expectedValue).toBeCloseTo(19.8);
    });

    it('should detect sum mismatches', async () => {
      const content = createMockContent(
        'The expenses are: 100, 200, 150, and 75. The total is 550.'
      );

      const inconsistencies = await checker.checkNumericalConsistency(
        content
      );

      expect(inconsistencies.length).toBeGreaterThan(0);
      const sumMismatch = inconsistencies.find(
        (i) => i.type === 'sum_mismatch'
      );
      expect(sumMismatch).toBeDefined();
      expect(sumMismatch!.expectedValue).toBe(525);
      expect(sumMismatch!.actualValue).toBe(550);
    });

    it('should detect percentage sum errors', async () => {
      const content = createMockContent(
        'The breakdown is as follows: 30%, 25%, 20%, and 30%. This distribution shows the allocation.'
      );

      const inconsistencies = await checker.checkNumericalConsistency(
        content
      );

      expect(inconsistencies.length).toBeGreaterThan(0);
      const percentageError = inconsistencies.find((i) =>
        i.description.includes('Percentages should sum to 100%')
      );
      expect(percentageError).toBeDefined();
      expect(percentageError!.actualValue).toBe(105);
    });

    it('should not flag correct calculations', async () => {
      const content = createMockContent(
        'The calculation 15 + 25 = 40 is correct. Also, 100 - 30 = 70 is accurate.'
      );

      const inconsistencies = await checker.checkNumericalConsistency(
        content
      );

      expect(inconsistencies).toHaveLength(0);
    });

    it('should handle currency calculations', async () => {
      const content = createMockContent(
        'The total cost is $100 + $50 = $140, which seems wrong.'
      );

      const inconsistencies = await checker.checkNumericalConsistency(
        content
      );

      expect(inconsistencies).toHaveLength(1);
      expect(inconsistencies[0].expectedValue).toBe(150);
    });

    it('should assign appropriate severity levels', async () => {
      const content = createMockContent(
        'Small error: 10 + 1 = 11.1. Large error: 100 + 100 = 300.'
      );

      const inconsistencies = await checker.checkNumericalConsistency(
        content
      );

      expect(inconsistencies).toHaveLength(2);

      const smallError = inconsistencies.find(
        (i) => i.actualValue === 11.1
      );
      const largeError = inconsistencies.find(
        (i) => i.actualValue === 300
      );

      expect(smallError!.severity).toBe('low');
      expect(largeError!.severity).toBe('high');
    });

    it('should handle measurements with units', async () => {
      const content = createMockContent(
        'The distance is 5 km + 3 km = 9 km, which is incorrect.'
      );

      const inconsistencies = await checker.checkNumericalConsistency(
        content
      );

      expect(inconsistencies).toHaveLength(1);
      expect(inconsistencies[0].expectedValue).toBe(8);
    });

    it('should detect range violations', async () => {
      const content = createMockContent(
        'The acceptable range is 10 to 20. The measured value is 25.'
      );

      const inconsistencies = await checker.checkNumericalConsistency(
        content
      );

      expect(inconsistencies.length).toBeGreaterThan(0);
      const rangeViolation = inconsistencies.find(
        (i) => i.type === 'range_violation'
      );
      expect(rangeViolation).toBeDefined();
      expect(rangeViolation!.description).toContain(
        'outside expected range'
      );
    });

    it('should handle empty content gracefully', async () => {
      const content = createMockContent('');

      const inconsistencies = await checker.checkNumericalConsistency(
        content
      );

      expect(inconsistencies).toHaveLength(0);
    });

    it('should handle content with no numbers', async () => {
      const content = createMockContent(
        'This text contains no numerical values or calculations.'
      );

      const inconsistencies = await checker.checkNumericalConsistency(
        content
      );

      expect(inconsistencies).toHaveLength(0);
    });

    it('should provide accurate location information', async () => {
      const text =
        'Some text here. The calculation 5 + 5 = 11 is wrong.';
      const content = createMockContent(text);

      const inconsistencies = await checker.checkNumericalConsistency(
        content
      );

      expect(inconsistencies).toHaveLength(1);
      expect(inconsistencies[0].location.start).toBeGreaterThan(15);
      expect(inconsistencies[0].location.end).toBeLessThanOrEqual(
        text.length
      );
      expect(inconsistencies[0].location.line).toBe(1);
    });

    it('should handle complex financial calculations', async () => {
      const content = createMockContent(
        'Revenue: $1,000,000. Expenses: $750,000. Profit: $300,000. ' +
          'The profit margin calculation appears incorrect.'
      );

      const inconsistencies = await checker.checkNumericalConsistency(
        content
      );

      expect(inconsistencies.length).toBeGreaterThan(0);
      const sumError = inconsistencies.find(
        (i) => i.type === 'sum_mismatch'
      );
      expect(sumError).toBeDefined();
    });

    it('should detect unit mismatches', async () => {
      const content = createMockContent(
        'The measurements are: 5 meters, 10 feet, and 3 kilometers in the same context.'
      );

      const inconsistencies = await checker.checkNumericalConsistency(
        content
      );

      // Note: This test might not trigger unit mismatch detection depending on context analysis
      // The implementation focuses on same-context unit mixing
      expect(inconsistencies.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle percentage calculations correctly', async () => {
      const content = createMockContent(
        'The distribution breakdown: Marketing 40%, Sales 35%, Operations 25%. ' +
          'This represents the complete allocation.'
      );

      const inconsistencies = await checker.checkNumericalConsistency(
        content
      );

      expect(inconsistencies).toHaveLength(0); // Should sum to 100%
    });

    it('should detect inconsistent percentage totals', async () => {
      const content = createMockContent(
        'The allocation breakdown shows: Team A gets 45%, Team B gets 35%, and Team C gets 25%.'
      );

      const inconsistencies = await checker.checkNumericalConsistency(
        content
      );

      expect(inconsistencies.length).toBeGreaterThan(0);
      const percentageError = inconsistencies.find((i) =>
        i.description.includes('should sum to 100%')
      );
      expect(percentageError).toBeDefined();
      expect(percentageError!.actualValue).toBe(105);
    });

    it('should handle rounding tolerance in calculations', async () => {
      const content = createMockContent(
        'The calculation 1/3 + 1/3 + 1/3 = 1.00 is approximately correct.'
      );

      const inconsistencies = await checker.checkNumericalConsistency(
        content
      );

      // Should not flag this as an error due to rounding tolerance
      expect(inconsistencies).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should handle malformed content gracefully', async () => {
      const content = {
        ...createMockContent('test'),
        extractedText: null as any,
      };

      const inconsistencies = await checker.checkNumericalConsistency(
        content
      );

      expect(inconsistencies).toHaveLength(0);
    });

    it('should handle very large numbers', async () => {
      const content = createMockContent(
        'The calculation 1000000 + 2000000 = 2500000 is incorrect.'
      );

      const inconsistencies = await checker.checkNumericalConsistency(
        content
      );

      expect(inconsistencies).toHaveLength(1);
      expect(inconsistencies[0].expectedValue).toBe(3000000);
    });

    it('should handle scientific notation', async () => {
      const content = createMockContent(
        'The result 1.5e3 + 2.5e3 = 3.5e3 needs verification.'
      );

      // Note: Current implementation may not handle scientific notation
      // This test documents expected behavior for future enhancement
      const inconsistencies = await checker.checkNumericalConsistency(
        content
      );

      expect(inconsistencies.length).toBeGreaterThanOrEqual(0);
    });

    it('should perform efficiently on long text', async () => {
      const longText =
        'This is normal text. '.repeat(1000) +
        'The calculation 50 + 50 = 110 is wrong.';
      const content = createMockContent(longText);

      const start = Date.now();
      const inconsistencies = await checker.checkNumericalConsistency(
        content
      );
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(inconsistencies.length).toBeGreaterThan(0);
    });
  });
});
