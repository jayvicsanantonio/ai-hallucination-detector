import { AuditRepository } from '../../database/interfaces/AuditRepository';
import { AuditEntry, AuditQuery, AuditSummary, AuditAction, AuditSeverity } from '../../models/audit';
import { Logger } from '../../utils/Logger';
export interface ReportFilter {
    organizationId: string;
    startDate: Date;
    endDate: Date;
    actions?: AuditAction[];
    severities?: AuditSeverity[];
    components?: string[];
    userIds?: string[];
    successOnly?: boolean;
    failuresOnly?: boolean;
}
export interface AuditReport {
    id: string;
    organizationId: string;
    filter: ReportFilter;
    summary: AuditSummary;
    entries: AuditEntry[];
    generatedAt: Date;
    generatedBy: string;
    format: 'json' | 'csv' | 'pdf';
}
export interface ComplianceReport {
    organizationId: string;
    period: {
        startDate: Date;
        endDate: Date;
    };
    totalVerifications: number;
    complianceChecks: number;
    violationsDetected: number;
    violationsByType: Record<string, number>;
    violationsBySeverity: Record<AuditSeverity, number>;
    topViolatedRules: Array<{
        ruleId: string;
        count: number;
        regulation: string;
    }>;
    userActivity: Array<{
        userId: string;
        verifications: number;
        violations: number;
    }>;
    systemPerformance: {
        averageProcessingTime: number;
        successRate: number;
        errorRate: number;
    };
    recommendations: string[];
}
export interface SecurityReport {
    organizationId: string;
    period: {
        startDate: Date;
        endDate: Date;
    };
    authenticationEvents: number;
    authorizationFailures: number;
    suspiciousActivities: number;
    accessPatterns: Array<{
        userId: string;
        accessCount: number;
        lastAccess: Date;
    }>;
    securityIncidents: AuditEntry[];
    riskAssessment: 'low' | 'medium' | 'high' | 'critical';
    recommendations: string[];
}
export declare class AuditReportingService {
    private auditRepository;
    private logger;
    constructor(auditRepository: AuditRepository, logger: Logger);
    /**
     * Generate comprehensive audit report
     */
    generateAuditReport(filter: ReportFilter, format: "json" | "csv" | "pdf" | undefined, generatedBy: string): Promise<AuditReport>;
    /**
     * Generate compliance-focused report
     */
    generateComplianceReport(organizationId: string, startDate: Date, endDate: Date): Promise<ComplianceReport>;
    /**
     * Generate security-focused report
     */
    generateSecurityReport(organizationId: string, startDate: Date, endDate: Date): Promise<SecurityReport>;
    /**
     * Export report in specified format
     */
    exportReport(report: AuditReport | ComplianceReport | SecurityReport, format: 'json' | 'csv' | 'pdf'): Promise<string>;
    /**
     * Query audit entries with advanced filtering
     */
    queryAuditEntries(query: AuditQuery): Promise<AuditEntry[]>;
    /**
     * Get audit trends over time
     */
    getAuditTrends(organizationId: string, startDate: Date, endDate: Date, granularity?: 'hour' | 'day' | 'week'): Promise<Array<{
        period: string;
        count: number;
        successRate: number;
    }>>;
    private groupBy;
    private getTopViolatedRules;
    private getUserActivity;
    private calculateSystemPerformance;
    private generateComplianceRecommendations;
    private analyzeAccessPatterns;
    private assessSecurityRisk;
    private generateSecurityRecommendations;
    private calculateTrends;
    private getPeriodKey;
    private convertToCSV;
    private convertToPDF;
    private generateReportId;
}
//# sourceMappingURL=AuditReportingService.d.ts.map