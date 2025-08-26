import { ParsedContent } from '@/models/core/ParsedContent';
import { Issue } from '@/models/core/VerificationResult';
import { DomainRule, ValidationResult } from '@/modules/interfaces/DomainModule';
import { MedicalData } from './HealthcareModule';
export declare class MedicalAccuracyValidator {
    private rules;
    private knownMedications;
    private knownConditions;
    constructor();
    validateMedicalAccuracy(content: ParsedContent, medicalData: MedicalData[]): Promise<Issue[]>;
    validateMedicalData(medicalData: MedicalData[]): Promise<ValidationResult>;
    updateRules(newRules: DomainRule[]): Promise<void>;
    private validateMedications;
    private validateMedicalConditions;
    private validateVitalSigns;
    private validateMedicalProcedures;
    private checkContraindications;
    private validateDosageRange;
    private validateVitalSignRange;
    private initializeMedicalRules;
    private initializeKnownMedications;
    private initializeKnownConditions;
}
//# sourceMappingURL=MedicalAccuracyValidator.d.ts.map