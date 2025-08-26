import { AuditRepository } from '../../database/interfaces/AuditRepository';
import { AuditEntry, AuditSeverity } from '../../models/audit/AuditEntry';
import { ComplianceViolation, ComplianceRule } from '../../models/knowledge/ComplianceRule';
export interface ComplianceAuditEvent {
    sessionId: string;
    userId?: string;
    organizationId?: string;
    action: ComplianceAuditAction;
    details: Record<string, any>;
    severity?: AuditSeverity;
    ipAddress?: string;
    userAgent?: string;
}
export type ComplianceAuditAction = 'compliance_check_started' | 'compliance_check_completed' | 'compliance_check_failed' | 'violation_detected' | 'violation_resolved' | 'rule_applied' | 'rule_skipped' | 'rule_created' | 'rule_updated' | 'rule_deleted' | 'compliance_report_generated' | 'compliance_report_exported' | 'compliance_report_accessed' | 'remediation_started' | 'remediation_completed' | 'regulatory_reference_accessed' | 'compliance_threshold_exceeded' | 'compliance_policy_updated' | 'compliance_training_completed';
export interface ComplianceAuditQuery {
    sessionId?: string;
    userId?: string;
    organizationId?: string;
    action?: ComplianceAuditAction;
    ruleId?: string;
    regulation?: string;
    domain?: string;
    severity?: AuditSeverity;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}
export interface ComplianceAuditSummary {
    totalEvents: number;
    eventsByAction: Record<ComplianceAuditAction, number>;
    eventsBySeverity: Record<AuditSeverity, number>;
    violationEvents: number;
    remediationEvents: number;
    ruleManagementEvents: number;
    reportingEvents: number;
    timeRange: {
        earliest: Date;
        latest: Date;
    };
    topRules: Array<{
        ruleId: string;
        regulation: string;
        eventCount: number;
    }>;
    topUsers: Array<{
        userId: string;
        eventCount: number;
    }>;
}
/**
 * Specialized audit logger for compliance-related activities
 * Provides detailed tracking of compliance checks, violations, and remediation
 */
export declare class ComplianceAuditLogger {
    private auditRepository;
    constructor(auditRepository: AuditRepository);
    /**
     * Log the start of a compliance check
     */
    logComplianceCheckStarted(sessionId: string, domain: string, jurisdiction: string, rulesCount: number, userId?: string, organizationId?: string): Promise<void>;
    /**
     * Log the completion of a compliance check
     */
    logComplianceCheckCompleted(sessionId: string, violationsCount: number, complianceScore: number, overallRisk: string, processingTimeMs: number, userId?: string, organizationId?: string): Promise<void>;
    /**
     * Log a compliance check failure
     */
    logComplianceCheckFailed(sessionId: string, error: string, stage: string, userId?: string, organizationId?: string): Promise<void>;
    /**
     * Log detection of a compliance violation
     */
    logViolationDetected(sessionId: string, violation: ComplianceViolation, userId?: string, organizationId?: string): Promise<void>;
    /**
     * Log application of a compliance rule
     */
    logRuleApplied(sessionId: string, rule: ComplianceRule, matchesFound: number, userId?: string, organizationId?: string): Promise<void>;
    /**
     * Log skipping of a compliance rule
     */
    logRuleSkipped(sessionId: string, rule: ComplianceRule, reason: string, userId?: string, organizationId?: string): Promise<void>;
    /**
     * Log creation of a new compliance rule
     */
    logRuleCreated(rule: ComplianceRule, userId?: string, organizationId?: string): Promise<void>;
    /**
     * Log update of a compliance rule
     */
    logRuleUpdated(ruleId: string, updates: Partial<ComplianceRule>, userId?: string, organizationId?: string): Promise<void>;
    /**
     * Log deletion of a compliance rule
     */
    logRuleDeleted(ruleId: string, regulation: string, userId?: string, organizationId?: string): Promise<void>;
    /**
     * Log generation of a compliance report
     */
    logReportGenerated(sessionId: string, reportId: string, reportType: string, violationsCount: number, userId?: string, organizationId?: string): Promise<void>;
    /**
     * Log export of a compliance report
     */
    logReportExported(sessionId: string, reportId: string, format: string, userId?: string, organizationId?: string): Promise<void>;
    /**
     * Log start of remediation process
     */
    logRemediationStarted(sessionId: string, violationId: string, remediationPlan: any, userId?: string, organizationId?: string): Promise<void>;
    /**
     * Log completion of remediation
     */
    logRemediationCompleted(sessionId: string, violationId: string, resolutionDetails: string, userId?: string, organizationId?: string): Promise<void>;
    /**
     * Log when compliance thresholds are exceeded
     */
    logThresholdExceeded(sessionId: string, threshold: string, currentValue: number, thresholdValue: number, userId?: string, organizationId?: string): Promise<void>;
    /**
     * Query compliance audit events
     */
    queryEvents(query: ComplianceAuditQuery): Promise<AuditEntry[]>;
    /**
     * Generate compliance audit summary
     */
    generateAuditSummary(query: Omit<ComplianceAuditQuery, 'limit' | 'offset'>): Promise<ComplianceAuditSummary>;
    private logEvent;
    private sanitizeUpdates;
}
//# sourceMappingURL=ComplianceAuditLogger.d.ts.map