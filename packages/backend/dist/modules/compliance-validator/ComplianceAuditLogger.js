"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceAuditLogger = void 0;
/**
 * Specialized audit logger for compliance-related activities
 * Provides detailed tracking of compliance checks, violations, and remediation
 */
class ComplianceAuditLogger {
    constructor(auditRepository) {
        this.auditRepository = auditRepository;
    }
    /**
     * Log the start of a compliance check
     */
    async logComplianceCheckStarted(sessionId, domain, jurisdiction, rulesCount, userId, organizationId) {
        await this.logEvent({
            sessionId,
            userId,
            organizationId,
            action: 'compliance_check_started',
            details: {
                domain,
                jurisdiction,
                rulesCount,
                timestamp: new Date().toISOString(),
            },
            severity: 'info',
        });
    }
    /**
     * Log the completion of a compliance check
     */
    async logComplianceCheckCompleted(sessionId, violationsCount, complianceScore, overallRisk, processingTimeMs, userId, organizationId) {
        const severity = overallRisk === 'critical'
            ? 'critical'
            : overallRisk === 'high'
                ? 'error'
                : overallRisk === 'medium'
                    ? 'warning'
                    : 'info';
        await this.logEvent({
            sessionId,
            userId,
            organizationId,
            action: 'compliance_check_completed',
            details: {
                violationsCount,
                complianceScore,
                overallRisk,
                processingTimeMs,
                timestamp: new Date().toISOString(),
            },
            severity,
        });
    }
    /**
     * Log a compliance check failure
     */
    async logComplianceCheckFailed(sessionId, error, stage, userId, organizationId) {
        await this.logEvent({
            sessionId,
            userId,
            organizationId,
            action: 'compliance_check_failed',
            details: {
                error,
                stage,
                timestamp: new Date().toISOString(),
            },
            severity: 'error',
        });
    }
    /**
     * Log detection of a compliance violation
     */
    async logViolationDetected(sessionId, violation, userId, organizationId) {
        const severity = violation.severity === 'critical'
            ? 'critical'
            : violation.severity === 'high'
                ? 'error'
                : violation.severity === 'medium'
                    ? 'warning'
                    : 'info';
        await this.logEvent({
            sessionId,
            userId,
            organizationId,
            action: 'violation_detected',
            details: {
                ruleId: violation.ruleId,
                regulation: violation.rule.regulation,
                violationType: violation.violationType,
                severity: violation.severity,
                confidence: violation.confidence,
                location: violation.location,
                description: violation.description,
                regulatoryReference: violation.regulatoryReference,
                timestamp: new Date().toISOString(),
            },
            severity,
        });
    }
    /**
     * Log application of a compliance rule
     */
    async logRuleApplied(sessionId, rule, matchesFound, userId, organizationId) {
        await this.logEvent({
            sessionId,
            userId,
            organizationId,
            action: 'rule_applied',
            details: {
                ruleId: rule.id,
                regulation: rule.regulation,
                domain: rule.domain,
                jurisdiction: rule.jurisdiction,
                severity: rule.severity,
                matchesFound,
                timestamp: new Date().toISOString(),
            },
            severity: 'info',
        });
    }
    /**
     * Log skipping of a compliance rule
     */
    async logRuleSkipped(sessionId, rule, reason, userId, organizationId) {
        await this.logEvent({
            sessionId,
            userId,
            organizationId,
            action: 'rule_skipped',
            details: {
                ruleId: rule.id,
                regulation: rule.regulation,
                reason,
                timestamp: new Date().toISOString(),
            },
            severity: 'info',
        });
    }
    /**
     * Log creation of a new compliance rule
     */
    async logRuleCreated(rule, userId, organizationId) {
        await this.logEvent({
            sessionId: `rule-management-${Date.now()}`,
            userId,
            organizationId,
            action: 'rule_created',
            details: {
                ruleId: rule.id,
                regulation: rule.regulation,
                domain: rule.domain,
                jurisdiction: rule.jurisdiction,
                severity: rule.severity,
                keywordsCount: rule.keywords.length,
                patternsCount: rule.patterns.length,
                timestamp: new Date().toISOString(),
            },
            severity: 'info',
        });
    }
    /**
     * Log update of a compliance rule
     */
    async logRuleUpdated(ruleId, updates, userId, organizationId) {
        await this.logEvent({
            sessionId: `rule-management-${Date.now()}`,
            userId,
            organizationId,
            action: 'rule_updated',
            details: {
                ruleId,
                updatedFields: Object.keys(updates),
                updates: this.sanitizeUpdates(updates),
                timestamp: new Date().toISOString(),
            },
            severity: 'info',
        });
    }
    /**
     * Log deletion of a compliance rule
     */
    async logRuleDeleted(ruleId, regulation, userId, organizationId) {
        await this.logEvent({
            sessionId: `rule-management-${Date.now()}`,
            userId,
            organizationId,
            action: 'rule_deleted',
            details: {
                ruleId,
                regulation,
                timestamp: new Date().toISOString(),
            },
            severity: 'warning',
        });
    }
    /**
     * Log generation of a compliance report
     */
    async logReportGenerated(sessionId, reportId, reportType, violationsCount, userId, organizationId) {
        await this.logEvent({
            sessionId,
            userId,
            organizationId,
            action: 'compliance_report_generated',
            details: {
                reportId,
                reportType,
                violationsCount,
                timestamp: new Date().toISOString(),
            },
            severity: 'info',
        });
    }
    /**
     * Log export of a compliance report
     */
    async logReportExported(sessionId, reportId, format, userId, organizationId) {
        await this.logEvent({
            sessionId,
            userId,
            organizationId,
            action: 'compliance_report_exported',
            details: {
                reportId,
                format,
                timestamp: new Date().toISOString(),
            },
            severity: 'info',
        });
    }
    /**
     * Log start of remediation process
     */
    async logRemediationStarted(sessionId, violationId, remediationPlan, userId, organizationId) {
        await this.logEvent({
            sessionId,
            userId,
            organizationId,
            action: 'remediation_started',
            details: {
                violationId,
                priority: remediationPlan.priority,
                estimatedEffort: remediationPlan.estimatedEffort,
                actionsCount: remediationPlan.suggestedActions?.length || 0,
                timestamp: new Date().toISOString(),
            },
            severity: 'info',
        });
    }
    /**
     * Log completion of remediation
     */
    async logRemediationCompleted(sessionId, violationId, resolutionDetails, userId, organizationId) {
        await this.logEvent({
            sessionId,
            userId,
            organizationId,
            action: 'remediation_completed',
            details: {
                violationId,
                resolutionDetails,
                timestamp: new Date().toISOString(),
            },
            severity: 'info',
        });
    }
    /**
     * Log when compliance thresholds are exceeded
     */
    async logThresholdExceeded(sessionId, threshold, currentValue, thresholdValue, userId, organizationId) {
        await this.logEvent({
            sessionId,
            userId,
            organizationId,
            action: 'compliance_threshold_exceeded',
            details: {
                threshold,
                currentValue,
                thresholdValue,
                exceedancePercentage: ((currentValue - thresholdValue) / thresholdValue) * 100,
                timestamp: new Date().toISOString(),
            },
            severity: 'warning',
        });
    }
    /**
     * Query compliance audit events
     */
    async queryEvents(query) {
        // Convert compliance-specific query to general audit query
        const auditQuery = {
            sessionId: query.sessionId,
            userId: query.userId,
            action: query.action,
            component: 'ComplianceValidator',
            severity: query.severity,
            startDate: query.startDate,
            endDate: query.endDate,
            limit: query.limit,
            offset: query.offset,
        };
        const entries = await this.auditRepository.queryEntries(auditQuery);
        // Filter by compliance-specific criteria
        return entries.filter((entry) => {
            if (query.ruleId && entry.details.ruleId !== query.ruleId) {
                return false;
            }
            if (query.regulation &&
                entry.details.regulation !== query.regulation) {
                return false;
            }
            if (query.domain && entry.details.domain !== query.domain) {
                return false;
            }
            return true;
        });
    }
    /**
     * Generate compliance audit summary
     */
    async generateAuditSummary(query) {
        const events = await this.queryEvents({ ...query, limit: 10000 });
        const eventsByAction = events.reduce((acc, event) => {
            const action = event.action;
            acc[action] = (acc[action] || 0) + 1;
            return acc;
        }, {});
        const eventsBySeverity = events.reduce((acc, event) => {
            acc[event.severity] = (acc[event.severity] || 0) + 1;
            return acc;
        }, {});
        const violationEvents = events.filter((e) => e.action === 'violation_detected' ||
            e.action === 'violation_resolved').length;
        const remediationEvents = events.filter((e) => e.action === 'remediation_started' ||
            e.action === 'remediation_completed').length;
        const ruleManagementEvents = events.filter((e) => ['rule_created', 'rule_updated', 'rule_deleted'].includes(e.action)).length;
        const reportingEvents = events.filter((e) => [
            'compliance_report_generated',
            'compliance_report_exported',
            'compliance_report_accessed',
        ].includes(e.action)).length;
        // Calculate top rules by event count
        const ruleEventCounts = events.reduce((acc, event) => {
            if (event.details.ruleId) {
                const key = `${event.details.ruleId}:${event.details.regulation || 'Unknown'}`;
                acc[key] = (acc[key] || 0) + 1;
            }
            return acc;
        }, {});
        const topRules = Object.entries(ruleEventCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([key, count]) => {
            const [ruleId, regulation] = key.split(':');
            return { ruleId, regulation, eventCount: count };
        });
        // Calculate top users by event count
        const userEventCounts = events.reduce((acc, event) => {
            if (event.userId) {
                acc[event.userId] = (acc[event.userId] || 0) + 1;
            }
            return acc;
        }, {});
        const topUsers = Object.entries(userEventCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([userId, count]) => ({ userId, eventCount: count }));
        const timestamps = events
            .map((e) => e.timestamp)
            .sort((a, b) => a.getTime() - b.getTime());
        const timeRange = {
            earliest: timestamps[0] || new Date(),
            latest: timestamps[timestamps.length - 1] || new Date(),
        };
        return {
            totalEvents: events.length,
            eventsByAction,
            eventsBySeverity,
            violationEvents,
            remediationEvents,
            ruleManagementEvents,
            reportingEvents,
            timeRange,
            topRules,
            topUsers,
        };
    }
    async logEvent(event) {
        try {
            const auditEntry = {
                sessionId: event.sessionId,
                timestamp: new Date(),
                action: event.action,
                component: 'ComplianceValidator',
                details: event.details,
                userId: event.userId,
                organizationId: event.organizationId,
                ipAddress: event.ipAddress,
                userAgent: event.userAgent,
                success: true,
                severity: event.severity || 'info',
            };
            await this.auditRepository.createEntry(auditEntry);
        }
        catch (error) {
            console.error('Failed to log compliance audit event:', error);
            // Don't throw - audit logging failures shouldn't break compliance checks
        }
    }
    sanitizeUpdates(updates) {
        // Remove sensitive information from audit logs
        const sanitized = { ...updates };
        // Keep only essential fields for audit trail
        const allowedFields = [
            'ruleText',
            'regulation',
            'jurisdiction',
            'domain',
            'severity',
            'isActive',
            'lastUpdated',
        ];
        return Object.keys(sanitized)
            .filter((key) => allowedFields.includes(key))
            .reduce((obj, key) => {
            obj[key] = sanitized[key];
            return obj;
        }, {});
    }
}
exports.ComplianceAuditLogger = ComplianceAuditLogger;
//# sourceMappingURL=ComplianceAuditLogger.js.map