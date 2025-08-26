import { AuditRepository } from '../../database/interfaces/AuditRepository';
import {
  AuditEntry,
  AuditAction,
  AuditSeverity,
} from '../../models/audit/AuditEntry';
import {
  ComplianceViolation,
  ComplianceRule,
} from '../../models/knowledge/ComplianceRule';

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

export type ComplianceAuditAction =
  | 'compliance_check_started'
  | 'compliance_check_completed'
  | 'compliance_check_failed'
  | 'violation_detected'
  | 'violation_resolved'
  | 'rule_applied'
  | 'rule_skipped'
  | 'rule_created'
  | 'rule_updated'
  | 'rule_deleted'
  | 'compliance_report_generated'
  | 'compliance_report_exported'
  | 'compliance_report_accessed'
  | 'remediation_started'
  | 'remediation_completed'
  | 'regulatory_reference_accessed'
  | 'compliance_threshold_exceeded'
  | 'compliance_policy_updated'
  | 'compliance_training_completed';

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
export class ComplianceAuditLogger {
  constructor(private auditRepository: AuditRepository) {}

  /**
   * Log the start of a compliance check
   */
  async logComplianceCheckStarted(
    sessionId: string,
    domain: string,
    jurisdiction: string,
    rulesCount: number,
    userId?: string,
    organizationId?: string
  ): Promise<void> {
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
  async logComplianceCheckCompleted(
    sessionId: string,
    violationsCount: number,
    complianceScore: number,
    overallRisk: string,
    processingTimeMs: number,
    userId?: string,
    organizationId?: string
  ): Promise<void> {
    const severity: AuditSeverity =
      overallRisk === 'critical'
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
  async logComplianceCheckFailed(
    sessionId: string,
    error: string,
    stage: string,
    userId?: string,
    organizationId?: string
  ): Promise<void> {
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
  async logViolationDetected(
    sessionId: string,
    violation: ComplianceViolation,
    userId?: string,
    organizationId?: string
  ): Promise<void> {
    const severity: AuditSeverity =
      violation.severity === 'critical'
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
  async logRuleApplied(
    sessionId: string,
    rule: ComplianceRule,
    matchesFound: number,
    userId?: string,
    organizationId?: string
  ): Promise<void> {
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
  async logRuleSkipped(
    sessionId: string,
    rule: ComplianceRule,
    reason: string,
    userId?: string,
    organizationId?: string
  ): Promise<void> {
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
  async logRuleCreated(
    rule: ComplianceRule,
    userId?: string,
    organizationId?: string
  ): Promise<void> {
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
  async logRuleUpdated(
    ruleId: string,
    updates: Partial<ComplianceRule>,
    userId?: string,
    organizationId?: string
  ): Promise<void> {
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
  async logRuleDeleted(
    ruleId: string,
    regulation: string,
    userId?: string,
    organizationId?: string
  ): Promise<void> {
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
  async logReportGenerated(
    sessionId: string,
    reportId: string,
    reportType: string,
    violationsCount: number,
    userId?: string,
    organizationId?: string
  ): Promise<void> {
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
  async logReportExported(
    sessionId: string,
    reportId: string,
    format: string,
    userId?: string,
    organizationId?: string
  ): Promise<void> {
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
  async logRemediationStarted(
    sessionId: string,
    violationId: string,
    remediationPlan: any,
    userId?: string,
    organizationId?: string
  ): Promise<void> {
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
  async logRemediationCompleted(
    sessionId: string,
    violationId: string,
    resolutionDetails: string,
    userId?: string,
    organizationId?: string
  ): Promise<void> {
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
  async logThresholdExceeded(
    sessionId: string,
    threshold: string,
    currentValue: number,
    thresholdValue: number,
    userId?: string,
    organizationId?: string
  ): Promise<void> {
    await this.logEvent({
      sessionId,
      userId,
      organizationId,
      action: 'compliance_threshold_exceeded',
      details: {
        threshold,
        currentValue,
        thresholdValue,
        exceedancePercentage:
          ((currentValue - thresholdValue) / thresholdValue) * 100,
        timestamp: new Date().toISOString(),
      },
      severity: 'warning',
    });
  }

  /**
   * Query compliance audit events
   */
  async queryEvents(
    query: ComplianceAuditQuery
  ): Promise<AuditEntry[]> {
    // Convert compliance-specific query to general audit query
    const auditQuery = {
      sessionId: query.sessionId,
      userId: query.userId,
      action: query.action as AuditAction,
      component: 'ComplianceValidator',
      severity: query.severity,
      startDate: query.startDate,
      endDate: query.endDate,
      limit: query.limit,
      offset: query.offset,
    };

    const entries = await this.auditRepository.queryEntries(
      auditQuery
    );

    // Filter by compliance-specific criteria
    return entries.filter((entry) => {
      if (query.ruleId && entry.details.ruleId !== query.ruleId) {
        return false;
      }
      if (
        query.regulation &&
        entry.details.regulation !== query.regulation
      ) {
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
  async generateAuditSummary(
    query: Omit<ComplianceAuditQuery, 'limit' | 'offset'>
  ): Promise<ComplianceAuditSummary> {
    const events = await this.queryEvents({ ...query, limit: 10000 });

    const eventsByAction = events.reduce((acc, event) => {
      const action = event.action as ComplianceAuditAction;
      acc[action] = (acc[action] || 0) + 1;
      return acc;
    }, {} as Record<ComplianceAuditAction, number>);

    const eventsBySeverity = events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<AuditSeverity, number>);

    const violationEvents = events.filter(
      (e) =>
        e.action === 'violation_detected' ||
        e.action === 'violation_resolved'
    ).length;

    const remediationEvents = events.filter(
      (e) =>
        e.action === 'remediation_started' ||
        e.action === 'remediation_completed'
    ).length;

    const ruleManagementEvents = events.filter((e) =>
      ['rule_created', 'rule_updated', 'rule_deleted'].includes(
        e.action
      )
    ).length;

    const reportingEvents = events.filter((e) =>
      [
        'compliance_report_generated',
        'compliance_report_exported',
        'compliance_report_accessed',
      ].includes(e.action)
    ).length;

    // Calculate top rules by event count
    const ruleEventCounts = events.reduce((acc, event) => {
      if (event.details.ruleId) {
        const key = `${event.details.ruleId}:${
          event.details.regulation || 'Unknown'
        }`;
        acc[key] = (acc[key] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

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
    }, {} as Record<string, number>);

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

  private async logEvent(event: ComplianceAuditEvent): Promise<void> {
    try {
      const auditEntry: Omit<AuditEntry, 'id'> = {
        sessionId: event.sessionId,
        timestamp: new Date(),
        action: event.action as AuditAction,
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
    } catch (error) {
      console.error('Failed to log compliance audit event:', error);
      // Don't throw - audit logging failures shouldn't break compliance checks
    }
  }

  private sanitizeUpdates(
    updates: Partial<ComplianceRule>
  ): Record<string, any> {
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
        obj[key] = sanitized[key as keyof ComplianceRule];
        return obj;
      }, {} as Record<string, unknown>);
  }
}
