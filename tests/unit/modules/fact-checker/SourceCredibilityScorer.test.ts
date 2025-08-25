import { SourceCredibilityScorer } from '../../../../src/modules/fact-checker/SourceCredibilityScorer';
import { Source } from '../../../../src/models/knowledge/Source';
import { SourceType } from '../../../../src/models/core/ContentTypes';

describe('SourceCredibilityScorer', () => {
  let scorer: SourceCredibilityScorer;

  beforeEach(() => {
    scorer = new SourceCredibilityScorer();
  });

  const createMockSource = (
    overrides: Partial<Source> = {}
  ): Source => ({
    id: 'test-source-1',
    name: 'Test Source',
    title: 'Test Source',
    type: 'academic' as SourceType,
    credibilityScore: 80,
    publishDate: new Date('2024-01-01'),
    lastVerified: new Date('2024-01-15'),
    lastUpdated: new Date('2024-01-15'),
    ...overrides,
  });

  describe('assessCredibility', () => {
    it('should give high scores to government sources', () => {
      const source = createMockSource({
        sourceType: 'government' as SourceType,
        url: 'https://www.fda.gov/guidance',
      });

      const assessment = scorer.assessCredibility(source);

      expect(assessment.overallScore).toBeGreaterThan(70);
      expect(assessment.factors.sourceType).toBe(95);
    });

    it('should give high scores to academic sources', () => {
      const source = createMockSource({
        sourceType: 'academic' as SourceType,
        url: 'https://pubmed.ncbi.nlm.nih.gov/article',
      });

      const assessment = scorer.assessCredibility(source);

      expect(assessment.overallScore).toBeGreaterThan(70);
      expect(assessment.factors.sourceType).toBe(90);
    });

    it('should score recent sources higher', () => {
      const recentSource = createMockSource({
        publishDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      });

      const oldSource = createMockSource({
        publishDate: new Date(
          Date.now() - 2000 * 24 * 60 * 60 * 1000
        ), // ~5.5 years ago
      });

      const recentAssessment = scorer.assessCredibility(recentSource);
      const oldAssessment = scorer.assessCredibility(oldSource);

      expect(recentAssessment.factors.recency).toBeGreaterThanOrEqual(
        oldAssessment.factors.recency
      );
    });

    it('should score authors with credentials higher', () => {
      const doctorSource = createMockSource({
        author: 'Dr. Jane Smith, MD, PhD',
      });

      const unknownAuthorSource = createMockSource({
        author: 'John Doe',
      });

      const doctorAssessment = scorer.assessCredibility(doctorSource);
      const unknownAssessment = scorer.assessCredibility(
        unknownAuthorSource
      );

      expect(
        doctorAssessment.factors.authorCredibility
      ).toBeGreaterThan(unknownAssessment.factors.authorCredibility);
    });

    it('should boost domain relevance for authoritative domains', () => {
      const fdaSource = createMockSource({
        url: 'https://www.fda.gov/drugs/guidance',
        sourceType: 'government' as SourceType,
      });

      const assessment = scorer.assessCredibility(
        fdaSource,
        'healthcare'
      );

      expect(assessment.factors.domainRelevance).toBeGreaterThan(90);
    });

    it('should provide reasoning for scores', () => {
      const highQualitySource = createMockSource({
        sourceType: 'government' as SourceType,
        author: 'Dr. Expert, PhD',
        publishDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        url: 'https://www.nih.gov/research',
      });

      const assessment = scorer.assessCredibility(
        highQualitySource,
        'healthcare'
      );

      expect(assessment.reasoning.length).toBeGreaterThan(0);
      expect(
        assessment.reasoning.some((reason) =>
          reason.includes('High credibility source type')
        )
      ).toBe(true);
    });

    it('should calculate confidence based on available information', () => {
      const completeSource = createMockSource({
        author: 'Dr. Jane Smith, PhD',
        publishDate: new Date(),
        url: 'https://www.nih.gov/study',
      });

      const incompleteSource = createMockSource({
        author: undefined,
        publishDate: undefined,
        url: undefined,
      });

      const completeAssessment =
        scorer.assessCredibility(completeSource);
      const incompleteAssessment =
        scorer.assessCredibility(incompleteSource);

      expect(completeAssessment.confidence).toBeGreaterThan(
        incompleteAssessment.confidence
      );
    });
  });

  describe('updateCredibilityFromFeedback', () => {
    it('should increase credibility with positive feedback', () => {
      const originalScore = 70;
      const newScore = scorer.updateCredibilityFromFeedback(
        originalScore,
        'positive'
      );

      expect(newScore).toBeGreaterThan(originalScore);
      expect(newScore).toBeLessThanOrEqual(100);
    });

    it('should decrease credibility with negative feedback', () => {
      const originalScore = 70;
      const newScore = scorer.updateCredibilityFromFeedback(
        originalScore,
        'negative'
      );

      expect(newScore).toBeLessThan(originalScore);
      expect(newScore).toBeGreaterThanOrEqual(0);
    });

    it('should respect upper bound of 100', () => {
      const highScore = 98;
      const newScore = scorer.updateCredibilityFromFeedback(
        highScore,
        'positive'
      );

      expect(newScore).toBeLessThanOrEqual(100);
    });

    it('should respect lower bound of 0', () => {
      const lowScore = 2;
      const newScore = scorer.updateCredibilityFromFeedback(
        lowScore,
        'negative'
      );

      expect(newScore).toBeGreaterThanOrEqual(0);
    });

    it('should apply feedback weight', () => {
      const originalScore = 70;
      const lightFeedback = scorer.updateCredibilityFromFeedback(
        originalScore,
        'positive',
        0.5
      );
      const heavyFeedback = scorer.updateCredibilityFromFeedback(
        originalScore,
        'positive',
        2.0
      );

      expect(heavyFeedback - originalScore).toBeGreaterThan(
        lightFeedback - originalScore
      );
    });
  });

  describe('compareSourceCredibility', () => {
    it('should sort sources by credibility score', () => {
      const sources: Source[] = [
        createMockSource({
          id: 'low-cred',
          sourceType: 'news' as SourceType,
          credibilityScore: 60,
        }),
        createMockSource({
          id: 'high-cred',
          sourceType: 'government' as SourceType,
          credibilityScore: 95,
        }),
        createMockSource({
          id: 'med-cred',
          sourceType: 'academic' as SourceType,
          credibilityScore: 80,
        }),
      ];

      const sortedSources = scorer.compareSourceCredibility(sources);

      expect(sortedSources[0].id).toBe('high-cred');
      expect(sortedSources[1].id).toBe('med-cred');
      expect(sortedSources[2].id).toBe('low-cred');
    });

    it('should consider domain relevance in comparison', () => {
      const sources: Source[] = [
        createMockSource({
          id: 'generic-high',
          sourceType: 'academic' as SourceType,
          url: 'https://example.edu/general',
        }),
        createMockSource({
          id: 'domain-specific',
          sourceType: 'government' as SourceType,
          url: 'https://www.fda.gov/drugs',
        }),
      ];

      const sortedSources = scorer.compareSourceCredibility(
        sources,
        'healthcare'
      );

      // Domain-specific source should rank higher despite potentially lower base score
      expect(sortedSources[0].id).toBe('domain-specific');
    });
  });

  describe('edge cases', () => {
    it('should handle sources with missing information gracefully', () => {
      const incompleteSource: Source = {
        id: 'incomplete',
        name: 'Incomplete Source',
        title: 'Incomplete Source',
        type: 'news' as SourceType,
        credibilityScore: 50,
        lastUpdated: new Date(),
        // Missing optional fields
      };

      const assessment = scorer.assessCredibility(incompleteSource);

      expect(assessment.overallScore).toBeGreaterThan(0);
      expect(assessment.overallScore).toBeLessThanOrEqual(100);
      expect(assessment.factors).toBeDefined();
      expect(assessment.reasoning).toBeDefined();
    });

    it('should handle very old sources', () => {
      const ancientSource = createMockSource({
        publishDate: new Date('1990-01-01'),
        lastVerified: new Date('1990-01-01'),
      });

      const assessment = scorer.assessCredibility(ancientSource);

      expect(assessment.factors.recency).toBeLessThan(30);
      expect(assessment.overallScore).toBeGreaterThan(0);
    });

    it('should handle future dates gracefully', () => {
      const futureSource = createMockSource({
        publishDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year in future
      });

      const assessment = scorer.assessCredibility(futureSource);

      expect(assessment.overallScore).toBeGreaterThan(0);
      expect(assessment.overallScore).toBeLessThanOrEqual(100);
    });
  });
});
