import { ExternalKnowledgeSource, ExternalKnowledgeQuery, ExternalKnowledgeResult, ExternalSourceConfig } from '../interfaces/ExternalKnowledgeSource';
import { Domain } from '../../../models/core/ContentTypes';
export declare class GovernmentDataSource implements ExternalKnowledgeSource {
    readonly name = "Government Data";
    readonly baseUrl = "https://api.data.gov";
    readonly reliability = 95;
    readonly supportedDomains: Domain[];
    private config;
    private domainEndpoints;
    constructor(config?: Partial<ExternalSourceConfig>);
    query(query: ExternalKnowledgeQuery): Promise<ExternalKnowledgeResult>;
    isAvailable(): Promise<boolean>;
    getReliabilityForDomain(domain: Domain): number;
    private simulateGovernmentSearch;
    private calculateConfidence;
    private createEmptyResult;
}
//# sourceMappingURL=GovernmentDataSource.d.ts.map