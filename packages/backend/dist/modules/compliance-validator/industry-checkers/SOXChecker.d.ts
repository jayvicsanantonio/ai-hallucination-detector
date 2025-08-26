import { ComplianceViolation } from '../../../models/knowledge/ComplianceRule';
import { ParsedContent } from '../../../models/core/ParsedContent';
export declare class SOXChecker {
    private readonly FINANCIAL_PATTERNS;
    private readonly SOX_KEYWORDS;
    checkCompliance(content: ParsedContent): Promise<ComplianceViolation[]>;
    private extractContext;
    private assessKeywordRisk;
    private checkNumericalConsistency;
    private isFinancialContext;
}
//# sourceMappingURL=SOXChecker.d.ts.map