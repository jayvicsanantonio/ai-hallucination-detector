import { DomainModule, ValidationResult, DomainRule, ModuleInfo, ComplianceResult } from '@/modules/interfaces/DomainModule';
import { ParsedContent } from '@/models/core/ParsedContent';
import { FeedbackData } from '@/models/audit/FeedbackData';
import { Domain } from '@/models/core/ContentTypes';
export declare class FinancialModule implements DomainModule {
    readonly domain: Domain;
    readonly version: string;
    private numericalValidator;
    private complianceChecker;
    private calculationVerifier;
    private rules;
    constructor();
    validateContent(content: ParsedContent): Promise<ValidationResult>;
    updateRules(newRules: DomainRule[]): Promise<void>;
    learnFromFeedback(feedback: FeedbackData): Promise<void>;
    getModuleInfo(): ModuleInfo;
    validateNumericalAccuracy(calculations: Calculation[]): Promise<ValidationResult>;
    checkRegulatoryCompliance(content: string, regulations: string[]): Promise<ComplianceResult>;
    private extractFinancialData;
    private parseAmount;
    private parseRatio;
    private initializeDefaultRules;
    private calculateConfidence;
    private updateValidationPatterns;
}
export interface FinancialData {
    id: string;
    type: 'monetary_amount' | 'percentage' | 'financial_ratio' | 'calculation';
    value: string;
    location: {
        start: number;
        end: number;
    };
    numericValue: number;
    currency?: string;
    context?: string;
}
export interface Calculation {
    id: string;
    expression: string;
    result: number;
    expectedResult?: number;
    location: {
        start: number;
        end: number;
    };
    isValid: boolean;
    variables?: Record<string, number>;
}
//# sourceMappingURL=FinancialModule.d.ts.map