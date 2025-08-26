import { ParsedContent } from '@/models/core/ParsedContent';
import { TextLocation } from '@/models/core/TextLocation';
import { IssueSeverity } from '@/models/core/ContentTypes';
export interface CoherenceIssue {
    id: string;
    type: 'semantic_incoherence' | 'temporal_inconsistency' | 'causal_inconsistency' | 'reference_error';
    description: string;
    location: TextLocation;
    severity: IssueSeverity;
    confidence: number;
    evidence: string[];
    context: string;
}
export interface TemporalEvent {
    id: string;
    description: string;
    timestamp?: Date;
    timeExpression: string;
    location: TextLocation;
    relativeOrder?: number;
}
export interface CausalRelation {
    id: string;
    cause: string;
    effect: string;
    causeLocation: TextLocation;
    effectLocation: TextLocation;
    confidence: number;
    type: 'direct' | 'indirect' | 'conditional';
}
export interface CrossReference {
    id: string;
    referenceText: string;
    targetText?: string;
    location: TextLocation;
    targetLocation?: TextLocation;
    isResolved: boolean;
    type: 'pronoun' | 'definite_reference' | 'anaphora' | 'cataphora';
}
export declare class CoherenceValidator {
    private temporalIndicators;
    private causalIndicators;
    private referencePronouns;
    validateCoherence(content: ParsedContent): Promise<CoherenceIssue[]>;
    private validateSemanticCoherence;
    private validateTemporalConsistency;
    private validateCausalConsistency;
    private validateCrossReferences;
    private extractSentences;
    private calculateSemanticSimilarity;
    private isSignificantTopicShift;
    private findSemanticContradictions;
    private extractTemporalEvents;
    private extractCausalRelations;
    private extractCrossReferences;
    private checkTemporalInconsistency;
    private checkCausalInconsistency;
    private analyzeSentiment;
    private getTemporalOrder;
    private classifyReferenceType;
    private tryResolveReference;
    private getContext;
    private getLineNumber;
    private getColumnNumber;
}
//# sourceMappingURL=CoherenceValidator.d.ts.map