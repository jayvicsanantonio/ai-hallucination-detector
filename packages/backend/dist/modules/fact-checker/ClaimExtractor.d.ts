import { ParsedContent } from '../../models/core/ParsedContent';
import { Domain } from '../../models/core/ContentTypes';
export interface ExtractedClaim {
    statement: string;
    confidence: number;
    location: {
        start: number;
        end: number;
        line?: number;
        column?: number;
    };
    context: string;
    type: 'factual' | 'statistical' | 'regulatory' | 'medical' | 'financial';
}
export declare class ClaimExtractor {
    private factualPatterns;
    private domainKeywords;
    extractClaims(content: ParsedContent, domain?: Domain): ExtractedClaim[];
    private isValidClaim;
    private getLocation;
    private getContext;
    private classifyClaimType;
    private calculateExtractionConfidence;
    private deduplicateClaims;
}
//# sourceMappingURL=ClaimExtractor.d.ts.map