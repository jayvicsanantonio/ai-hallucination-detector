import { WikipediaSource } from '../../../../src/modules/fact-checker/external-sources/WikipediaSource';
import { GovernmentDataSource } from '../../../../src/modules/fact-checker/external-sources/GovernmentDataSource';
import { ExternalSourceManager } from '../../../../src/modules/fact-checker/ExternalSourceManager';
import { Domain } from '../../../../src/models/core/ContentTypes';

describe('External Knowledge Sources Integration', () => {
  describe('WikipediaSource', () => {
    let wikipediaSource: WikipediaSource;

    beforeEach(() => {
      wikipediaSource = new WikipediaSource();
    });

    it('should query Wikipedia for medical information', async () => {
      const result = await wikipediaSource.query({
        statement: 'aspirin reduces heart attack risk',
        domain: 'healthcare' as Domain,
        maxResults: 5,
      });

      expect(result.sources.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.queryTime).toBeGreaterThan(0);
      expect(result.evidence.length).toBeGreaterThan(0);
    });

    it('should handle empty queries gracefully', async () => {
      const result = await wikipediaSource.query({
        statement: '',
        maxResults: 5,
      });

      expect(result.sources).toHaveLength(0);
      expect(result.confidence).toBe(0);
      expect(result.isSupported).toBe(false);
    });

    it('should check availability', async () => {
      const isAvailable = await wikipediaSource.isAvailable();
      expect(typeof isAvailable).toBe('boolean');
    });

    it('should provide domain-specific reliability scores', () => {
      const healthcareReliability =
        wikipediaSource.getReliabilityForDomain(
          'healthcare' as Domain
        );
      const financialReliability =
        wikipediaSource.getReliabilityForDomain(
          'financial' as Domain
        );

      expect(healthcareReliability).toBeGreaterThan(0);
      expect(healthcareReliability).toBeLessThanOrEqual(100);
      expect(financialReliability).toBeGreaterThan(0);
      expect(financialReliability).toBeLessThanOrEqual(100);
    });

    it('should handle disabled configuration', async () => {
      const disabledSource = new WikipediaSource({ enabled: false });

      const result = await disabledSource.query({
        statement: 'test query',
        domain: 'healthcare' as Domain,
      });

      expect(result.sources).toHaveLength(0);
      expect(result.confidence).toBe(0);
    });
  });

  describe('GovernmentDataSource', () => {
    let govSource: GovernmentDataSource;

    beforeEach(() => {
      govSource = new GovernmentDataSource();
    });

    it('should query government data for healthcare information', async () => {
      const result = await govSource.query({
        statement: 'FDA approved medication safety',
        domain: 'healthcare' as Domain,
        maxResults: 3,
      });

      expect(result.sources.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.sources[0].sourceType).toBe('government');
    });

    it('should query government data for financial information', async () => {
      const result = await govSource.query({
        statement: 'SEC securities regulation compliance',
        domain: 'financial' as Domain,
        maxResults: 3,
      });

      expect(result.sources.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.sources[0].sourceType).toBe('government');
    });

    it('should provide high reliability scores', () => {
      const healthcareReliability = govSource.getReliabilityForDomain(
        'healthcare' as Domain
      );
      const financialReliability = govSource.getReliabilityForDomain(
        'financial' as Domain
      );

      expect(healthcareReliability).toBeGreaterThan(90);
      expect(financialReliability).toBeGreaterThan(90);
    });

    it('should check availability', async () => {
      const isAvailable = await govSource.isAvailable();
      expect(typeof isAvailable).toBe('boolean');
    });

    it('should handle domain-specific queries', async () => {
      const legalResult = await govSource.query({
        statement: 'legal compliance requirements',
        domain: 'legal' as Domain,
      });

      const insuranceResult = await govSource.query({
        statement: 'insurance policy regulations',
        domain: 'insurance' as Domain,
      });

      expect(legalResult.sources.length).toBeGreaterThan(0);
      expect(insuranceResult.sources.length).toBeGreaterThan(0);
    });
  });

  describe('ExternalSourceManager', () => {
    let sourceManager: ExternalSourceManager;

    beforeEach(() => {
      sourceManager = new ExternalSourceManager();
    });

    it('should query all available sources', async () => {
      const result = await sourceManager.queryAllSources({
        statement: 'medical treatment effectiveness',
        domain: 'healthcare' as Domain,
        maxResults: 5,
      });

      expect(result.sources.length).toBeGreaterThan(0);
      expect(result.overallConfidence).toBeGreaterThan(0);
      expect(result.availableSources.length).toBeGreaterThan(0);
      expect(result.sourceReliabilityWeights).toBeDefined();
      expect(
        Object.keys(result.sourceReliabilityWeights).length
      ).toBeGreaterThan(0);
    });

    it('should query the best source first', async () => {
      const result = await sourceManager.queryBestSource({
        statement: 'government regulation compliance',
        domain: 'financial' as Domain,
        maxResults: 3,
      });

      expect(result.sources.length).toBeGreaterThan(0);
      expect(result.overallConfidence).toBeGreaterThan(0);
      expect(result.queryTime).toBeGreaterThan(0);
    });

    it('should handle source reliability weighting', async () => {
      const result = await sourceManager.queryAllSources({
        statement: 'healthcare policy information',
        domain: 'healthcare' as Domain,
      });

      // Government sources should have higher weight than Wikipedia
      const govWeight =
        result.sourceReliabilityWeights['Government Data'];
      const wikiWeight = result.sourceReliabilityWeights['Wikipedia'];

      if (govWeight && wikiWeight) {
        expect(govWeight).toBeGreaterThan(wikiWeight);
      }
    });

    it('should update source reliability based on feedback', () => {
      const initialConfig =
        sourceManager['reliabilityConfig'].get('Wikipedia');
      const initialWeight = initialConfig?.baseWeight || 0;

      sourceManager.updateSourceReliability('Wikipedia', 'positive');

      const updatedConfig =
        sourceManager['reliabilityConfig'].get('Wikipedia');
      const updatedWeight = updatedConfig?.baseWeight || 0;

      expect(updatedWeight).toBeGreaterThan(initialWeight);
    });

    it('should handle domain-specific reliability updates', () => {
      const initialConfig =
        sourceManager['reliabilityConfig'].get('Wikipedia');
      const initialWeight =
        initialConfig?.domainWeights['healthcare'] ||
        initialConfig?.baseWeight ||
        0;

      sourceManager.updateSourceReliability(
        'Wikipedia',
        'negative',
        'healthcare' as Domain
      );

      const updatedConfig =
        sourceManager['reliabilityConfig'].get('Wikipedia');
      const updatedWeight =
        updatedConfig?.domainWeights['healthcare'] || 0;

      expect(updatedWeight).toBeLessThan(initialWeight);
    });

    it('should add and remove sources dynamically', async () => {
      // Create a custom source with a different name
      const customSource = {
        name: 'Custom Wikipedia',
        baseUrl: 'https://custom.wikipedia.org',
        reliability: 80,
        supportedDomains: ['healthcare' as Domain],
        async query() {
          return {
            sources: [],
            confidence: 50,
            queryTime: 1,
            isSupported: true,
            evidence: ['Custom evidence'],
            contradictions: [],
          };
        },
        async isAvailable() {
          return true;
        },
        getReliabilityForDomain() {
          return 80;
        },
      };

      sourceManager.addSource(customSource);

      const result = await sourceManager.queryAllSources({
        statement: 'test query',
      });

      expect(result.availableSources).toContain('Custom Wikipedia');

      sourceManager.removeSource('Custom Wikipedia');

      const result2 = await sourceManager.queryAllSources({
        statement: 'test query',
      });

      expect(result2.availableSources).not.toContain(
        'Custom Wikipedia'
      );
    });

    it('should handle fallback when all sources are unavailable', async () => {
      // Create a manager with no sources
      const emptyManager = new ExternalSourceManager();
      emptyManager.removeSource('Wikipedia');
      emptyManager.removeSource('Government Data');

      const result = await emptyManager.queryAllSources({
        statement: 'test query',
      });

      expect(result.sources).toHaveLength(0);
      expect(result.overallConfidence).toBe(0);
      expect(result.isSupported).toBe(false);
      expect(result.evidence).toContain(
        'No external sources available for verification'
      );
    });

    it('should disable fallback when configured', async () => {
      const emptyManager = new ExternalSourceManager();
      emptyManager.removeSource('Wikipedia');
      emptyManager.removeSource('Government Data');
      emptyManager.setFallbackEnabled(false);

      const result = await emptyManager.queryAllSources({
        statement: 'test query',
      });

      expect(result.sources).toHaveLength(0);
      expect(result.evidence).not.toContain(
        'No external sources available for verification'
      );
    });

    it('should consolidate conflicting results appropriately', async () => {
      const result = await sourceManager.queryAllSources({
        statement: 'controversial medical treatment',
        domain: 'healthcare' as Domain,
      });

      // Should have results from at least one source
      expect(result.availableSources.length).toBeGreaterThanOrEqual(
        1
      );

      // Overall confidence should be reasonable
      expect(result.overallConfidence).toBeGreaterThanOrEqual(0);
      expect(result.overallConfidence).toBeLessThanOrEqual(100);

      // Should have evidence from multiple sources
      expect(result.evidence.length).toBeGreaterThan(0);
    });
  });
});
