import { DomainModule, ValidationResult, DomainRule, ModuleInfo, ComplianceResult } from '@/modules/interfaces/DomainModule';
import { ParsedContent } from '@/models/core/ParsedContent';
import { FeedbackData } from '@/models/audit/FeedbackData';
import { Domain } from '@/models/core/ContentTypes';
export declare class LegalModule implements DomainModule {
    readonly domain: Domain;
    readonly version: string;
    private contractValidator;
    private complianceChecker;
    private entityRecognizer;
    private rules;
    constructor();
    validateContent(content: ParsedContent): Promise<ValidationResult>;
    updateRules(newRules: DomainRule[]): Promise<void>;
    learnFromFeedback(feedback: FeedbackData): Promise<void>;
    getModuleInfo(): ModuleInfo;
    validateContractTerms(terms: ContractTerm[]): Promise<ValidationResult>;
    checkLegalCompliance(content: string, jurisdiction: string): Promise<ComplianceResult>;
    private initializeDefaultRules;
    private calculateConfidence;
    private updateValidationPatterns;
}
export interface ContractTerm {
    id: string;
    type: 'party' | 'consideration' | 'obligation' | 'condition' | 'termination';
    content: string;
    location: {
        start: number;
        end: number;
    };
    isRequired: boolean;
    jurisdiction?: string;
}
export interface LegalEntity {
    name: string;
    type: 'corporation' | 'llc' | 'partnership' | 'individual' | 'government';
    jurisdiction: string;
    registrationNumber?: string;
    location: {
        start: number;
        end: number;
    };
}
//# sourceMappingURL=LegalModule.d.ts.map