import { LogicalFallacyDetector } from '@/modules/logic-analyzer/LogicalFallacyDetector';
import { ParsedContent } from '@/models/core/ParsedContent';
import { ContentType } from '@/models/core/ContentTypes';

describe('LogicalFallacyDetector', () => {
  let detector: LogicalFallacyDetector;

  beforeEach(() => {
    detector = new LogicalFallacyDetector();
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

  describe('detectFallacies', () => {
    it('should detect ad hominem fallacies', async () => {
      const content = createMockContent(
        'You are wrong because you are stupid and biased.'
      );

      const fallacies = await detector.detectFallacies(content);

      expect(fallacies).toHaveLength(1);
      expect(fallacies[0].type).toBe('Ad Hominem');
      expect(fallacies[0].severity).toBe('medium');
      expect(fallacies[0].confidence).toBeGreaterThan(60);
    });

    it('should detect straw man fallacies', async () => {
      const content = createMockContent(
        "So you're saying we should eliminate all safety regulations completely."
      );

      const fallacies = await detector.detectFallacies(content);

      expect(fallacies).toHaveLength(1);
      expect(fallacies[0].type).toBe('Straw Man');
      expect(fallacies[0].description).toContain('Misrepresenting');
    });

    it('should detect false dichotomy fallacies', async () => {
      const content = createMockContent(
        'You must choose between security and privacy. There are only two options here.'
      );

      const fallacies = await detector.detectFallacies(content);

      expect(fallacies.length).toBeGreaterThan(0);
      const falseDichotomy = fallacies.find(
        (f) => f.type === 'False Dichotomy'
      );
      expect(falseDichotomy).toBeDefined();
      expect(falseDichotomy!.severity).toBe('medium');
    });

    it('should detect appeal to authority fallacies', async () => {
      const content = createMockContent(
        'According to the expert, this is definitely true. Trust the authority on this matter.'
      );

      const fallacies = await detector.detectFallacies(content);

      expect(fallacies.length).toBeGreaterThan(0);
      const appealToAuthority = fallacies.find(
        (f) => f.type === 'Appeal to Authority'
      );
      expect(appealToAuthority).toBeDefined();
      expect(appealToAuthority!.severity).toBe('low');
    });

    it('should detect slippery slope fallacies', async () => {
      const content = createMockContent(
        'If we allow this change, next thing you know everything will collapse.'
      );

      const fallacies = await detector.detectFallacies(content);

      expect(fallacies.length).toBeGreaterThanOrEqual(1);
      const slipperySlope = fallacies.find(
        (f) => f.type === 'Slippery Slope'
      );
      expect(slipperySlope).toBeDefined();
      expect(slipperySlope!.explanation).toContain(
        'evidence for each step'
      );
    });

    it('should detect circular reasoning fallacies', async () => {
      const content = createMockContent(
        "It's obviously the best solution because it's clearly better than alternatives."
      );

      const fallacies = await detector.detectFallacies(content);

      expect(fallacies.length).toBeGreaterThan(0);
      const circularReasoning = fallacies.find(
        (f) => f.type === 'Circular Reasoning'
      );
      expect(circularReasoning).toBeDefined();
      expect(circularReasoning!.severity).toBe('high');
    });

    it('should detect hasty generalization fallacies', async () => {
      const content = createMockContent(
        'All politicians are corrupt because I met one who was dishonest.'
      );

      const fallacies = await detector.detectFallacies(content);

      expect(fallacies.length).toBeGreaterThan(0);
      const hastyGeneralization = fallacies.find(
        (f) => f.type === 'Hasty Generalization'
      );
      expect(hastyGeneralization).toBeDefined();
      expect(hastyGeneralization!.explanation).toContain(
        'sufficient sample size'
      );
    });

    it('should detect appeal to emotion fallacies', async () => {
      const content = createMockContent(
        'Think of the children! This heartbreaking situation proves we need immediate action.'
      );

      const fallacies = await detector.detectFallacies(content);

      expect(fallacies.length).toBeGreaterThan(0);
      const appealToEmotion = fallacies.find(
        (f) => f.type === 'Appeal to Emotion'
      );
      expect(appealToEmotion).toBeDefined();
      expect(appealToEmotion!.severity).toBe('medium');
    });

    it('should detect red herring fallacies', async () => {
      const content = createMockContent(
        'But what about the other problems we have? The real issue is something completely different.'
      );

      const fallacies = await detector.detectFallacies(content);

      expect(fallacies.length).toBeGreaterThan(0);
      const redHerring = fallacies.find(
        (f) => f.type === 'Red Herring'
      );
      expect(redHerring).toBeDefined();
      expect(redHerring!.severity).toBe('low');
    });

    it('should detect bandwagon fallacies', async () => {
      const content = createMockContent(
        'Everyone knows this is the right approach. Most people agree with this decision.'
      );

      const fallacies = await detector.detectFallacies(content);

      expect(fallacies.length).toBeGreaterThan(0);
      const bandwagon = fallacies.find(
        (f) => f.type === 'Bandwagon Fallacy'
      );
      expect(bandwagon).toBeDefined();
      expect(bandwagon!.explanation).toContain('popularity');
    });

    it('should not detect fallacies in logical arguments', async () => {
      const content = createMockContent(
        'Based on the evidence presented, including peer-reviewed studies and statistical analysis, ' +
          'we can conclude that this approach is effective. The data shows a clear correlation ' +
          'between implementation and improved outcomes.'
      );

      const fallacies = await detector.detectFallacies(content);

      expect(fallacies).toHaveLength(0);
    });

    it('should handle empty content gracefully', async () => {
      const content = createMockContent('');

      const fallacies = await detector.detectFallacies(content);

      expect(fallacies).toHaveLength(0);
    });

    it('should deduplicate overlapping fallacies', async () => {
      const content = createMockContent(
        'You are stupid and wrong because you are biased and incompetent.'
      );

      const fallacies = await detector.detectFallacies(content);

      // Should detect ad hominem but not create multiple overlapping instances
      expect(fallacies.length).toBeLessThanOrEqual(2);
      expect(fallacies[0].type).toBe('Ad Hominem');
    });

    it('should provide accurate location information', async () => {
      const text =
        'This is a good argument. You are wrong because you are stupid.';
      const content = createMockContent(text);

      const fallacies = await detector.detectFallacies(content);

      expect(fallacies).toHaveLength(1);
      expect(fallacies[0].location.start).toBeGreaterThan(20); // After first sentence
      expect(fallacies[0].location.end).toBeLessThanOrEqual(
        text.length
      );
      expect(fallacies[0].location.line).toBe(1);
    });

    it('should assign higher confidence to pattern-based detection', async () => {
      const content = createMockContent(
        'You are wrong because you are stupid.' // Clear pattern match
      );

      const fallacies = await detector.detectFallacies(content);

      expect(fallacies).toHaveLength(1);
      expect(fallacies[0].confidence).toBeGreaterThan(60);
    });

    it('should handle multiple fallacies in the same text', async () => {
      const content = createMockContent(
        "You are stupid and biased. Everyone knows you're wrong. " +
          "Either you agree with us or you're against progress. " +
          'Think of the children who will suffer from your decision!'
      );

      const fallacies = await detector.detectFallacies(content);

      expect(fallacies.length).toBeGreaterThan(2);

      const fallacyTypes = fallacies.map((f) => f.type);
      expect(fallacyTypes).toContain('Ad Hominem');
      expect(fallacyTypes).toContain('Appeal to Emotion');
    });

    it('should sort fallacies by location', async () => {
      const content = createMockContent(
        'Think of the children! You are wrong because you are stupid. Everyone agrees with me.'
      );

      const fallacies = await detector.detectFallacies(content);

      expect(fallacies.length).toBeGreaterThan(1);

      // Should be sorted by start position
      for (let i = 1; i < fallacies.length; i++) {
        expect(fallacies[i].location.start).toBeGreaterThanOrEqual(
          fallacies[i - 1].location.start
        );
      }
    });
  });

  describe('custom fallacy patterns', () => {
    it('should allow adding custom fallacy patterns', () => {
      const customPattern = {
        name: 'Custom Fallacy',
        description: 'A custom fallacy for testing',
        patterns: [/custom pattern/gi],
        keywords: ['custom', 'pattern'],
        severity: 'medium' as const,
        explanation: 'This is a custom fallacy',
        examples: ['This is a custom pattern example'],
      };

      detector.addCustomFallacyPattern(customPattern);

      const availableTypes = detector.getAvailableFallacyTypes();
      expect(availableTypes).toContain('Custom Fallacy');
    });

    it('should detect custom fallacy patterns', async () => {
      const customPattern = {
        name: 'Test Fallacy',
        description: 'A test fallacy',
        patterns: [/test fallacy pattern/gi],
        keywords: ['test', 'fallacy'],
        severity: 'high' as const,
        explanation: 'This is a test fallacy',
        examples: ['test fallacy pattern'],
      };

      detector.addCustomFallacyPattern(customPattern);

      const content = createMockContent(
        'This contains a test fallacy pattern in the text.'
      );
      const fallacies = await detector.detectFallacies(content);

      expect(fallacies).toHaveLength(1);
      expect(fallacies[0].type).toBe('Test Fallacy');
      expect(fallacies[0].severity).toBe('high');
    });
  });

  describe('utility methods', () => {
    it('should return available fallacy types', () => {
      const types = detector.getAvailableFallacyTypes();

      expect(types).toContain('Ad Hominem');
      expect(types).toContain('Straw Man');
      expect(types).toContain('False Dichotomy');
      expect(types.length).toBeGreaterThan(5);
    });

    it('should return fallacy pattern details', () => {
      const pattern = detector.getFallacyPattern('Ad Hominem');

      expect(pattern).toBeDefined();
      expect(pattern!.name).toBe('Ad Hominem');
      expect(pattern!.description).toContain('Attacking the person');
      expect(pattern!.severity).toBe('medium');
    });

    it('should return undefined for non-existent fallacy type', () => {
      const pattern = detector.getFallacyPattern(
        'Non-existent Fallacy'
      );

      expect(pattern).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle malformed content gracefully', async () => {
      const content = {
        ...createMockContent('test'),
        extractedText: null as any,
      };

      const fallacies = await detector.detectFallacies(content);

      expect(fallacies).toHaveLength(0);
    });

    it('should handle very long text efficiently', async () => {
      const longText =
        'This is a normal sentence. '.repeat(500) +
        'You are wrong because you are stupid.';
      const content = createMockContent(longText);

      const start = Date.now();
      const fallacies = await detector.detectFallacies(content);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
      expect(fallacies.length).toBeGreaterThan(0);
    });
  });
});
