"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogger = void 0;
class AuditLogger {
    constructor(auditRepository, logger, config) {
        this.pendingEntries = [];
        this.auditRepository = auditRepository;
        this.logger = logger;
        this.config = config;
        this.startFlushTimer();
    }
    /**
     * Log an audit entry with structured logging
     */
    async logEntry(action, component, context, details = {}, options = {}) {
        const entry = {
            id: this.generateId(),
            sessionId: context.sessionId,
            timestamp: new Date(),
            action,
            component,
            details,
            userId: context.userId,
            organizationId: context.organizationId,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            duration: options.duration,
            success: options.success ?? true,
            errorMessage: options.errorMessage,
            severity: options.severity ?? 'info',
        };
        // Add to pending batch
        this.pendingEntries.push(entry);
        // Structured logging
        if (this.config.enableStructuredLogging) {
            this.logStructured(entry);
        }
        // Immediate flush for critical entries
        if (entry.severity === 'critical' || !entry.success) {
            await this.flush();
        }
        // Flush if batch size reached
        if (this.pendingEntries.length >= this.config.batchSize) {
            await this.flush();
        }
    }
    /**
     * Log session creation
     */
    async logSessionCreated(context, details) {
        await this.logEntry('session_created', 'VerificationEngine', context, details);
    }
    /**
     * Log content processing events
     */
    async logContentProcessing(context, stage, details) {
        const action = stage === 'uploaded' ? 'content_uploaded' : 'content_parsed';
        await this.logEntry(action, 'ContentProcessor', context, details, {
            duration: details.processingTime,
        });
    }
    /**
     * Log verification events
     */
    async logVerification(context, stage, details) {
        const actionMap = {
            started: 'verification_started',
            completed: 'verification_completed',
            failed: 'verification_failed',
        };
        await this.logEntry(actionMap[stage], 'VerificationEngine', context, details, {
            success: stage !== 'failed',
            errorMessage: details.errorMessage,
            duration: details.processingTime,
            severity: stage === 'failed' ? 'error' : 'info',
        });
    }
    /**
     * Log issue detection
     */
    async logIssueDetected(context, details) {
        await this.logEntry('issue_detected', details.module, context, details, {
            severity: details.severity,
        });
    }
    /**
     * Log compliance events
     */
    async logComplianceEvent(context, event, details) {
        const actionMap = {
            check_started: 'compliance_check_started',
            check_completed: 'compliance_check_completed',
            violation_detected: 'violation_detected',
            rule_applied: 'rule_applied',
        };
        await this.logEntry(actionMap[event], 'ComplianceValidator', context, details, {
            severity: event === 'violation_detected'
                ? details.severity ?? 'warning'
                : 'info',
        });
    }
    /**
     * Log security events
     */
    async logSecurityEvent(context, event, details) {
        const severity = event === 'access_denied' || event === 'suspicious_activity'
            ? 'warning'
            : 'info';
        await this.logEntry('security_event', 'SecurityManager', context, { event, ...details }, {
            severity,
            success: event !== 'access_denied',
        });
    }
    /**
     * Log system errors
     */
    async logSystemError(context, component, error, details = {}) {
        await this.logEntry('system_error', component, context, {
            errorName: error.name,
            errorStack: error.stack,
            ...details,
        }, {
            success: false,
            errorMessage: error.message,
            severity: 'error',
        });
    }
    /**
     * Query audit entries
     */
    async queryEntries(query) {
        return this.auditRepository.queryAuditEntries(query);
    }
    /**
     * Get audit summary for organization
     */
    async getAuditSummary(organizationId, startDate, endDate) {
        return this.auditRepository.getAuditSummary(organizationId, startDate, endDate);
    }
    /**
     * Generate audit report
     */
    async generateAuditReport(organizationId, startDate, endDate, format = 'json') {
        const entries = await this.queryEntries({
            organizationId,
            startDate,
            endDate,
            limit: 10000, // Reasonable limit for reports
        });
        const summary = await this.getAuditSummary(organizationId, startDate, endDate);
        if (format === 'csv') {
            return this.generateCSVReport(entries, summary);
        }
        return JSON.stringify({
            summary,
            entries,
            generatedAt: new Date(),
            period: { startDate, endDate },
        }, null, 2);
    }
    /**
     * Flush pending entries to database
     */
    async flush() {
        if (this.pendingEntries.length === 0) {
            return;
        }
        const entries = [...this.pendingEntries];
        this.pendingEntries = [];
        try {
            await this.auditRepository.createAuditEntriesBatch(entries);
            this.logger.debug(`Flushed ${entries.length} audit entries to database`);
        }
        catch (error) {
            this.logger.error('Failed to flush audit entries', {
                error,
                entryCount: entries.length,
            });
            // Re-add entries to pending queue for retry
            this.pendingEntries.unshift(...entries);
            throw error;
        }
    }
    /**
     * Cleanup old audit data based on retention policy
     */
    async cleanupOldData(organizationId, retentionYears) {
        try {
            const deletedCount = await this.auditRepository.cleanupExpiredAuditData(organizationId, retentionYears);
            await this.logEntry('system_maintenance', 'AuditLogger', {
                sessionId: 'system',
                organizationId,
            }, {
                action: 'cleanup_old_data',
                deletedCount,
                retentionYears,
            });
            return deletedCount;
        }
        catch (error) {
            this.logger.error('Failed to cleanup old audit data', {
                error,
                organizationId,
            });
            throw error;
        }
    }
    /**
     * Shutdown audit logger gracefully
     */
    async shutdown() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
        await this.flush();
    }
    startFlushTimer() {
        this.flushTimer = setInterval(async () => {
            try {
                await this.flush();
            }
            catch (error) {
                this.logger.error('Scheduled flush failed', { error });
            }
        }, this.config.flushInterval);
    }
    logStructured(entry) {
        const logData = {
            auditId: entry.id,
            sessionId: entry.sessionId,
            action: entry.action,
            component: entry.component,
            userId: entry.userId,
            organizationId: entry.organizationId,
            success: entry.success,
            severity: entry.severity,
            duration: entry.duration,
            details: entry.details,
        };
        switch (entry.severity) {
            case 'critical':
            case 'error':
                this.logger.error(`Audit: ${entry.action}`, logData);
                break;
            case 'warning':
                this.logger.warn(`Audit: ${entry.action}`, logData);
                break;
            default:
                this.logger.info(`Audit: ${entry.action}`, logData);
        }
    }
    generateCSVReport(entries, summary) {
        const headers = [
            'Timestamp',
            'Action',
            'Component',
            'User ID',
            'Success',
            'Severity',
            'Duration (ms)',
            'Details',
        ];
        const rows = entries.map((entry) => [
            entry.timestamp.toISOString(),
            entry.action,
            entry.component,
            entry.userId || '',
            entry.success.toString(),
            entry.severity,
            entry.duration?.toString() || '',
            JSON.stringify(entry.details),
        ]);
        const csvContent = [
            headers.join(','),
            ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')),
        ].join('\n');
        return csvContent;
    }
    generateId() {
        return `audit_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`;
    }
}
exports.AuditLogger = AuditLogger;
//# sourceMappingURL=AuditLogger.js.map