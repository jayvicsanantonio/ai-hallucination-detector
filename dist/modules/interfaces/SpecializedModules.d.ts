import { DomainModule, ValidationResult, ComplianceResult } from './DomainModule';
import { ParsedContent } from '@/models/core/ParsedContent';
export interface LegalModule extends DomainModule {
    validateContractTerms(terms: ContractTerm[]): Promise<ValidationResult>;
    checkLegalCompliance(content: string, jurisdiction: string): Promise<ComplianceResult>;
    analyzeContractRisks(content: ParsedContent): Promise<RiskAnalysisResult>;
}
export interface ContractTerm {
    id: string;
    type: 'clause' | 'condition' | 'obligation' | 'right';
    text: string;
    location: {
        start: number;
        end: number;
    };
    importance: 'low' | 'medium' | 'high' | 'critical';
}
export interface FinancialModule extends DomainModule {
    validateNumericalAccuracy(calculations: Calculation[]): Promise<ValidationResult>;
    checkRegulatoryCompliance(content: string, regulations: string[]): Promise<ComplianceResult>;
    analyzeFinancialRisks(content: ParsedContent): Promise<RiskAnalysisResult>;
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
    context: string;
}
export interface HealthcareModule extends DomainModule {
    validateMedicalAccuracy(content: string): Promise<ValidationResult>;
    checkHIPAACompliance(content: string): Promise<ComplianceResult>;
    analyzeMedicalRisks(content: ParsedContent): Promise<RiskAnalysisResult>;
    validateDosageInformation(dosages: DosageInfo[]): Promise<ValidationResult>;
}
export interface DosageInfo {
    id: string;
    medication: string;
    dosage: string;
    frequency: string;
    route: string;
    location: {
        start: number;
        end: number;
    };
    patientContext?: string;
}
export interface RiskAnalysisResult {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    riskFactors: RiskFactor[];
    recommendations: string[];
    confidence: number;
}
export interface RiskFactor {
    id: string;
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    likelihood: number;
    impact: number;
    mitigation?: string;
}
//# sourceMappingURL=SpecializedModules.d.ts.map