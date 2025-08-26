import { ExternalKnowledgeSource, ExternalKnowledgeQuery } from './interfaces/ExternalKnowledgeSource';
import { Source } from '../../models/knowledge/Source';
import { Domain } from '../../models/core/ContentTypes';
export interface ConsolidatedResult {
    sources: Source[];
    overallConfidence: number;
    isSupported: boolean;
    evidence: string[];
    contradictions: string[];
    sourceReliabilityWeights: Record<string, number>;
    queryTime: number;
    availableSources: string[];
    unavailableSources: string[];
}
export interface SourceReliabilityConfig {
    sourceName: string;
    baseWeight: number;
    domainWeights: Partial<Record<Domain, number>>;
    enabled: boolean;
}
export declare class ExternalSourceManager {
    private sources;
    private reliabilityConfig;
    private fallbackEnabled;
    constructor();
    queryAllSources(query: ExternalKnowledgeQuery): Promise<ConsolidatedResult>;
    queryBestSource(query: ExternalKnowledgeQuery): Promise<ConsolidatedResult>;
    addSource(source: ExternalKnowledgeSource, reliabilityConfig?: SourceReliabilityConfig): void;
    removeSource(sourceName: string): void;
    updateSourceReliability(sourceName: string, feedback: 'positive' | 'negative', domain?: Domain): void;
    setFallbackEnabled(enabled: boolean): void;
    private initializeDefaultSources;
    private initializeReliabilityConfig;
    private getSortedSourcesByReliability;
    private consolidateResults;
    private createFallbackResult;
    private createEmptyResult;
    private deduplicateSources;
}
//# sourceMappingURL=ExternalSourceManager.d.ts.map