import { FactChecker as IFactChecker, FactCheckingRequest, FactCheckingResult, VerifiedClaim } from './interfaces/FactChecker';
import { KnowledgeBase } from './interfaces/KnowledgeBase';
import { ExternalSourceManager } from './ExternalSourceManager';
import { ParsedContent } from '../../models/core/ParsedContent';
import { Domain } from '../../models/core/ContentTypes';
export declare class FactChecker implements IFactChecker {
    private knowledgeBase;
    private claimExtractor;
    private credibilityScorer;
    private externalSourceManager;
    constructor(knowledgeBase: KnowledgeBase, externalSourceManager?: ExternalSourceManager);
    checkFacts(request: FactCheckingRequest): Promise<FactCheckingResult>;
    extractClaims(content: ParsedContent): Promise<string[]>;
    verifyClaim(claim: string, domain?: Domain): Promise<VerifiedClaim>;
    private verifyExtractedClaim;
    private calculateOverallConfidence;
    private generateSuggestedCorrection;
}
//# sourceMappingURL=FactChecker.d.ts.map