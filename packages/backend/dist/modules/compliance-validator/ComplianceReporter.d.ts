import { ComplianceViolation, ComplianceCheckResult } from '../../models/knowledge/ComplianceRule';
import { ComplianceRepository } from '../../database/interfaces/ComplianceRepository';
import { AuditRepository } from '../../database/interfaces/AuditRepository';
import { AuditEntry } from '../../models/audit/AuditEntry';
export interface ComplianceReport {
    id: string;
    sessionId: string;
    organizationId: string;
    domain: string;
    generatedAt: Date;
    reportType: 'violation_summary' | 'detailed_analysis' | 'regulatory_compliance' | 'trend_analysis';
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
    complianceByDomain: Record<string, {
        score: number;
        violations: number;
        riskLevel: string;
    }>;
}
/**
 * Compliance reporting service that generates comprehensive reports
 * with severity levels, regulatory references, and audit trails
 */
export declare class ComplianceReporter {
    private complianceRepository;
    private auditRepository;
    constructor(complianceRepository: ComplianceRepository, auditRepository: AuditRepository);
    /**
     * Generate a comprehensive compliance report for a verification session
     */
    generateReport(sessionId: string, organizationId: string, domain: string, checkResult: ComplianceCheckResult, reportType?: ComplianceReport['reportType']): Promise<ComplianceReport>;
    /**
     * Generate compliance metrics and trends for an organization
     */
    generateMetrics(organizationId: string, domain?: string, timeRange?: {
        start: Date;
        end: Date;
    }): Promise<ComplianceMetrics>;
    /**
     * Export compliance report in various formats
     */
    exportReport(report: ComplianceReport, format: 'json' | 'pdf' | 'csv' | 'xml'): Promise<Buffer | string>;
    private generateReportSummary;
    private createViolationReports;
    private generateRecommendations;
    private collectRegulatoryReferences;
    private getSessionAuditTrail;
    private assessViolationImpact;
    private assessViolationUrgency;
    private createRemediationPlan;
    private getRegulatoryContext;
    private calculateRemediationPriority;
    private estimateRemediationEffort;
    private generateRemediationActions;
    private getDomainSpecificRecommendations;
    private extractSection;
    private getPenalties;
    private calculateComplianceScore;
    private determineRiskLevel;
    private analyzeViolationTrends;
    private getTopViolationTypes;
    private getComplianceByDomain;
    private exportToCsv;
    private exportToXml;
    private generateReportId;
    private logAuditEvent;
}
//# sourceMappingURL=ComplianceReporter.d.ts.map