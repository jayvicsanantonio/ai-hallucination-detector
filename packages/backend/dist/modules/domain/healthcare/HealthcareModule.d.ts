import { DomainModule, ValidationResult, DomainRule, ModuleInfo, ComplianceResult } from '@/modules/interfaces/DomainModule';
import { ParsedContent } from '@/models/core/ParsedContent';
import { FeedbackData } from '@/models/audit/FeedbackData';
import { Domain } from '@/models/core/ContentTypes';
export declare class HealthcareModule implements DomainModule {
    readonly domain: Domain;
    readonly version: string;
    private medicalValidator;
    private hipaaChecker;
    private terminologyValidator;
    private rules;
    constructor();
    validateContent(content: ParsedContent): Promise<ValidationResult>;
    updateRules(newRules: DomainRule[]): Promise<void>;
    learnFromFeedback(feedback: FeedbackData): Promise<void>;
    getModuleInfo(): ModuleInfo;
    validateMedicalAccuracy(content: string): Promise<ValidationResult>;
    checkHIPAACompliance(content: string): Promise<ComplianceResult>;
    private extractMedicalData;
    private parseVitalSign;
    private initializeDefaultRules;
    private calculateConfidence;
    private updateValidationPatterns;
}
export interface MedicalData {
    id: string;
    type: 'medication' | 'medical_condition' | 'vital_sign' | 'patient_identifier' | 'procedure';
    value: string;
    location: {
        start: number;
        end: number;
    };
    medication?: string;
    dosage?: string;
    vitalType?: string;
    numericValue?: number;
    identifier?: string;
    context?: string;
}
//# sourceMappingURL=HealthcareModule.d.ts.map