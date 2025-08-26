import { ParsedContent } from '@/models/core/ParsedContent';
import { IssueSeverity } from '@/models/core/ContentTypes';
import { LogicalFallacy } from './LogicAnalyzer';
export interface FallacyPattern {
    name: string;
    description: string;
    patterns: RegExp[];
    keywords: string[];
    severity: IssueSeverity;
    explanation: string;
    examples: string[];
}
export declare class LogicalFallacyDetector {
    private fallacyPatterns;
    detectFallacies(content: ParsedContent): Promise<LogicalFallacy[]>;
    private extractSentences;
    private checkForFallacy;
    private createFallacy;
    private calculateConfidence;
    private deduplicateFallacies;
    private getLineNumber;
    private getColumnNumber;
    addCustomFallacyPattern(pattern: FallacyPattern): void;
    getAvailableFallacyTypes(): string[];
    getFallacyPattern(fallacyType: string): FallacyPattern | undefined;
}
//# sourceMappingURL=LogicalFallacyDetector.d.ts.map