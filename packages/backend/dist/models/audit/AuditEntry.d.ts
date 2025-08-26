export interface AuditEntry {
    id: string;
    sessionId: string;
    timestamp: Date;
    action: AuditAction;
    component: string;
    details: Record<string, any>;
    userId?: string;
    organizationId?: string;
    ipAddress?: string;
    userAgent?: string;
    duration?: number;
    success: boolean;
    errorMessage?: string;
    severity: AuditSeverity;
}
export type AuditAction = 'session_created' | 'content_uploaded' | 'content_parsed' | 'verification_started' | 'verification_completed' | 'verification_failed' | 'issue_detected' | 'feedback_submitted' | 'results_accessed' | 'export_requested' | 'user_authenticated' | 'user_authorized' | 'configuration_changed' | 'system_error' | 'security_event' | 'system_maintenance' | 'compliance_check_started' | 'compliance_check_completed' | 'compliance_check_failed' | 'violation_detected' | 'violation_resolved' | 'rule_applied' | 'rule_skipped' | 'rule_created' | 'rule_updated' | 'rule_deleted' | 'compliance_report_generated' | 'compliance_report_exported' | 'compliance_report_accessed' | 'compliance_report_started' | 'compliance_report_failed' | 'remediation_started' | 'remediation_completed' | 'regulatory_reference_accessed' | 'compliance_threshold_exceeded' | 'compliance_policy_updated' | 'compliance_training_completed';
export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';
export interface AuditQuery {
    sessionId?: string;
    userId?: string;
    organizationId?: string;
    action?: AuditAction;
    component?: string;
    severity?: AuditSeverity;
    startDate?: Date;
    endDate?: Date;
    success?: boolean;
    limit?: number;
    offset?: number;
}
export interface AuditSummary {
    totalEntries: number;
    successfulActions: number;
    failedActions: number;
    uniqueUsers: number;
    uniqueSessions: number;
    actionCounts: Record<AuditAction, number>;
    severityCounts: Record<AuditSeverity, number>;
    timeRange: {
        earliest: Date;
        latest: Date;
    };
}
//# sourceMappingURL=AuditEntry.d.ts.map