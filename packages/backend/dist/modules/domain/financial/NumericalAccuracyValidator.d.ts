import { ParsedContent } from '@/models/core/ParsedContent';
import { Issue } from '@/models/core/VerificationResult';
import { DomainRule, ValidationResult } from '@/modules/interfaces/DomainModule';
import { FinancialData, Calculation } from './FinancialModule';
export declare class NumericalAccuracyValidator {
    private rules;
    private readonly PRECISION_TOLERANCE;
    constructor();
    validateNumericalAccuracy(content: ParsedContent, financialData: FinancialData[]): Promise<Issue[]>;
    validateCalculations(calculations: Calculation[]): Promise<ValidationResult>;
    updateRules(newRules: DomainRule[]): Promise<void>;
    private validateMonetaryAmounts;
    private validatePercentages;
    private validateFinancialRatios;
    private validateCalculationsInContent;
    private parseNumber;
    private initializeNumericalRules;
}
//# sourceMappingURL=NumericalAccuracyValidator.d.ts.map