import { ComplianceRule } from '../../models/knowledge/ComplianceRule';
import { ComplianceRepository } from '../../database/interfaces/ComplianceRepository';
/**
 * Database-backed rules engine that extends the in-memory RulesEngine
 * with persistent storage and advanced rule management capabilities
 */
export declare class DatabaseRulesEngine {
    private repository;
    constructor(repository: ComplianceRepository);
    getApplicableRules(domain: 'legal' | 'financial' | 'healthcare' | 'insurance', jurisdiction?: string): Promise<ComplianceRule[]>;
    addRule(rule: Omit<ComplianceRule, 'id'>): Promise<ComplianceRule>;
    updateRule(ruleId: string, updates: Partial<ComplianceRule>): Promise<ComplianceRule>;
    deactivateRule(ruleId: string): Promise<void>;
    deleteRule(ruleId: string): Promise<void>;
    getRuleById(ruleId: string): Promise<ComplianceRule | null>;
    getAllRules(): Promise<ComplianceRule[]>;
    /**
     * Bulk import rules from a configuration file or external source
     */
    importRules(rules: Omit<ComplianceRule, 'id'>[]): Promise<ComplianceRule[]>;
    /**
     * Validate rule configuration before adding/updating
     */
    validateRule(rule: Partial<ComplianceRule>): {
        isValid: boolean;
        errors: string[];
    };
    /**
     * Get rules that need updates based on regulation changes
     */
    getOutdatedRules(maxAge?: number): Promise<ComplianceRule[]>;
    /**
     * Clone a rule for modification (useful for creating variations)
     */
    cloneRule(ruleId: string, modifications: Partial<ComplianceRule>): Promise<ComplianceRule>;
}
//# sourceMappingURL=DatabaseRulesEngine.d.ts.map