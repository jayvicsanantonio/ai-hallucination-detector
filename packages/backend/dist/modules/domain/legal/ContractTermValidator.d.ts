import { ParsedContent } from '@/models/core/ParsedContent';
import { Issue } from '@/models/core/VerificationResult';
import { DomainRule, ValidationResult } from '@/modules/interfaces/DomainModule';
import { ContractTerm, LegalEntity } from './LegalModule';
export declare class ContractTermValidator {
    private rules;
    constructor();
    validateContractTerms(content: ParsedContent, legalEntities: LegalEntity[]): Promise<Issue[]>;
    validateTerms(terms: ContractTerm[]): Promise<ValidationResult>;
    updateRules(newRules: DomainRule[]): Promise<void>;
    private extractContractTerms;
    private validateEssentialElements;
    private validateParties;
    private validateConsideration;
    private validateTerminationClauses;
    private validateLegalCapacity;
    private validateTermSpecificRequirements;
    private hasSpecificAmount;
    private hasCapacityIndicators;
    private isValidPartyIdentification;
    private isValidConsideration;
    private initializeContractRules;
}
//# sourceMappingURL=ContractTermValidator.d.ts.map