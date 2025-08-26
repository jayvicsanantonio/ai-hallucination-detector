import { ExternalKnowledgeSource, ExternalKnowledgeQuery, ExternalKnowledgeResult, ExternalSourceConfig } from '../interfaces/ExternalKnowledgeSource';
import { Domain } from '../../../models/core/ContentTypes';
export declare class WikipediaSource implements ExternalKnowledgeSource {
    readonly name = "Wikipedia";
    readonly baseUrl = "https://en.wikipedia.org/api/rest_v1";
    readonly reliability = 75;
    readonly supportedDomains: Domain[];
    private config;
    constructor(config?: Partial<ExternalSourceConfig>);
    query(query: ExternalKnowledgeQuery): Promise<ExternalKnowledgeResult>;
    isAvailable(): Promise<boolean>;
    getReliabilityForDomain(domain: Domain): number;
    private simulateWikipediaSearch;
    private calculateConfidence;
    private createEmptyResult;
}
//# sourceMappingURL=WikipediaSource.d.ts.map