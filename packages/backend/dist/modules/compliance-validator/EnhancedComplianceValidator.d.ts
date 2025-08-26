import { ComplianceRule, ComplianceCheckResult } from '../../models/knowledge/ComplianceRule';
import { ParsedContent } from '../../models/core/ParsedContent';
import { DatabaseRulesEngine } from './DatabaseRulesEngine';
import { ComplianceRepository } from '../../database/interfaces/ComplianceRepository';
/**
 * Enhanced compliance validator with database persistence,
 * advanced rule matching, and comprehensive violation tracking
 */
export declare class EnhancedComplianceValidator {
    private repository;
    private rulesEngine;
    private hipaaChecker;
    private soxChecker;
    private gdprChecker;
    constructor(repository: ComplianceRepository, rulesEngine?: DatabaseRulesEngine);
    validateCompliance(content: ParsedContent, domain: 'legal' | 'financial' | 'healthcare' | 'insurance', jurisdiction?: string, sessionId?: string): Promise<ComplianceCheckResult>;
    private checkGeneralCompliance;
    private checkRuleViolations;
    private checkIndustrySpecificCompliance;
    private checkSemanticCompliance;
    private checkRequiredDisclosures;
    private checkContradictoryStatements;
    private findKeywordMatches;
    private findPatternMatches;
    private extractContext;
    private assessContextualRisk;
    private calculatePatternConfidence;
    private calculateOverallRisk;
    private calculateComplianceScore;
    private recordViolations;
    addRule(rule: Omit<ComplianceRule, 'id'>): Promise<ComplianceRule>;
    updateRule(ruleId: string, updates: Partial<ComplianceRule>): Promise<ComplianceRule>;
    getViolationStats(domain?: string, timeRange?: {
        start: Date;
        end: Date;
    }): Promise<{
        totalViolations: number;
        violationsBySeverity: Record<string, number>;
        violationsByRule: Record<string, number>;
        trendsOverTime: Array<{
            date: Date;
            count: number;
        }>;
    }>;
}
//# sourceMappingURL=EnhancedComplianceValidator.d.ts.map