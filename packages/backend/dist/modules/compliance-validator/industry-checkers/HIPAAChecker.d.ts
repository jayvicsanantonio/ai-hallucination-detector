import { ComplianceViolation } from '../../../models/knowledge/ComplianceRule';
import { ParsedContent } from '../../../models/core/ParsedContent';
export declare class HIPAAChecker {
    private readonly PHI_PATTERNS;
    private readonly PHI_KEYWORDS;
    checkCompliance(content: ParsedContent): Promise<ComplianceViolation[]>;
    private extractContext;
    private isPotentialPHIContext;
}
//# sourceMappingURL=HIPAAChecker.d.ts.map