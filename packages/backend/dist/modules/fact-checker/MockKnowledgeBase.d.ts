import { KnowledgeBase, KnowledgeBaseQuery, KnowledgeBaseResult } from './interfaces/KnowledgeBase';
import { FactualClaim } from '../../models/knowledge/FactualClaim';
import { Source } from '../../models/knowledge/Source';
import { Domain } from '../../models/core/ContentTypes';
export declare class MockKnowledgeBase implements KnowledgeBase {
    private claims;
    private sources;
    constructor();
    searchClaims(query: KnowledgeBaseQuery): Promise<KnowledgeBaseResult>;
    addClaim(claim: FactualClaim): Promise<void>;
    updateClaim(claimId: string, updates: Partial<FactualClaim>): Promise<void>;
    verifyClaim(statement: string, domain?: Domain): Promise<{
        isSupported: boolean;
        confidence: number;
        supportingSources: Source[];
        contradictingSources: Source[];
    }>;
    getSourceCredibility(sourceId: string): Promise<number>;
    updateSourceCredibility(sourceId: string, feedback: 'positive' | 'negative'): Promise<void>;
    private initializeMockData;
}
//# sourceMappingURL=MockKnowledgeBase.d.ts.map