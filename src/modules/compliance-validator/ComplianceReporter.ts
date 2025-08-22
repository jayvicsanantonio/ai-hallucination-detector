import {
  ComplianceRule,
  ComplianceViolation,
  ComplianceCheckResult,
} from '../../models/knowledge/ComplianceRule';
import { ComplianceRepository } from '../../database/interfaces/ComplianceRepository';
import { AuditRepository } from '../../database/interfaces/AuditRepository';
import {
  AuditEntry,
  AuditAction,
} from '../../models/audit/AuditEntry';

export interface ComplianceReport {
  id: string;
  sessionId: string;
  organizationId: string;
  domain: string;
  generatedAt: Date;
  reportType:
    | 'violation_summary'
    | 'detailed_analysis'
    | 'regulatory_compliance'
    | 'trend_analysis';
  summary: ComplianceReportSummary;
  violations: ComplianceViolationReport[];
  recommendations: string[];
  regulatoryReferences: RegulatoryReference[];
  auditTrail: AuditEntry[];
}

export interface ComplianceReportSummary {
  totalViolations: number;
  violationsBySeverity: Record<string, number>;
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  complianceScore: number;
  checkedRules: number;
  passedRules: number;
  failedRules: number;
}

export interface ComplianceViolationReport {
  violation: ComplianceViolation;
  impact: 'low' | 'medium' | 'high' | 'critical';
  urgency: 'low' | 'medium' | 'high' | 'immediate';
  remediation: RemediationPlan;
  regulatoryContext: RegulatoryContext;
}

export interface RemediationPlan {
  priority: number;
  estimatedEffort: 'low' | 'medium' | 'high';
  suggestedActions: string[];
  deadline?: Date;
  assignedTo?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'deferred';
}

export interface RegulatoryContext {
  regulation: string;
  section: string;
  description: string;
  penalties: string[];
  precedents: string[];
  lastUpdated: Date;
}

export interface RegulatoryReference {
  regulation: string;
  section: string;
  title: string;
  description: string;
  url?: string;
  effectiveDate: Date;
  jurisdiction: string;
  applicableDomains: string[];
}

export interface ComplianceMetrics {
  complianceScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  violationTrends: Array<{
    date: Date;
    count: number;
    severity: string;
  }>;
  topViolationTypes: Array<{
    ruleId: string;
    regulation: string;
    count: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }>;
  complianceByDomain: Record<
    string,
    {
      score: number;
      violations: number;
      riskLevel: string;
    }
  >;
}

/**
 * Compliance reporting service that generates comprehensive reports
 * with severity levels, regulatory references, and audit trails
 */
export class ComplianceReporter {
  constructor(
    private complianceRepository: ComplianceRepository,
    private auditRepository: AuditRepository
  ) {}

  /**
   * Generate a comprehensive compliance report for a verification session
   */
  async generateReport(
    sessionId: string,
    organizationId: string,
    domain: string,
    checkResult: ComplianceCheckResult,
    reportType: ComplianceReport['reportType'] = 'detailed_analysis'
  ): Promise<ComplianceReport> {
    const reportId = this.generateReportId();

    // Log report generation start
    await this.logAuditEvent(sessionId, 'compliance_report_started', {
      reportId,
      reportType,
      domain,
    });

    try {
      // Generate report summary
      const summary = this.generateReportSummary(checkResult);

      // Create detailed violation reports
      const violationReports = await this.createViolationReports(
        checkResult.violations,
        domain
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        checkResult.violations,
        domain
      );

      // Collect regulatory references
      const regulatoryReferences =
        await this.collectRegulatoryReferences(
          checkResult.violations
        );

      // Get audit trail for the session
      const auditTrail = await this.getSessionAuditTrail(sessionId);

      const report: ComplianceReport = {
        id: reportId,
        sessionId,
        organizationId,
        domain,
        generatedAt: new Date(),
        reportType,
        summary,
        violations: violationReports,
        recommendations,
        regulatoryReferences,
        auditTrail,
      };

      // Log successful report generation
      await this.logAuditEvent(
        sessionId,
        'compliance_report_generated',
        {
          reportId,
          violationCount: checkResult.violations.length,
          complianceScore: checkResult.complianceScore,
        }
      );

      return report;
    } catch (error) {
      // Log report generation failure
      await this.logAuditEvent(
        sessionId,
        'compliance_report_failed',
        {
          reportId,
          error:
            error instanceof Error ? error.message : 'Unknown error',
        }
      );
      throw error;
    }
  }

  /**
   * Generate compliance metrics and trends for an organization
   */
  async generateMetrics(
    organizationId: string,
    domain?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<ComplianceMetrics> {
    const stats = await this.complianceRepository.getViolationStats(
      domain,
      timeRange
    );

    // Calculate compliance score based on violation trends
    const complianceScore = this.calculateComplianceScore(stats);

    // Determine risk level
    const riskLevel = this.determineRiskLevel(stats);

    // Analyze violation trends
    const violationTrends = this.analyzeViolationTrends(
      stats.trendsOverTime
    );

    // Identify top violation types
    const topViolationTypes = await this.getTopViolationTypes(
      stats.violationsByRule
    );

    // Get compliance by domain if not filtered
    const complianceByDomain = domain
      ? {}
      : await this.getComplianceByDomain(organizationId, timeRange);

    return {
      complianceScore,
      riskLevel,
      violationTrends,
      topViolationTypes,
      complianceByDomain,
    };
  }

  /**
   * Export compliance report in various formats
   */
  async exportReport(
    report: ComplianceReport,
    format: 'json' | 'pdf' | 'csv' | 'xml'
  ): Promise<Buffer | string> {
    await this.logAuditEvent(
      report.sessionId,
      'compliance_report_exported',
      {
        reportId: report.id,
        format,
      }
    );

    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);
      case 'csv':
        return this.exportToCsv(report);
      case 'xml':
        return this.exportToXml(report);
      case 'pdf':
        // PDF generation would require additional libraries
        throw new Error('PDF export not implemented yet');
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private generateReportSummary(
    checkResult: ComplianceCheckResult
  ): ComplianceReportSummary {
    const violationsBySeverity = checkResult.violations.reduce(
      (acc, violation) => {
        acc[violation.severity] = (acc[violation.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const failedRules = new Set(
      checkResult.violations.map((v) => v.ruleId)
    ).size;

    return {
      totalViolations: checkResult.violations.length,
      violationsBySeverity,
      overallRisk: checkResult.overallRisk,
      complianceScore: checkResult.complianceScore,
      checkedRules: checkResult.checkedRules,
      passedRules: checkResult.checkedRules - failedRules,
      failedRules,
    };
  }

  private async createViolationReports(
    violations: ComplianceViolation[],
    domain: string
  ): Promise<ComplianceViolationReport[]> {
    return Promise.all(
      violations.map(async (violation) => {
        const impact = this.assessViolationImpact(violation, domain);
        const urgency = this.assessViolationUrgency(violation);
        const remediation = this.createRemediationPlan(violation);
        const regulatoryContext = await this.getRegulatoryContext(
          violation.rule
        );

        return {
          violation,
          impact,
          urgency,
          remediation,
          regulatoryContext,
        };
      })
    );
  }

  private generateRecommendations(
    violations: ComplianceViolation[],
    domain: string
  ): string[] {
    const recommendations: string[] = [];

    // Group violations by severity
    const criticalViolations = violations.filter(
      (v) => v.severity === 'critical'
    );
    const highViolations = violations.filter(
      (v) => v.severity === 'high'
    );

    if (criticalViolations.length > 0) {
      recommendations.push(
        `Immediate action required: ${criticalViolations.length} critical compliance violations detected. Review and remediate immediately to avoid regulatory penalties.`
      );
    }

    if (highViolations.length > 0) {
      recommendations.push(
        `High priority: ${highViolations.length} high-severity violations require attention within 24-48 hours.`
      );
    }

    // Domain-specific recommendations
    const domainRecommendations =
      this.getDomainSpecificRecommendations(violations, domain);
    recommendations.push(...domainRecommendations);

    return recommendations;
  }

  private async collectRegulatoryReferences(
    violations: ComplianceViolation[]
  ): Promise<RegulatoryReference[]> {
    const references = new Map<string, RegulatoryReference>();

    for (const violation of violations) {
      const key = `${violation.rule.regulation}-${violation.rule.jurisdiction}`;

      if (!references.has(key)) {
        references.set(key, {
          regulation: violation.rule.regulation,
          section: this.extractSection(violation.rule.ruleText),
          title: violation.rule.regulation,
          description: violation.rule.ruleText,
          effectiveDate: violation.rule.lastUpdated,
          jurisdiction: violation.rule.jurisdiction,
          applicableDomains: [violation.rule.domain],
        });
      } else {
        const existing = references.get(key)!;
        if (
          !existing.applicableDomains.includes(violation.rule.domain)
        ) {
          existing.applicableDomains.push(violation.rule.domain);
        }
      }
    }

    return Array.from(references.values());
  }

  private async getSessionAuditTrail(
    sessionId: string
  ): Promise<AuditEntry[]> {
    return await this.auditRepository.getEntriesBySession(sessionId);
  }

  private assessViolationImpact(
    violation: ComplianceViolation,
    domain: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Base impact on severity
    let impact = violation.severity;

    // Adjust based on domain-specific factors
    const highImpactDomains = ['healthcare', 'financial'];
    if (
      highImpactDomains.includes(domain) &&
      violation.severity !== 'low'
    ) {
      // Escalate impact for high-risk domains
      const impactLevels = ['low', 'medium', 'high', 'critical'];
      const currentIndex = impactLevels.indexOf(impact);
      impact = impactLevels[
        Math.min(currentIndex + 1, 3)
      ] as typeof impact;
    }

    return impact;
  }

  private assessViolationUrgency(
    violation: ComplianceViolation
  ): 'low' | 'medium' | 'high' | 'immediate' {
    switch (violation.severity) {
      case 'critical':
        return 'immediate';
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      case 'low':
      default:
        return 'low';
    }
  }

  private createRemediationPlan(
    violation: ComplianceViolation
  ): RemediationPlan {
    const priority = this.calculateRemediationPriority(violation);
    const estimatedEffort = this.estimateRemediationEffort(violation);
    const suggestedActions =
      this.generateRemediationActions(violation);

    return {
      priority,
      estimatedEffort,
      suggestedActions,
      status: 'pending',
    };
  }

  private async getRegulatoryContext(
    rule: ComplianceRule
  ): Promise<RegulatoryContext> {
    return {
      regulation: rule.regulation,
      section: this.extractSection(rule.ruleText),
      description: rule.ruleText,
      penalties: this.getPenalties(rule.regulation, rule.domain),
      precedents: [], // Would be populated from a regulatory database
      lastUpdated: rule.lastUpdated,
    };
  }

  private calculateRemediationPriority(
    violation: ComplianceViolation
  ): number {
    const severityWeights = {
      critical: 100,
      high: 75,
      medium: 50,
      low: 25,
    };

    let priority = severityWeights[violation.severity];

    // Adjust based on confidence
    priority = Math.round(priority * (violation.confidence / 100));

    return priority;
  }

  private estimateRemediationEffort(
    violation: ComplianceViolation
  ): 'low' | 'medium' | 'high' {
    // Simple heuristic based on violation type and severity
    if (violation.violationType === 'semantic_match') {
      return 'high'; // Semantic issues often require more complex fixes
    }

    if (
      violation.severity === 'critical' ||
      violation.severity === 'high'
    ) {
      return 'medium';
    }

    return 'low';
  }

  private generateRemediationActions(
    violation: ComplianceViolation
  ): string[] {
    const actions: string[] = [];

    if (violation.suggestedFix) {
      actions.push(violation.suggestedFix);
    }

    // Add generic actions based on violation type
    switch (violation.violationType) {
      case 'keyword_match':
        actions.push('Review and modify flagged content');
        actions.push('Consider alternative phrasing');
        break;
      case 'pattern_match':
        actions.push('Update content to match required patterns');
        actions.push('Validate against regulatory templates');
        break;
      case 'semantic_match':
        actions.push('Conduct thorough content review');
        actions.push('Consult with legal/compliance team');
        break;
    }

    actions.push(
      `Verify compliance with ${violation.rule.regulation}`
    );
    actions.push('Document remediation steps taken');

    return actions;
  }

  private getDomainSpecificRecommendations(
    violations: ComplianceViolation[],
    domain: string
  ): string[] {
    const recommendations: string[] = [];

    switch (domain) {
      case 'healthcare':
        if (
          violations.some((v) => v.rule.regulation.includes('HIPAA'))
        ) {
          recommendations.push(
            'Ensure all patient information is properly protected and anonymized according to HIPAA requirements.'
          );
        }
        break;
      case 'financial':
        if (
          violations.some((v) => v.rule.regulation.includes('SOX'))
        ) {
          recommendations.push(
            'Review financial disclosures and ensure accuracy of all numerical data per SOX requirements.'
          );
        }
        break;
      case 'legal':
        if (
          violations.some((v) => v.rule.regulation.includes('GDPR'))
        ) {
          recommendations.push(
            'Verify data processing consent and implement proper data subject rights handling per GDPR.'
          );
        }
        break;
    }

    return recommendations;
  }

  private extractSection(ruleText: string): string {
    // Simple extraction - in practice, this would be more sophisticated
    const sectionMatch = ruleText.match(/Section\s+(\d+(?:\.\d+)*)/i);
    return sectionMatch ? sectionMatch[1] : 'General';
  }

  private getPenalties(regulation: string, domain: string): string[] {
    // This would typically come from a regulatory database
    const penalties: Record<string, string[]> = {
      HIPAA: [
        'Up to $1.5M per incident',
        'Criminal charges possible',
      ],
      SOX: ['Up to $5M fine', 'Up to 20 years imprisonment'],
      GDPR: ['Up to 4% of annual revenue', 'Up to €20M fine'],
    };

    return (
      penalties[regulation] || ['Regulatory penalties may apply']
    );
  }

  private calculateComplianceScore(stats: any): number {
    if (stats.totalViolations === 0) return 100;

    // Simple scoring algorithm - could be more sophisticated
    const criticalWeight = 25;
    const highWeight = 15;
    const mediumWeight = 8;
    const lowWeight = 3;

    const penalties =
      (stats.violationsBySeverity.critical || 0) * criticalWeight +
      (stats.violationsBySeverity.high || 0) * highWeight +
      (stats.violationsBySeverity.medium || 0) * mediumWeight +
      (stats.violationsBySeverity.low || 0) * lowWeight;

    return Math.max(0, 100 - penalties);
  }

  private determineRiskLevel(
    stats: any
  ): 'low' | 'medium' | 'high' | 'critical' {
    const critical = stats.violationsBySeverity.critical || 0;
    const high = stats.violationsBySeverity.high || 0;
    const medium = stats.violationsBySeverity.medium || 0;

    if (critical > 0) return 'critical';
    if (high > 2) return 'critical';
    if (high > 0 || medium > 5) return 'high';
    if (medium > 0) return 'medium';
    return 'low';
  }

  private analyzeViolationTrends(
    trendsOverTime: Array<{ date: Date; count: number }>
  ): Array<{ date: Date; count: number; severity: string }> {
    // For now, return the data as-is with 'mixed' severity
    // In practice, this would analyze trends by severity
    return trendsOverTime.map((trend) => ({
      ...trend,
      severity: 'mixed',
    }));
  }

  private async getTopViolationTypes(
    violationsByRule: Record<string, number>
  ): Promise<
    Array<{
      ruleId: string;
      regulation: string;
      count: number;
      trend: 'increasing' | 'decreasing' | 'stable';
    }>
  > {
    const topRules = Object.entries(violationsByRule)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    const results = [];
    for (const [ruleId, count] of topRules) {
      const rule = await this.complianceRepository.getRuleById(
        ruleId
      );
      results.push({
        ruleId,
        regulation: rule?.regulation || 'Unknown',
        count,
        trend: 'stable' as const, // Would calculate actual trend
      });
    }

    return results;
  }

  private async getComplianceByDomain(
    organizationId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<
    Record<
      string,
      { score: number; violations: number; riskLevel: string }
    >
  > {
    const domains = ['legal', 'financial', 'healthcare', 'insurance'];
    const result: Record<string, any> = {};

    for (const domain of domains) {
      const stats = await this.complianceRepository.getViolationStats(
        domain,
        timeRange
      );

      result[domain] = {
        score: this.calculateComplianceScore(stats),
        violations: stats.totalViolations,
        riskLevel: this.determineRiskLevel(stats),
      };
    }

    return result;
  }

  private exportToCsv(report: ComplianceReport): string {
    const headers = [
      'Violation ID',
      'Rule ID',
      'Regulation',
      'Severity',
      'Confidence',
      'Description',
      'Location',
      'Suggested Fix',
    ];

    const rows = report.violations.map((vr) => [
      vr.violation.ruleId,
      vr.violation.rule.id,
      vr.violation.rule.regulation,
      vr.violation.severity,
      vr.violation.confidence.toString(),
      vr.violation.description,
      `${vr.violation.location.start}-${vr.violation.location.end}`,
      vr.violation.suggestedFix || '',
    ]);

    return [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');
  }

  private exportToXml(report: ComplianceReport): string {
    // Simple XML export - would use proper XML library in production
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<ComplianceReport>\n';
    xml += `  <id>${report.id}</id>\n`;
    xml += `  <sessionId>${report.sessionId}</sessionId>\n`;
    xml += `  <generatedAt>${report.generatedAt.toISOString()}</generatedAt>\n`;
    xml += '  <violations>\n';

    for (const vr of report.violations) {
      xml += '    <violation>\n';
      xml += `      <ruleId>${vr.violation.ruleId}</ruleId>\n`;
      xml += `      <severity>${vr.violation.severity}</severity>\n`;
      xml += `      <confidence>${vr.violation.confidence}</confidence>\n`;
      xml += `      <description><![CDATA[${vr.violation.description}]]></description>\n`;
      xml += '    </violation>\n';
    }

    xml += '  </violations>\n';
    xml += '</ComplianceReport>';

    return xml;
  }

  private generateReportId(): string {
    return `compliance-report-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }

  private async logAuditEvent(
    sessionId: string,
    action: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      await this.auditRepository.createEntry({
        sessionId,
        timestamp: new Date(),
        action: action as AuditAction,
        component: 'ComplianceReporter',
        details,
        success: true,
        severity: 'info',
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }
}
