import {
  ExternalKnowledgeSource,
  ExternalKnowledgeQuery,
  ExternalKnowledgeResult,
  ExternalSourceConfig,
} from '../interfaces/ExternalKnowledgeSource';
import { Source } from '../../../models/knowledge/Source';
import {
  Domain,
  SourceType,
} from '../../../models/core/ContentTypes';

export class GovernmentDataSource implements ExternalKnowledgeSource {
  readonly name = 'Government Data';
  readonly baseUrl = 'https://api.data.gov';
  readonly reliability = 95; // Government sources are highly reliable
  readonly supportedDomains: Domain[] = [
    'healthcare',
    'financial',
    'legal',
    'insurance',
  ];

  private config: ExternalSourceConfig;
  private domainEndpoints: Record<Domain, string> = {
    healthcare: 'https://api.fda.gov',
    financial: 'https://api.sec.gov',
    legal: 'https://api.justice.gov',
    insurance: 'https://api.treasury.gov',
    general: 'https://api.data.gov',
  };

  constructor(config?: Partial<ExternalSourceConfig>) {
    this.config = {
      name: this.name,
      baseUrl: this.baseUrl,
      timeout: 10000, // Government APIs can be slower
      maxRetries: 2,
      reliability: this.reliability,
      supportedDomains: this.supportedDomains,
      enabled: true,
      ...config,
    };
  }

  async query(
    query: ExternalKnowledgeQuery
  ): Promise<ExternalKnowledgeResult> {
    const startTime = Date.now();

    try {
      if (!this.config.enabled) {
        return this.createEmptyResult(startTime);
      }

      // Simulate government database search
      const searchResults = await this.simulateGovernmentSearch(
        query.statement,
        query.domain
      );

      const sources: Source[] = searchResults.map(
        (result, index) => ({
          id: `gov-${Date.now()}-${index}`,
          name: result.agency,
          title: result.title,
          url: result.url,
          type: 'government' as SourceType,
          sourceType: 'government' as SourceType,
          credibilityScore: this.getReliabilityForDomain(
            query.domain || 'healthcare'
          ),
          publishDate: result.publishDate,
          lastUpdated: new Date(),
          lastVerified: new Date(),
          author: result.agency,
        })
      );

      const confidence = this.calculateConfidence(
        searchResults,
        query.statement,
        query.domain
      );
      const isSupported = confidence > 70; // Higher threshold for government sources
      const evidence = searchResults.map((r) => r.summary);
      const contradictions: string[] = []; // Government sources rarely contradict themselves

      return {
        sources,
        confidence,
        queryTime: Math.max(1, Date.now() - startTime),
        isSupported,
        evidence,
        contradictions,
      };
    } catch (error) {
      console.warn(
        `Government source query failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      return this.createEmptyResult(startTime);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Government APIs are generally reliable but can have maintenance windows
      return this.config.enabled && Math.random() > 0.05; // 95% availability
    } catch {
      return false;
    }
  }

  getReliabilityForDomain(domain: Domain): number {
    // Government sources are highly reliable across all domains
    const domainReliability = {
      healthcare: 98, // FDA, CDC data is highly authoritative
      financial: 95, // SEC, Treasury data is authoritative
      legal: 97, // DOJ, court data is authoritative
      insurance: 90, // Various agencies regulate insurance
    };

    return (
      domainReliability[domain as keyof typeof domainReliability] ||
      this.reliability
    );
  }

  private async simulateGovernmentSearch(
    statement: string,
    domain?: Domain
  ): Promise<
    Array<{
      title: string;
      url: string;
      summary: string;
      publishDate: Date;
      agency: string;
    }>
  > {
    const keywords = statement
      .toLowerCase()
      .split(' ')
      .filter((word) => word.length > 3);

    if (keywords.length === 0) {
      return [];
    }

    // Mock government data based on domain
    const mockResults = [];

    if (
      domain === 'healthcare' ||
      keywords.some((k) =>
        ['medical', 'drug', 'treatment', 'health'].includes(k)
      )
    ) {
      mockResults.push({
        title: `FDA Guidance on ${keywords[0]}`,
        url: `https://www.fda.gov/guidance/${keywords[0]}`,
        summary: `Official FDA guidance regarding ${statement} and related regulatory requirements.`,
        publishDate: new Date(
          Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000
        ), // Within 6 months
        agency: 'Food and Drug Administration',
      });
    }

    if (
      domain === 'financial' ||
      keywords.some((k) =>
        ['financial', 'investment', 'securities', 'banking'].includes(
          k
        )
      )
    ) {
      mockResults.push({
        title: `SEC Regulation on ${keywords[0]}`,
        url: `https://www.sec.gov/rules/${keywords[0]}`,
        summary: `Securities and Exchange Commission regulations pertaining to ${statement}.`,
        publishDate: new Date(
          Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
        ), // Within 1 year
        agency: 'Securities and Exchange Commission',
      });
    }

    if (
      domain === 'legal' ||
      keywords.some((k) =>
        ['legal', 'law', 'regulation', 'compliance'].includes(k)
      )
    ) {
      mockResults.push({
        title: `DOJ Guidelines on ${keywords[0]}`,
        url: `https://www.justice.gov/guidelines/${keywords[0]}`,
        summary: `Department of Justice guidelines and legal precedents for ${statement}.`,
        publishDate: new Date(
          Date.now() - Math.random() * 730 * 24 * 60 * 60 * 1000
        ), // Within 2 years
        agency: 'Department of Justice',
      });
    }

    if (
      domain === 'insurance' ||
      keywords.some((k) =>
        ['insurance', 'policy', 'coverage', 'claim'].includes(k)
      )
    ) {
      mockResults.push({
        title: `NAIC Standards for ${keywords[0]}`,
        url: `https://www.naic.org/standards/${keywords[0]}`,
        summary: `National Association of Insurance Commissioners standards regarding ${statement}.`,
        publishDate: new Date(
          Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
        ), // Within 1 year
        agency: 'National Association of Insurance Commissioners',
      });
    }

    return mockResults;
  }

  private calculateConfidence(
    results: unknown[],
    statement: string,
    domain?: Domain
  ): number {
    if (results.length === 0) return 0;

    // Government sources have high base confidence
    let confidence = 80;

    // Boost for domain-specific results
    if (
      domain &&
      results.some((r) => r.agency.toLowerCase().includes(domain))
    ) {
      confidence += 10;
    }

    // Boost for recent publications
    const recentResults = results.filter(
      (r) =>
        Date.now() - r.publishDate.getTime() <
        180 * 24 * 60 * 60 * 1000 // Within 6 months
    );
    if (recentResults.length > 0) {
      confidence += 5;
    }

    return Math.min(confidence, 98); // Cap at 98% for government sources
  }

  private createEmptyResult(
    startTime: number
  ): ExternalKnowledgeResult {
    return {
      sources: [],
      confidence: 0,
      queryTime: Math.max(1, Date.now() - startTime),
      isSupported: false,
      evidence: [],
      contradictions: [],
    };
  }
}
