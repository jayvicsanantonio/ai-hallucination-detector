import { AuditEntry, AuditAction, AuditSeverity, AuditQuery, AuditSummary } from '../../models/audit';
import { AuditRepository } from '../../database/interfaces/AuditRepository';
import { Logger } from '../../utils/Logger';
export interface AuditLoggerConfig {
    enableStructuredLogging: boolean;
    enableConsoleOutput: boolean;
    enableFileOutput: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    batchSize: number;
    flushInterval: number;
    retentionDays: number;
}
export interface AuditContext {
    sessionId: string;
    userId?: string;
    organizationId?: string;
    ipAddress?: string;
    userAgent?: string;
}
export declare class AuditLogger {
    private auditRepository;
    private logger;
    private config;
    private pendingEntries;
    private flushTimer?;
    constructor(auditRepository: AuditRepository, logger: Logger, config: AuditLoggerConfig);
    /**
     * Log an audit entry with structured logging
     */
    logEntry(action: AuditAction, component: string, context: AuditContext, details?: Record<string, any>, options?: {
        severity?: AuditSeverity;
        success?: boolean;
        errorMessage?: string;
        duration?: number;
    }): Promise<void>;
    /**
     * Log session creation
     */
    logSessionCreated(context: AuditContext, details: {
        domain: string;
        contentType: string;
    }): Promise<void>;
    /**
     * Log content processing events
     */
    logContentProcessing(context: AuditContext, stage: 'uploaded' | 'parsed', details: {
        contentSize?: number;
        format?: string;
        processingTime?: number;
    }): Promise<void>;
    /**
     * Log verification events
     */
    logVerification(context: AuditContext, stage: 'started' | 'completed' | 'failed', details: {
        modules?: string[];
        issuesFound?: number;
        confidence?: number;
        processingTime?: number;
        errorMessage?: string;
    }): Promise<void>;
    /**
     * Log issue detection
     */
    logIssueDetected(context: AuditContext, details: {
        issueType: string;
        severity: AuditSeverity;
        module: string;
        confidence: number;
        location?: string;
    }): Promise<void>;
    /**
     * Log compliance events
     */
    logComplianceEvent(context: AuditContext, event: 'check_started' | 'check_completed' | 'violation_detected' | 'rule_applied', details: {
        ruleId?: string;
        regulation?: string;
        violationType?: string;
        severity?: AuditSeverity;
    }): Promise<void>;
    /**
     * Log security events
     */
    logSecurityEvent(context: AuditContext, event: 'authentication' | 'authorization' | 'access_denied' | 'suspicious_activity', details: Record<string, any>): Promise<void>;
    /**
     * Log system errors
     */
    logSystemError(context: AuditContext, component: string, error: Error, details?: Record<string, any>): Promise<void>;
    /**
     * Query audit entries
     */
    queryEntries(query: AuditQuery): Promise<AuditEntry[]>;
    /**
     * Get audit summary for organization
     */
    getAuditSummary(organizationId: string, startDate?: Date, endDate?: Date): Promise<AuditSummary>;
    /**
     * Generate audit report
     */
    generateAuditReport(organizationId: string, startDate: Date, endDate: Date, format?: 'json' | 'csv'): Promise<string>;
    /**
     * Flush pending entries to database
     */
    flush(): Promise<void>;
    /**
     * Cleanup old audit data based on retention policy
     */
    cleanupOldData(organizationId: string, retentionYears: number): Promise<number>;
    /**
     * Shutdown audit logger gracefully
     */
    shutdown(): Promise<void>;
    private startFlushTimer;
    private logStructured;
    private generateCSVReport;
    private generateId;
}
//# sourceMappingURL=AuditLogger.d.ts.map