import { ParsedContent } from '@/models/core/ParsedContent';
import { TextLocation } from '@/models/core/TextLocation';
import { NumericalInconsistency } from './LogicAnalyzer';
export interface NumericalValue {
    value: number;
    unit?: string;
    location: TextLocation;
    context: string;
    originalText: string;
    type: 'integer' | 'decimal' | 'percentage' | 'currency' | 'measurement';
}
export interface Calculation {
    expression: string;
    expectedResult: number;
    actualResult?: number;
    location: TextLocation;
    operands: NumericalValue[];
    operator: string;
    confidence: number;
}
export interface NumericalRange {
    min: number;
    max: number;
    unit?: string;
    location: TextLocation;
    context: string;
}
export declare class NumericalConsistencyChecker {
    private numberPatterns;
    private calculationPatterns;
    private unitConversions;
    checkNumericalConsistency(content: ParsedContent): Promise<NumericalInconsistency[]>;
    private extractNumericalValues;
    private checkCalculationErrors;
    private checkUnitMismatches;
    private checkRangeViolations;
    private checkSumMismatches;
    private checkPercentageConsistency;
    private parseNumericalValue;
    private extractUnit;
    private getContext;
    private groupValuesByContext;
    private haveSimilarContext;
    private getUnitType;
    private extractRanges;
    private isValueRelevantToRange;
    private shouldSumToHundred;
    private calculateSeverityForCalculationError;
    private calculateSeverityForRangeViolation;
    private calculateSeverityForSumMismatch;
    private getLineNumber;
    private getColumnNumber;
}
//# sourceMappingURL=NumericalConsistencyChecker.d.ts.map