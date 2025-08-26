import { ComplianceRule } from '../../models/knowledge/ComplianceRule';
export declare class RulesEngine {
    private rules;
    constructor();
    getApplicableRules(domain: 'legal' | 'financial' | 'healthcare' | 'insurance', jurisdiction?: string): Promise<ComplianceRule[]>;
    addRule(rule: ComplianceRule): Promise<void>;
    updateRule(ruleId: string, updates: Partial<ComplianceRule>): Promise<void>;
    deactivateRule(ruleId: string): Promise<void>;
    private initializeDefaultRules;
    getRuleById(ruleId: string): Promise<ComplianceRule | null>;
    getAllRules(): Promise<ComplianceRule[]>;
}
//# sourceMappingURL=RulesEngine.d.ts.map