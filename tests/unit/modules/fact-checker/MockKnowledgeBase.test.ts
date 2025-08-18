import { MockKnowledgeBase } from '../../../../src/modules/fact-checker/MockKnowledgeBase';
import {
  FactualClaim,
  Source,
} from '../../../../src/models/knowledge';
import {
  Domain,
  SourceType,
} from '../../../../src/models/core/ContentTypes';

describe('MockKnowledgeBase', () => {
  let knowledgeBase: MockKnowledgeBase;

  beforeEach(() => {
    knowledgeBase = new MockKnowledgeBase();
  });

  describe('searchClaims', () => {
    it('should find matching claims by statement text', async () => {
      const result = await knowledgeBase.searchClaims({
        statement: 'aspirin reduces heart attack',
      });

      expect(result.claims).toHaveLength(1);
      expect(result.claims[0].statement).toContain(
        'Aspirin reduces the risk of heart attack'
      );
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.queryTime).toBeGreaterThan(0);
    });

    it('should filter by domain', async () => {
      const result = await knowledgeBase.searchClaims({
        statement: 'FDIC insurance',
        domain: 'financial' as Domain,
      });

      expect(result.claims).toHaveLength(1);
      expect(result.claims[0].domain).toBe('financial');
    });

    it('should limit results based on maxResults parameter', async () => {
      const result = await knowledgeBase.searchClaims({
        statement: 'insurance',
        maxResults: 1,
      });

      expect(result.claims.length).toBeLessThanOrEqual(1);
    });

    it('should return empty results for non-matching queries', async () => {
      const result = await knowledgeBase.searchClaims({
        statement: 'completely unrelated topic that should not match',
      });

      expect(result.claims).toHaveLength(0);
      expect(result.confidence).toBe(0);
    });
  });

  describe('addClaim', () => {
    it('should add a new claim to the knowledge base', async () => {
      const newClaim: FactualClaim = {
        id: 'test-claim-1',
        statement: 'Test statement for verification',
        sources: [],
        confidence: 85,
        domain: 'healthcare' as Domain,
        lastVerified: new Date(),
      };

      await knowledgeBase.addClaim(newClaim);

      const result = await knowledgeBase.searchClaims({
        statement: 'Test statement for verification',
      });

      expect(result.claims).toHaveLength(1);
      expect(result.claims[0].id).toBe('test-claim-1');
    });

    it('should add sources when adding a claim', async () => {
      const newSource: Source = {
        id: 'test-source-1',
        title: 'Test Source',
        sourceType: 'academic' as SourceType,
        credibilityScore: 90,
      };

      const newClaim: FactualClaim = {
        id: 'test-claim-2',
        statement: 'Another test statement',
        sources: [newSource],
        confidence: 80,
        domain: 'legal' as Domain,
        lastVerified: new Date(),
      };

      await knowledgeBase.addClaim(newClaim);

      const credibility = await knowledgeBase.getSourceCredibility(
        'test-source-1'
      );
      expect(credibility).toBe(90);
    });
  });

  describe('updateClaim', () => {
    it('should update an existing claim', async () => {
      // First add a claim
      const claim: FactualClaim = {
        id: 'update-test-1',
        statement: 'Original statement',
        sources: [],
        confidence: 70,
        domain: 'financial' as Domain,
        lastVerified: new Date(),
      };

      await knowledgeBase.addClaim(claim);

      // Then update it
      await knowledgeBase.updateClaim('update-test-1', {
        confidence: 85,
        statement: 'Updated statement',
      });

      const result = await knowledgeBase.searchClaims({
        statement: 'Updated statement',
      });

      expect(result.claims[0].confidence).toBe(85);
      expect(result.claims[0].statement).toBe('Updated statement');
    });

    it('should throw error for non-existent claim', async () => {
      await expect(
        knowledgeBase.updateClaim('non-existent', { confidence: 50 })
      ).rejects.toThrow('Claim with id non-existent not found');
    });
  });

  describe('verifyClaim', () => {
    it('should verify a supported claim', async () => {
      const result = await knowledgeBase.verifyClaim(
        'aspirin reduces heart attack risk'
      );

      expect(result.isSupported).toBe(true);
      expect(result.confidence).toBeGreaterThan(70);
      expect(result.supportingSources.length).toBeGreaterThan(0);
    });

    it('should handle unsupported claims', async () => {
      const result = await knowledgeBase.verifyClaim(
        'completely false medical claim'
      );

      expect(result.isSupported).toBe(false);
      expect(result.supportingSources).toHaveLength(0);
    });

    it('should filter by domain when verifying', async () => {
      const result = await knowledgeBase.verifyClaim(
        'FDIC insurance covers deposits',
        'financial' as Domain
      );

      expect(result.isSupported).toBe(true);
      expect(result.confidence).toBeGreaterThan(90);
    });
  });

  describe('source credibility management', () => {
    it('should get source credibility', async () => {
      const credibility = await knowledgeBase.getSourceCredibility(
        'src-1'
      );
      expect(credibility).toBeGreaterThan(0);
      expect(credibility).toBeLessThanOrEqual(100);
    });

    it('should update source credibility with positive feedback', async () => {
      const originalCredibility =
        await knowledgeBase.getSourceCredibility('src-1');

      await knowledgeBase.updateSourceCredibility(
        'src-1',
        'positive'
      );

      const newCredibility = await knowledgeBase.getSourceCredibility(
        'src-1'
      );
      expect(newCredibility).toBeGreaterThan(originalCredibility);
    });

    it('should update source credibility with negative feedback', async () => {
      const originalCredibility =
        await knowledgeBase.getSourceCredibility('src-1');

      await knowledgeBase.updateSourceCredibility(
        'src-1',
        'negative'
      );

      const newCredibility = await knowledgeBase.getSourceCredibility(
        'src-1'
      );
      expect(newCredibility).toBeLessThan(originalCredibility);
    });

    it('should throw error for non-existent source', async () => {
      await expect(
        knowledgeBase.updateSourceCredibility(
          'non-existent',
          'positive'
        )
      ).rejects.toThrow('Source with id non-existent not found');
    });

    it('should cap credibility scores at 0 and 100', async () => {
      // Test upper bound
      for (let i = 0; i < 10; i++) {
        await knowledgeBase.updateSourceCredibility(
          'src-2',
          'positive'
        );
      }
      const maxCredibility = await knowledgeBase.getSourceCredibility(
        'src-2'
      );
      expect(maxCredibility).toBeLessThanOrEqual(100);

      // Test lower bound
      for (let i = 0; i < 30; i++) {
        await knowledgeBase.updateSourceCredibility(
          'src-2',
          'negative'
        );
      }
      const minCredibility = await knowledgeBase.getSourceCredibility(
        'src-2'
      );
      expect(minCredibility).toBeGreaterThanOrEqual(0);
    });
  });
});
