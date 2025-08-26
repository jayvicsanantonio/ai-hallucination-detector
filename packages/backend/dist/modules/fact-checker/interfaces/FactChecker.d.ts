import { ParsedContent } from '../../../models/core/ParsedContent';
import { Domain } from '../../../models/core/ContentTypes';
export interface FactCheckingRequest {
    content: ParsedContent;
    domain?: Domain;
    strictMode?: boolean;
    includeSourceDetails?: boolean;
}
export interface FactCheckingResult {
    verificationId: string;
    overallConfidence: number;
    factualIssues: FactualIssue[];
    verifiedClaims: VerifiedClaim[];
    processingTime: number;
    sourcesUsed: string[];
}
export interface FactualIssue {
    id: string;
    type: 'unsupported_claim' | 'contradicted_claim' | 'outdated_information';
    statement: string;
    location: {
        start: number;
        end: number;
        line?: number;
        column?: number;
    };
    confidence: number;
    evidence: string[];
    suggestedCorrection?: string;
    sources: string[];
}
export interface VerifiedClaim {
    statement: string;
    confidence: number;
    sources: string[];
    verificationMethod: string;
}
export interface FactChecker {
    /**
     * Check facts in the provided content
     */
    checkFacts(request: FactCheckingRequest): Promise<FactCheckingResult>;
    /**
     * Extract factual claims from content
     */
    extractClaims(content: ParsedContent): Promise<string[]>;
    /**
     * Verify a single claim
     */
    verifyClaim(claim: string, domain?: Domain): Promise<VerifiedClaim>;
}
//# sourceMappingURL=FactChecker.d.ts.map