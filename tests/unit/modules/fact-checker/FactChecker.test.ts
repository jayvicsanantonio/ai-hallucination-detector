import { FactChecker } from '../../../../src/modules/fact-checker/FactChecker';
import { MockKnowledgeBase } from '../../../../src/modules/fact-checker/MockKnowledgeBase';
import { ParsedContent } from '../../../../src/models/core/ParsedContent';
import {
  ContentType,
  Domain,
} from '../../../../src/models/core/ContentTypes';

describe('FactChecker', () => {
  let factChecker: FactChecker;
  let mockKnowledgeBase: MockKnowledgeBase;

  beforeEach(() => {
    mockKnowledgeBase = new MockKnowledgeBase();
    factChecker = new FactChecker(mockKnowledgeBase);
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

  describe('checkFacts', () => {
    it('should identify supported claims', async () => {
      const content = createMockContent(
        'Aspirin reduces the risk of heart attack in high-risk patients. ' +
          'FDIC insurance covers deposits up to $250,000 per account.'
      );

      const result = await factChecker.checkFacts({
        content,
        domain: 'healthcare' as Domain,
      });

      expect(result.verificationId).toBeDefined();
      expect(result.overallConfidence).toBeGreaterThan(70);
      expect(result.verifiedClaims.length).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.sourcesUsed.length).toBeGreaterThan(0);
    });

    it('should identify unsupported claims', async () => {
      const content = createMockContent(
        'This completely false medical claim has no scientific basis. ' +
          'Unicorns are proven to cure all diseases according to studies.'
      );

      const result = await factChecker.checkFacts({
        content,
        domain: 'healthcare' as Domain,
      });

      expect(result.factualIssues.length).toBeGreaterThan(0);
      expect(result.overallConfidence).toBeLessThan(70);
    });

    it('should handle mixed content with both supported and unsupported claims', async () => {
      const content = createMockContent(
        'Aspirin reduces heart attack risk in patients. ' +
          'However, drinking unicorn tears is the best treatment for cancer.'
      );

      const result = await factChecker.checkFacts({
        content,
        domain: 'healthcare' as Domain,
      });

      expect(result.verifiedClaims.length).toBeGreaterThan(0);
      expect(result.factualIssues.length).toBeGreaterThan(0);
      expect(result.overallConfidence).toBeGreaterThan(30);
      expect(result.overallConfidence).toBeLessThan(90);
    });

    it('should apply strict mode correctly', async () => {
      const content = createMockContent(
        'This medication might be somewhat effective for some patients.'
      );

      const normalResult = await factChecker.checkFacts({
        content,
        strictMode: false,
      });

      const strictResult = await factChecker.checkFacts({
        content,
        strictMode: true,
      });

      // Strict mode should be more likely to flag uncertain claims
      expect(
        strictResult.factualIssues.length
      ).toBeGreaterThanOrEqual(normalResult.factualIssues.length);
    });

    it('should handle empty content gracefully', async () => {
      const content = createMockContent('');

      const result = await factChecker.checkFacts({ content });

      expect(result.verificationId).toBeDefined();
      expect(result.factualIssues).toHaveLength(0);
      expect(result.verifiedClaims).toHaveLength(0);
      expect(result.overallConfidence).toBe(100); // No claims = no issues
    });

    it('should provide detailed issue information', async () => {
      const content = createMockContent(
        'This false claim contradicts established medical knowledge.'
      );

      const result = await factChecker.checkFacts({
        content,
        domain: 'healthcare' as Domain,
      });

      if (result.factualIssues.length > 0) {
        const issue = result.factualIssues[0];
        expect(issue.id).toBeDefined();
        expect(issue.type).toMatch(
          /unsupported_claim|contradicted_claim|outdated_information/
        );
        expect(issue.statement).toBeDefined();
        expect(issue.location).toBeDefined();
        expect(issue.confidence).toBeGreaterThan(0);
        expect(issue.evidence).toBeDefined();
        expect(issue.sources).toBeDefined();
      }
    });

    it('should track sources used in verification', async () => {
      const content = createMockContent(
        'Aspirin reduces heart attack risk. FDIC insurance covers deposits.'
      );

      const result = await factChecker.checkFacts({
        content,
        domain: 'healthcare' as Domain,
      });

      expect(result.sourcesUsed).toBeDefined();
      expect(Array.isArray(result.sourcesUsed)).toBe(true);
    });
  });

  describe('extractClaims', () => {
    it('should extract factual claims from content', async () => {
      const content = createMockContent(
        'Studies show that 90% of patients respond to treatment. ' +
          'The medication is always effective for chronic conditions.'
      );

      const claims = await factChecker.extractClaims(content);

      expect(claims.length).toBeGreaterThan(0);
      expect(claims.some((claim) => claim.includes('90%'))).toBe(
        true
      );
      expect(
        claims.some((claim) => claim.includes('always effective'))
      ).toBe(true);
    });

    it('should return empty array for content with no claims', async () => {
      const content = createMockContent(
        'Hello there. How are you today? Nice weather we are having.'
      );

      const claims = await factChecker.extractClaims(content);

      expect(claims).toHaveLength(0);
    });
  });

  describe('verifyClaim', () => {
    it('should verify individual claims', async () => {
      const claim = 'Aspirin reduces the risk of heart attack';

      const result = await factChecker.verifyClaim(
        claim,
        'healthcare' as Domain
      );

      expect(result.statement).toBe(claim);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
      expect(result.sources).toBeDefined();
      expect(result.verificationMethod).toBeDefined();
    });

    it('should handle claims without domain specification', async () => {
      const claim = 'FDIC insurance covers bank deposits';

      const result = await factChecker.verifyClaim(claim);

      expect(result.statement).toBe(claim);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.sources).toBeDefined();
    });

    it('should provide appropriate verification method', async () => {
      const claim = 'Test claim for verification';

      const result = await factChecker.verifyClaim(claim);

      expect(result.verificationMethod).toMatch(
        /knowledge_base_match|knowledge_base_search/
      );
    });
  });

  describe('error handling', () => {
    it('should handle knowledge base errors gracefully', async () => {
      // Create a mock that throws an error
      const errorKnowledgeBase = {
        searchClaims: jest
          .fn()
          .mockRejectedValue(new Error('Knowledge base error')),
        addClaim: jest.fn(),
        updateClaim: jest.fn(),
        verifyClaim: jest
          .fn()
          .mockRejectedValue(new Error('Verification error')),
        getSourceCredibility: jest.fn(),
        updateSourceCredibility: jest.fn(),
      };

      const errorFactChecker = new FactChecker(errorKnowledgeBase);
      const content = createMockContent('Test content with claims.');

      await expect(
        errorFactChecker.checkFacts({ content })
      ).rejects.toThrow('Fact checking failed');
    });

    it('should handle malformed content gracefully', async () => {
      const malformedContent = {
        ...createMockContent('Test content'),
        extractedText: null as any, // Simulate malformed data
      };

      // Should not throw, but handle gracefully
      const result = await factChecker.checkFacts({
        content: malformedContent,
      });
      expect(result).toBeDefined();
    });
  });

  describe('confidence calculation', () => {
    it('should calculate confidence based on verified vs problematic claims', async () => {
      // Content with mostly good claims
      const goodContent = createMockContent(
        'Aspirin reduces heart attack risk. FDIC covers deposits up to $250,000.'
      );

      // Content with problematic claims
      const badContent = createMockContent(
        'Unicorns cure cancer. Magic potions heal all diseases instantly.'
      );

      const goodResult = await factChecker.checkFacts({
        content: goodContent,
      });
      const badResult = await factChecker.checkFacts({
        content: badContent,
      });

      expect(goodResult.overallConfidence).toBeGreaterThan(
        badResult.overallConfidence
      );
    });

    it('should handle edge case of no extractable claims', async () => {
      const content = createMockContent(
        'Just some regular text without any factual claims.'
      );

      const result = await factChecker.checkFacts({ content });

      expect(result.overallConfidence).toBe(100); // No claims = perfect confidence
    });
  });
});
