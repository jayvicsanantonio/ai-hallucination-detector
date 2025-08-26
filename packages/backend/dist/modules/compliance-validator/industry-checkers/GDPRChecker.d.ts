import { ComplianceViolation } from '../../../models/knowledge/ComplianceRule';
import { ParsedContent } from '../../../models/core/ParsedContent';
export declare class GDPRChecker {
    private readonly GDPR_PATTERNS;
    private readonly PERSONAL_DATA_INDICATORS;
    private readonly GDPR_RIGHTS_KEYWORDS;
    checkCompliance(content: ParsedContent): Promise<ComplianceViolation[]>;
    private extractContext;
    private assessPersonalDataRisk;
    private checkDataSubjectRights;
    private checkDataTransfers;
}
//# sourceMappingURL=GDPRChecker.d.ts.map