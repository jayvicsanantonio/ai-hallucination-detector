import { Source } from '../../models/knowledge/Source';
export interface CredibilityFactors {
    sourceType: number;
    recency: number;
    authorCredibility: number;
    domainRelevance: number;
    verificationHistory: number;
    citationCount: number;
}
export interface CredibilityAssessment {
    overallScore: number;
    factors: CredibilityFactors;
    reasoning: string[];
    confidence: number;
}
export declare class SourceCredibilityScorer {
    private sourceTypeWeights;
    private domainAuthorityPatterns;
    assessCredibility(source: Source, domain?: string): CredibilityAssessment;
    updateCredibilityFromFeedback(currentScore: number, feedback: 'positive' | 'negative', feedbackWeight?: number): number;
    compareSourceCredibility(sources: Source[], domain?: string): Source[];
    private scoreSourceType;
    private scoreRecency;
    private scoreAuthor;
    private scoreDomainRelevance;
    private scoreVerificationHistory;
    private scoreCitationCount;
    private calculateOverallScore;
    private generateReasoning;
    private calculateConfidence;
}
//# sourceMappingURL=SourceCredibilityScorer.d.ts.map