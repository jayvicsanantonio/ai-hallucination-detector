import {
  KnowledgeBase,
  KnowledgeBaseQuery,
  KnowledgeBaseResult,
} from './interfaces/KnowledgeBase';
import { FactualClaim } from '../../models/knowledge/FactualClaim';
import { Source } from '../../models/knowledge/Source';
import { Domain, SourceType } from '../../models/core/ContentTypes';

export class MockKnowledgeBase implements KnowledgeBase {
  private claims: Map<string, FactualClaim> = new Map();
  private sources: Map<string, Source> = new Map();

  constructor() {
    this.initializeMockData();
  }

  async searchClaims(
    query: KnowledgeBaseQuery
  ): Promise<KnowledgeBaseResult> {
    const startTime = Date.now();

    const matchingClaims = Array.from(this.claims.values()).filter(
      (claim) => {
        // Simple text matching - in real implementation would use semantic search
        const queryWords = query.statement.toLowerCase().split(' ');
        const claimWords = claim.statement.toLowerCase().split(' ');

        // Check for word overlap
        const commonWords = queryWords.filter(
          (word) =>
            word.length > 2 &&
            claimWords.some(
              (claimWord) =>
                claimWord.includes(word) || word.includes(claimWord)
            )
        );

        const statementMatch =
          commonWords.length >= Math.min(2, queryWords.length);

        const domainMatch =
          !query.domain || claim.domain === query.domain;

        return statementMatch && domainMatch;
      }
    );

    const limitedClaims = matchingClaims.slice(
      0,
      query.maxResults || 10
    );
    const allSources = limitedClaims.flatMap(
      (claim) => claim.sources
    );
    const confidence =
      limitedClaims.length > 0
        ? limitedClaims.reduce(
            (sum, claim) => sum + claim.confidence,
            0
          ) / limitedClaims.length
        : 0;

    return {
      claims: limitedClaims,
      confidence,
      queryTime: Math.max(1, Date.now() - startTime), // Ensure at least 1ms
      sources: allSources,
    };
  }

  async addClaim(claim: FactualClaim): Promise<void> {
    this.claims.set(claim.id, claim);

    // Add sources if they don't exist
    for (const source of claim.sources) {
      if (!this.sources.has(source.id)) {
        this.sources.set(source.id, source);
      }
    }
  }

  async updateClaim(
    claimId: string,
    updates: Partial<FactualClaim>
  ): Promise<void> {
    const existingClaim = this.claims.get(claimId);
    if (!existingClaim) {
      throw new Error(`Claim with id ${claimId} not found`);
    }

    const updatedClaim = { ...existingClaim, ...updates };
    this.claims.set(claimId, updatedClaim);
  }

  async verifyClaim(
    statement: string,
    domain?: Domain
  ): Promise<{
    isSupported: boolean;
    confidence: number;
    supportingSources: Source[];
    contradictingSources: Source[];
  }> {
    const searchResult = await this.searchClaims({
      statement,
      domain,
    });

    const supportingSources: Source[] = [];
    const contradictingSources: Source[] = [];

    for (const claim of searchResult.claims) {
      if (claim.confidence > 70) {
        supportingSources.push(...claim.sources);
      } else if (
        claim.contradictions?.some((contradiction: string) =>
          contradiction
            .toLowerCase()
            .includes(statement.toLowerCase())
        )
      ) {
        contradictingSources.push(...claim.sources);
      }
    }

    const isSupported =
      supportingSources.length > contradictingSources.length;
    const confidence = searchResult.confidence;

    return {
      isSupported,
      confidence,
      supportingSources,
      contradictingSources,
    };
  }

  async getSourceCredibility(sourceId: string): Promise<number> {
    const source = this.sources.get(sourceId);
    return source?.credibilityScore || 0;
  }

  async updateSourceCredibility(
    sourceId: string,
    feedback: 'positive' | 'negative'
  ): Promise<void> {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Source with id ${sourceId} not found`);
    }

    const adjustment = feedback === 'positive' ? 5 : -5;
    const newScore = Math.max(
      0,
      Math.min(100, source.credibilityScore + adjustment)
    );

    this.sources.set(sourceId, {
      ...source,
      credibilityScore: newScore,
      lastVerified: new Date(),
    });
  }

  private initializeMockData(): void {
    // Mock sources
    const mockSources: Source[] = [
      {
        id: 'src-1',
        title: 'Medical Research Database',
        sourceType: 'academic' as SourceType,
        credibilityScore: 95,
        url: 'https://pubmed.ncbi.nlm.nih.gov',
        lastVerified: new Date('2024-01-01'),
      },
      {
        id: 'src-2',
        title: 'FDA Guidelines',
        sourceType: 'government' as SourceType,
        credibilityScore: 98,
        url: 'https://www.fda.gov',
        lastVerified: new Date('2024-01-01'),
      },
      {
        id: 'src-3',
        title: 'Financial Industry Standards',
        sourceType: 'industry' as SourceType,
        credibilityScore: 85,
        url: 'https://www.finra.org',
        lastVerified: new Date('2024-01-01'),
      },
    ];

    mockSources.forEach((source) =>
      this.sources.set(source.id, source)
    );

    // Mock claims
    const mockClaims: FactualClaim[] = [
      {
        id: 'claim-1',
        statement: 'Aspirin reduces the risk of heart attack',
        sources: [mockSources[0], mockSources[1]],
        confidence: 92,
        domain: 'healthcare' as Domain,
        lastVerified: new Date('2024-01-01'),
        tags: ['medication', 'cardiovascular'],
      },
      {
        id: 'claim-2',
        statement: 'FDIC insurance covers deposits up to $250,000',
        sources: [mockSources[2]],
        confidence: 98,
        domain: 'financial' as Domain,
        lastVerified: new Date('2024-01-01'),
        tags: ['banking', 'insurance'],
      },
      {
        id: 'claim-3',
        statement: 'HIPAA requires patient consent for data sharing',
        sources: [mockSources[1]],
        confidence: 95,
        domain: 'healthcare' as Domain,
        lastVerified: new Date('2024-01-01'),
        tags: ['privacy', 'compliance'],
      },
    ];

    mockClaims.forEach((claim) => this.claims.set(claim.id, claim));
  }
}
