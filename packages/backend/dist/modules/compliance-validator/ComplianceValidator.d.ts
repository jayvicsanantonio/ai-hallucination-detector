import { ComplianceCheckResult } from '../../models/knowledge/ComplianceRule';
import { ParsedContent } from '../../models/core/ParsedContent';
import { RulesEngine } from './RulesEngine';
export declare class ComplianceValidator {
    private rulesEngine;
    private hipaaChecker;
    private soxChecker;
    private gdprChecker;
    constructor(rulesEngine: RulesEngine);
    validateCompliance(content: ParsedContent, domain: 'legal' | 'financial' | 'healthcare' | 'insurance', jurisdiction?: string): Promise<ComplianceCheckResult>;
    private checkGeneralCompliance;
    private checkRuleViolations;
    private checkIndustrySpecificCompliance;
    private findKeywordMatches;
    private findPatternMatches;
    private calculateOverallRisk;
    private calculateComplianceScore;
}
//# sourceMappingURL=ComplianceValidator.d.ts.map