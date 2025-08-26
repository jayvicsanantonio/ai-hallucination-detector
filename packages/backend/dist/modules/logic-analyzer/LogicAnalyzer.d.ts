import { ParsedContent } from '@/models/core/ParsedContent';
import { Issue } from '@/models/core/VerificationResult';
import { IssueSeverity } from '@/models/core/ContentTypes';
import { TextLocation } from '@/models/core/TextLocation';
import { CoherenceIssue } from './CoherenceValidator';
export interface LogicAnalysisResult {
    contradictions: Contradiction[];
    logicalFallacies: LogicalFallacy[];
    numericalInconsistencies: NumericalInconsistency[];
    coherenceIssues: CoherenceIssue[];
    overallConsistency: number;
    confidence: number;
}
export interface Contradiction {
    id: string;
    statement1: string;
    statement2: string;
    location1: TextLocation;
    location2: TextLocation;
    type: 'direct' | 'implicit' | 'temporal' | 'causal';
    severity: IssueSeverity;
    explanation: string;
    confidence: number;
}
export interface LogicalFallacy {
    id: string;
    type: string;
    description: string;
    location: TextLocation;
    severity: IssueSeverity;
    explanation: string;
    examples: string[];
    confidence: number;
}
export interface NumericalInconsistency {
    id: string;
    type: 'calculation_error' | 'unit_mismatch' | 'range_violation' | 'sum_mismatch';
    description: string;
    location: TextLocation;
    expectedValue?: number;
    actualValue?: number;
    severity: IssueSeverity;
    confidence: number;
}
export declare class LogicAnalyzer {
    private contradictionDetector;
    private fallacyDetector;
    private numericalChecker;
    private coherenceValidator;
    constructor();
    analyzeLogicalConsistency(content: ParsedContent): Promise<LogicAnalysisResult>;
    convertToIssues(analysisResult: LogicAnalysisResult): Issue[];
    private calculateOverallConsistency;
    private calculateConfidence;
    private getSuggestedFixForCoherenceIssue;
}
//# sourceMappingURL=LogicAnalyzer.d.ts.map