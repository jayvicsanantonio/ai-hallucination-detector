import { ParsedContent } from '@/models/core/ParsedContent';
import { Issue } from '@/models/core/VerificationResult';
import { DomainRule, ComplianceResult } from '@/modules/interfaces/DomainModule';
import { MedicalData } from './HealthcareModule';
export declare class HIPAAComplianceChecker {
    private rules;
    private piiPatterns;
    constructor();
    checkHIPAACompliance(content: ParsedContent, medicalData: MedicalData[]): Promise<Issue[]>;
    checkCompliance(content: ParsedContent): Promise<ComplianceResult>;
    updateRules(newRules: DomainRule[]): Promise<void>;
    private detectPII;
    private checkPatientIdentifiers;
    private checkRequiredDisclosures;
    private checkDataSecurityRequirements;
    private checkMinimumNecessaryStandard;
    private containsHealthInformation;
    private initializeHIPAARules;
    private initializePIIPatterns;
}
//# sourceMappingURL=HIPAAComplianceChecker.d.ts.map