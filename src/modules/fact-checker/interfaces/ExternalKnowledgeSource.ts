import { Source } from '../../models/knowledge/Source';
import { Domain } from '../../models/core/ContentTypes';

export interface ExternalKnowledgeQuery {
  statement: string;
  domain?: Domain;
  maxResults?: number;
  timeout?: number;
}

export interface ExternalKnowledgeResult {
  sources: Source[];
  confidence: number;
  queryTime: number;
  isSupported: boolean;
  evidence: string[];
  contradictions: string[];
}

export interface ExternalKnowledgeSource {
  readonly name: string;
  readonly baseUrl: string;
  readonly reliability: number; // 0-100
  readonly supportedDomains: Domain[];

  /**
   * Query the external source for information about a statement
   */
  query(
    query: ExternalKnowledgeQuery
  ): Promise<ExternalKnowledgeResult>;

  /**
   * Check if the source is available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get the source's reliability score for a specific domain
   */
  getReliabilityForDomain(domain: Domain): number;
}

export interface ExternalSourceConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  maxRetries: number;
  reliability: number;
  supportedDomains: Domain[];
  enabled: boolean;
}
