import { ParsedContent, ExtractedEntity } from '@/models/core/ParsedContent';
import { TextLocation } from '@/models/core/TextLocation';
import { Contradiction } from './LogicAnalyzer';
export interface Statement {
    text: string;
    location: TextLocation;
    entities: ExtractedEntity[];
    sentiment?: 'positive' | 'negative' | 'neutral';
    subject?: string;
    predicate?: string;
    object?: string;
}
export declare class ContradictionDetector {
    private negationWords;
    private contradictoryPairs;
    detectContradictions(content: ParsedContent): Promise<Contradiction[]>;
    private extractStatements;
    private findDirectContradictions;
    private findImplicitContradictions;
    private findTemporalContradictions;
    private findCausalContradictions;
    private checkNegationContradiction;
    private checkAntonymContradiction;
    private checkImplicitContradiction;
    private checkTemporalContradiction;
    private checkCausalContradiction;
    private analyzeSentiment;
    private parseStatement;
    private groupStatementsBySubject;
    private removeNegations;
    private calculateTextSimilarity;
    private calculateContextSimilarity;
    private hasTemporalIndicators;
    private hasCausalIndicators;
    private extractTemporalInfo;
    private extractCausalInfo;
    private areTemporallyInconsistent;
    private areCausallyInconsistent;
    private getLineNumber;
    private getColumnNumber;
}
//# sourceMappingURL=ContradictionDetector.d.ts.map