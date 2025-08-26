import { ParsedContent } from '@/models/core/ParsedContent';
import { Issue } from '@/models/core/VerificationResult';
import { DomainRule, ComplianceResult } from '@/modules/interfaces/DomainModule';
import { FinancialData } from './FinancialModule';
export declare class FinancialComplianceChecker {
    private rules;
    private regulationRules;
    constructor();
    checkFinancialCompliance(content: ParsedContent, financialData: FinancialData[]): Promise<Issue[]>;
    checkRegulationCompliance(content: string, regulations: string[]): Promise<ComplianceResult>;
    updateRules(newRules: DomainRule[]): Promise<void>;
    private checkGeneralCompliance;
    private checkSOXCompliance;
    private checkGAAPCompliance;
    private checkSECCompliance;
    private checkDisclosureRequirements;
    private checkRiskManagementCompliance;
    private containsInvestmentAdvice;
    private containsRecommendations;
    private isPublicCompanyDocument;
    private isFinancialStatement;
    private isSECFiling;
    private initializeComplianceRules;
    private initializeRegulationRules;
}
//# sourceMappingURL=FinancialComplianceChecker.d.ts.map