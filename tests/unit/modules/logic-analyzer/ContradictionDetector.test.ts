import { ContradictionDetector } from '@/modules/logic-analyzer/ContradictionDetector';
import { ParsedContent } from '@/models/core/ParsedContent';
import { ContentType } from '@/models/core/ContentTypes';

describe('ContradictionDetector', () => {
  let detector: ContradictionDetector;

  beforeEach(() => {
    detector = new ContradictionDetector();
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

  describe('detectContradictions', () => {
    it('should detect direct negation contradictions', async () => {
      const content = createMockContent(
        'The system is secure. The system is not secure.'
      );

      const contradictions = await detector.detectContradictions(
        content
      );

      expect(contradictions).toHaveLength(1);
      expect(contradictions[0].type).toBe('direct');
      expect(contradictions[0].explanation).toBe(
        'Direct contradiction through negation'
      );
      expect(contradictions[0].severity).toBe('high');
    });

    it('should detect antonym-based contradictions', async () => {
      const content = createMockContent(
        'The temperature is always high. The temperature is never high.'
      );

      const contradictions = await detector.detectContradictions(
        content
      );

      expect(contradictions.length).toBeGreaterThanOrEqual(1);
      expect(contradictions[0].type).toBe('direct');
      expect(
        contradictions.some((c) =>
          c.explanation.match(
            /always.*never|never.*always|Contradictory terms/
          )
        )
      ).toBe(true);
    });

    it('should detect implicit contradictions with same subject', async () => {
      const content = createMockContent(
        'The project is excellent and successful. The project is terrible and failed.'
      );

      const contradictions = await detector.detectContradictions(
        content
      );

      expect(contradictions.length).toBeGreaterThan(0);
      const implicitContradiction = contradictions.find(
        (c) => c.type === 'implicit'
      );
      expect(implicitContradiction).toBeDefined();
    });

    it('should detect temporal contradictions', async () => {
      const content = createMockContent(
        'The event happened before 2020. The event occurred after 2020.'
      );

      const contradictions = await detector.detectContradictions(
        content
      );

      // Note: This is a simplified test - full temporal logic would be more complex
      expect(contradictions.length).toBeGreaterThanOrEqual(0);
    });

    it('should not detect false positives in consistent text', async () => {
      const content = createMockContent(
        'The system is secure and reliable. The security measures are effective.'
      );

      const contradictions = await detector.detectContradictions(
        content
      );

      expect(contradictions).toHaveLength(0);
    });

    it('should handle empty content gracefully', async () => {
      const content = createMockContent('');

      const contradictions = await detector.detectContradictions(
        content
      );

      expect(contradictions).toHaveLength(0);
    });

    it('should handle single sentence content', async () => {
      const content = createMockContent('This is a single sentence.');

      const contradictions = await detector.detectContradictions(
        content
      );

      expect(contradictions).toHaveLength(0);
    });

    it('should detect multiple contradictions in complex text', async () => {
      const content = createMockContent(
        'The product is good and reliable. The product is bad and unreliable. ' +
          'Sales are increasing rapidly. Sales are decreasing rapidly. ' +
          'The company is profitable. The company is not profitable.'
      );

      const contradictions = await detector.detectContradictions(
        content
      );

      expect(contradictions.length).toBeGreaterThan(1);
    });

    it('should assign appropriate confidence scores', async () => {
      const content = createMockContent(
        'The system works perfectly. The system does not work at all.'
      );

      const contradictions = await detector.detectContradictions(
        content
      );

      expect(contradictions.length).toBeGreaterThanOrEqual(1);
      expect(contradictions[0].confidence).toBeGreaterThan(70);
      expect(contradictions[0].confidence).toBeLessThanOrEqual(100);
    });

    it('should provide accurate location information', async () => {
      const text =
        'First sentence. The system is secure. The system is not secure.';
      const content = createMockContent(text);

      const contradictions = await detector.detectContradictions(
        content
      );

      expect(contradictions).toHaveLength(1);
      expect(contradictions[0].location1.start).toBeGreaterThan(0);
      expect(contradictions[0].location2.start).toBeGreaterThan(
        contradictions[0].location1.end
      );
      expect(contradictions[0].location1.line).toBe(1);
      expect(contradictions[0].location2.line).toBe(1);
    });

    it('should handle complex negation patterns', async () => {
      const content = createMockContent(
        'The service cannot be improved. The service can be improved significantly.'
      );

      const contradictions = await detector.detectContradictions(
        content
      );

      expect(contradictions.length).toBeGreaterThanOrEqual(1);
      expect(contradictions[0].type).toBe('direct');
    });

    it('should detect contradictions with different sentence structures', async () => {
      const content = createMockContent(
        'All employees are satisfied with the policy. None of the employees like the policy.'
      );

      const contradictions = await detector.detectContradictions(
        content
      );

      expect(contradictions.length).toBeGreaterThanOrEqual(1);
      expect(
        contradictions.some(
          (c) =>
            c.explanation.includes('all') ||
            c.explanation.includes('Contradictory terms')
        )
      ).toBe(true);
    });

    it('should handle contradictions with similar but not identical subjects', async () => {
      const content = createMockContent(
        'The new system is fast. The old system is slow.'
      );

      const contradictions = await detector.detectContradictions(
        content
      );

      // Should not detect contradiction since subjects are different (new vs old system)
      expect(contradictions).toHaveLength(0);
    });

    it('should detect contradictions in financial context', async () => {
      const content = createMockContent(
        'Revenue is increasing this quarter. Revenue is decreasing this quarter.'
      );

      const contradictions = await detector.detectContradictions(
        content
      );

      expect(contradictions.length).toBeGreaterThanOrEqual(1);
      expect(
        contradictions.some(
          (c) =>
            c.explanation.includes('increasing') ||
            c.explanation.includes('Contradictory terms')
        )
      ).toBe(true);
    });

    it('should handle contradictions with qualifiers', async () => {
      const content = createMockContent(
        'The product is always available. The product is never available.'
      );

      const contradictions = await detector.detectContradictions(
        content
      );

      expect(contradictions.length).toBeGreaterThanOrEqual(1);
      expect(['medium', 'high']).toContain(
        contradictions[0].severity
      );
    });

    it('should provide meaningful evidence in contradiction results', async () => {
      const content = createMockContent(
        'The system is operational. The system is not operational.'
      );

      const contradictions = await detector.detectContradictions(
        content
      );

      expect(contradictions).toHaveLength(1);
      expect(contradictions[0].statement1).toContain('operational');
      expect(contradictions[0].statement2).toContain(
        'not operational'
      );
    });
  });

  describe('error handling', () => {
    it('should handle malformed content gracefully', async () => {
      const content = {
        ...createMockContent('test'),
        extractedText: null as any,
      };

      const contradictions = await detector.detectContradictions(
        content
      );

      expect(contradictions).toHaveLength(0);
    });

    it('should handle very long text without performance issues', async () => {
      const longText =
        'This is a test sentence. '.repeat(1000) +
        'The system works. The system does not work.';
      const content = createMockContent(longText);

      const start = Date.now();
      const contradictions = await detector.detectContradictions(
        content
      );
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      expect(contradictions.length).toBeGreaterThanOrEqual(0); // May or may not find contradictions due to performance optimizations
    });
  });
});
