import { ParsedContent } from '@/models/core/ParsedContent';
import { Issue } from '@/models/core/VerificationResult';
import { DomainRule, ComplianceResult } from '@/modules/interfaces/DomainModule';
import { LegalEntity } from './LegalModule';
export declare class LegalComplianceChecker {
    private rules;
    private jurisdictionRules;
    constructor();
    checkCompliance(content: ParsedContent, entities: LegalEntity[]): Promise<Issue[]>;
    checkJurisdictionCompliance(content: string, jurisdiction: string): Promise<ComplianceResult>;
    updateRules(newRules: DomainRule[]): Promise<void>;
    private checkGeneralCompliance;
    private checkJurisdictionSpecificCompliance;
    private checkContractLawCompliance;
    private checkDisclosureRequirements;
    private extractContractValue;
    private hasWrittenSignature;
    private hasCapacityAcknowledgment;
    private initializeComplianceRules;
    private initializeJurisdictionRules;
}
//# sourceMappingURL=LegalComplianceChecker.d.ts.map