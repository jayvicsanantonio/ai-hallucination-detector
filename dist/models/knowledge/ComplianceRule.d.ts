import { Domain, IssueSeverity } from '../core/ContentTypes';
export interface ComplianceRule {
    id: string;
    ruleText: string;
    regulation: string;
    jurisdiction: string;
    domain: Domain;
    severity: IssueSeverity;
    examples: string[];
    lastUpdated: Date;
    isActive: boolean;
    tags?: string[];
}
//# sourceMappingURL=ComplianceRule.d.ts.map