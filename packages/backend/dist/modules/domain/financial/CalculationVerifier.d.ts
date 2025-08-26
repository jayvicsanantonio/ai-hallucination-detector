import { ParsedContent } from '@/models/core/ParsedContent';
import { Issue } from '@/models/core/VerificationResult';
import { FinancialData } from './FinancialModule';
export declare class CalculationVerifier {
    private readonly PRECISION_TOLERANCE;
    verifyCalculations(content: ParsedContent, financialData: FinancialData[]): Promise<Issue[]>;
    private extractCalculations;
    private verifyCalculation;
    private verifyFinancialRatios;
    private verifyPercentageCalculations;
    private verifyCompoundCalculations;
    private calculateExpectedResult;
    private parseNumber;
    private parsePercentage;
}
//# sourceMappingURL=CalculationVerifier.d.ts.map