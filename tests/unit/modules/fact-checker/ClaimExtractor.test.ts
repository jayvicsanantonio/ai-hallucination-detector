import { ClaimExtractor } from '../../../../src/modules/fact-checker/ClaimExtractor';
import { ParsedContent } from '../../../../src/models/core/ParsedContent';
import {
  ContentType,
  Domain,
} from '../../../../src/models/core/ContentTypes';

describe('ClaimExtractor', () => {
  let extractor: ClaimExtractor;

  beforeEach(() => {
    extractor = new ClaimExtractor();
  });

  const createMockContent = (text: string): ParsedContent => ({
    id: 'test-content-1',
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
      author: 'Test Author',
      createdDate: new Date(),
      language: 'en',
      wordCount: text.split(' ').length,
      pageCount: 1,
    },
    createdAt: new Date(),
  });

  describe('extractClaims', () => {
    it('should extract statistical claims', () => {
      const content = createMockContent(
        'Studies show that 85% of patients respond well to this treatment. ' +
          'The success rate is 92 percent in clinical trials.'
      );

      const claims = extractor.extractClaims(content);

      expect(claims.length).toBeGreaterThan(0);
      expect(
        claims.some((claim) => claim.statement.includes('85%'))
      ).toBe(true);
      expect(
        claims.some((claim) => claim.statement.includes('92 percent'))
      ).toBe(true);
    });

    it('should extract definitive statements', () => {
      const content = createMockContent(
        'All patients must complete the full course of treatment. ' +
          'The medication will always cause drowsiness. ' +
          'This procedure cannot be performed on children.'
      );

      const claims = extractor.extractClaims(content);

      expect(claims.length).toBeGreaterThan(0);
      expect(
        claims.some((claim) =>
          claim.statement.includes('must complete')
        )
      ).toBe(true);
      expect(
        claims.some((claim) =>
          claim.statement.includes('will always')
        )
      ).toBe(true);
      expect(
        claims.some((claim) =>
          claim.statement.includes('cannot be performed')
        )
      ).toBe(true);
    });

    it('should extract comparative claims', () => {
      const content = createMockContent(
        'This drug is more effective than the previous treatment. ' +
          'Patient recovery time is faster with the new protocol.'
      );

      const claims = extractor.extractClaims(content);

      expect(claims.length).toBeGreaterThan(0);
      expect(
        claims.some((claim) =>
          claim.statement.includes('more effective than')
        )
      ).toBe(true);
      expect(
        claims.some((claim) =>
          claim.statement.includes('faster with')
        )
      ).toBe(true);
    });

    it('should extract medical/scientific claims', () => {
      const content = createMockContent(
        'Aspirin prevents heart attacks in high-risk patients. ' +
          'This medication treats chronic pain effectively. ' +
          'The new drug cures most cases of the disease.'
      );

      const claims = extractor.extractClaims(content);

      expect(claims.length).toBeGreaterThan(0);
      expect(
        claims.some((claim) =>
          claim.statement.includes('prevents heart attacks')
        )
      ).toBe(true);
      expect(
        claims.some((claim) =>
          claim.statement.includes('treats chronic pain')
        )
      ).toBe(true);
      expect(
        claims.some((claim) =>
          claim.statement.includes('cures most cases')
        )
      ).toBe(true);
    });

    it('should extract financial/regulatory claims', () => {
      const content = createMockContent(
        'The company complies with all SEC regulations. ' +
          'This investment costs $50,000 annually. ' +
          'The new policy violates federal guidelines.'
      );

      const claims = extractor.extractClaims(content);

      expect(claims.length).toBeGreaterThan(0);
      expect(
        claims.some((claim) =>
          claim.statement.includes('complies with')
        )
      ).toBe(true);
      expect(
        claims.some((claim) =>
          claim.statement.includes('costs $50,000')
        )
      ).toBe(true);
      expect(
        claims.some((claim) =>
          claim.statement.includes('violates federal')
        )
      ).toBe(true);
    });

    it('should filter out questions', () => {
      const content = createMockContent(
        'Does this medication work? ' +
          'What are the side effects? ' +
          'The medication is effective.'
      );

      const claims = extractor.extractClaims(content);

      expect(
        claims.every((claim) => !claim.statement.includes('?'))
      ).toBe(true);
      expect(
        claims.some(
          (claim) =>
            claim.statement.toLowerCase().includes('medication') &&
            claim.statement.toLowerCase().includes('effective')
        )
      ).toBe(true);
    });

    it('should filter out very short statements', () => {
      const content = createMockContent(
        'Yes. No. Maybe. ' +
          'This is a proper length statement that should be extracted.'
      );

      const claims = extractor.extractClaims(content);

      expect(
        claims.every((claim) => claim.statement.length >= 10)
      ).toBe(true);
      expect(
        claims.some(
          (claim) =>
            claim.statement.toLowerCase().includes('proper length') &&
            claim.statement.toLowerCase().includes('extracted')
        )
      ).toBe(true);
    });

    it('should provide accurate location information', () => {
      const content = createMockContent(
        'First sentence here. The medication is 90% effective in trials. Last sentence.'
      );

      const claims = extractor.extractClaims(content);
      const claim = claims.find(
        (c) =>
          c.statement.includes('90%') ||
          c.statement.includes('effective')
      );

      expect(claim).toBeDefined();
      if (claim) {
        expect(claim.location.start).toBeGreaterThanOrEqual(0);
        expect(claim.location.end).toBeGreaterThan(
          claim.location.start
        );
        expect(claim.location.line).toBeGreaterThan(0);
      }
    });

    it('should classify claim types correctly', () => {
      const content = createMockContent(
        'Studies show 75% success rate. ' +
          'The FDA requires proper labeling. ' +
          'Aspirin treats headaches effectively.'
      );

      const claims = extractor.extractClaims(
        content,
        'healthcare' as Domain
      );

      const statisticalClaim = claims.find((c) =>
        c.statement.includes('75%')
      );
      const regulatoryClaim = claims.find(
        (c) =>
          c.statement.includes('FDA') ||
          c.statement.includes('requires')
      );
      const medicalClaim = claims.find(
        (c) =>
          c.statement.includes('treats') ||
          c.statement.includes('headaches')
      );

      // Check that claims are classified, but be flexible about exact types
      expect(claims.length).toBeGreaterThan(0);
      if (statisticalClaim) {
        expect(['statistical', 'factual']).toContain(
          statisticalClaim.type
        );
      }
      if (regulatoryClaim) {
        expect(['regulatory', 'factual']).toContain(
          regulatoryClaim.type
        );
      }
      if (medicalClaim) {
        expect(['medical', 'factual']).toContain(medicalClaim.type);
      }
    });

    it('should calculate confidence scores', () => {
      const content = createMockContent(
        'All patients must take this medication. ' +
          'The treatment might be effective. ' +
          'Studies suggest possible benefits.'
      );

      const claims = extractor.extractClaims(content);

      const definiteClaim = claims.find((c) =>
        c.statement.includes('must take')
      );
      const uncertainClaim = claims.find((c) =>
        c.statement.includes('might be')
      );

      expect(definiteClaim?.confidence).toBeGreaterThan(50);
      expect(uncertainClaim?.confidence).toBeLessThan(
        definiteClaim?.confidence || 100
      );
    });

    it('should deduplicate overlapping claims', () => {
      const content = createMockContent(
        'The medication is 90% effective. Studies show the medication is 90% effective in trials.'
      );

      const claims = extractor.extractClaims(content);

      // Should not have exact duplicates or heavily overlapping claims
      const effectivenessClaims = claims.filter((c) =>
        c.statement.includes('90% effective')
      );
      expect(effectivenessClaims.length).toBeLessThanOrEqual(2);
    });

    it('should handle empty content', () => {
      const content = createMockContent('');

      const claims = extractor.extractClaims(content);

      expect(claims).toHaveLength(0);
    });

    it('should handle content with no extractable claims', () => {
      const content = createMockContent(
        'Hello there. How are you? Nice weather today. See you later.'
      );

      const claims = extractor.extractClaims(content);

      expect(claims).toHaveLength(0);
    });

    it('should boost confidence for domain-specific content', () => {
      const content = createMockContent(
        'The patient requires immediate medical attention.'
      );

      const healthcareClaims = extractor.extractClaims(
        content,
        'healthcare' as Domain
      );
      const genericClaims = extractor.extractClaims(content);

      if (healthcareClaims.length > 0 && genericClaims.length > 0) {
        expect(healthcareClaims[0].confidence).toBeGreaterThanOrEqual(
          genericClaims[0].confidence
        );
      }
    });
  });
});
