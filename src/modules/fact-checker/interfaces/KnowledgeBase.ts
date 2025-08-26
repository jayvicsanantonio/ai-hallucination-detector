import { FactualClaim, Source } from '../../../models/knowledge';
import { Domain } from '../../../models/core/ContentTypes';

export interface KnowledgeBaseQuery {
  statement: string;
  domain?: Domain;
  context?: string;
  maxResults?: number;
}

export interface KnowledgeBaseResult {
  claims: FactualClaim[];
  confidence: number;
  queryTime: number;
  sources: Source[];
}

export interface KnowledgeBase {
  /**
   * Search for factual claims related to a statement
   */
  searchClaims(
    query: KnowledgeBaseQuery
  ): Promise<KnowledgeBaseResult>;

  /**
   * Add a new factual claim to the knowledge base
   */
  addClaim(claim: FactualClaim): Promise<void>;

  /**
   * Update an existing factual claim
   */
  updateClaim(
    claimId: string,
    updates: Partial<FactualClaim>
  ): Promise<void>;

  /**
   * Verify a claim against known sources
   */
  verifyClaim(
    statement: string,
    domain?: Domain
  ): Promise<{
    isSupported: boolean;
    confidence: number;
    supportingSources: Source[];
    contradictingSources: Source[];
  }>;

  /**
   * Get source credibility score
   */
  getSourceCredibility(sourceId: string): Promise<number>;

  /**
   * Update source credibility based on feedback
   */
  updateSourceCredibility(
    sourceId: string,
    feedback: 'positive' | 'negative'
  ): Promise<void>;
}
