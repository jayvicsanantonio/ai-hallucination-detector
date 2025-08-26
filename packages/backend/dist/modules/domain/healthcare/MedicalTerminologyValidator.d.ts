import { ParsedContent } from '@/models/core/ParsedContent';
import { Issue } from '@/models/core/VerificationResult';
import { DomainRule } from '@/modules/interfaces/DomainModule';
import { MedicalData } from './HealthcareModule';
export declare class MedicalTerminologyValidator {
    private rules;
    private medicalTerms;
    private drugInteractions;
    constructor();
    validateTerminology(content: ParsedContent, medicalData: MedicalData[]): Promise<Issue[]>;
    updateRules(newRules: DomainRule[]): Promise<void>;
    private validateMedicalTerms;
    private validateDosageFormats;
    private checkTerminologyConsistency;
    private validateMedicalAbbreviations;
    private checkDeprecatedTerms;
    private validateDosageFormat;
    private findSimilarTerm;
    private calculateSimilarity;
    private levenshteinDistance;
    private initializeTerminologyRules;
    private initializeMedicalTerms;
    private initializeDrugInteractions;
}
//# sourceMappingURL=MedicalTerminologyValidator.d.ts.map