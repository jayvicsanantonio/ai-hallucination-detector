import { FactualClaim } from '../../models/knowledge/FactualClaim';
import { ComplianceRule } from '../../models/knowledge/ComplianceRule';
export interface KnowledgeBaseRepository {
    /**
     * Get verification result for knowledge base updates
     */
    getVerificationResult(verificationId: string): Promise<any>;
    /**
     * Create or update factual claim
     */
    createOrUpdateFactualClaim(claim: Partial<FactualClaim>): Promise<FactualClaim>;
    /**
     * Find compliance rule by issue
     */
    findComplianceRuleByIssue(issue: any): Promise<ComplianceRule | null>;
    /**
     * Update compliance rule
     */
    updateComplianceRule(ruleId: string, updates: Partial<ComplianceRule>): Promise<ComplianceRule>;
    /**
     * Reinforce factual claim confidence
     */
    reinforceFactualClaim(evidence: string[]): Promise<void>;
    /**
     * Reinforce compliance rule confidence
     */
    reinforceComplianceRule(ruleId: string): Promise<void>;
    /**
     * Create pattern-based rule
     */
    createPatternRule(rule: {
        pattern: string;
        context: string;
        confidence: number;
        domain: string;
        createdFrom: string;
        userId: string;
    }): Promise<void>;
}
export declare class KnowledgeBaseRepository implements KnowledgeBaseRepository {
    private factualClaims;
    private complianceRules;
    private verificationResults;
}
//# sourceMappingURL=KnowledgeBaseRepository.d.ts.map