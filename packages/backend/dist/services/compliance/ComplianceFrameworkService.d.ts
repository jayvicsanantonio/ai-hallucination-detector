import { SOC2ComplianceService, SOC2Assessment } from './SOC2ComplianceService';
import { GDPRComplianceService, GDPRComplianceReport } from './GDPRComplianceService';
export interface ComplianceFramework {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    lastAssessment?: Date;
    nextAssessment?: Date;
    status: 'compliant' | 'non-compliant' | 'partial' | 'not-assessed';
}
export interface UnifiedComplianceReport {
    reportId: string;
    generatedDate: Date;
    frameworks: ComplianceFramework[];
    overallComplianceScore: number;
    criticalIssues: ComplianceIssue[];
    recommendations: string[];
    soc2Assessment?: SOC2Assessment;
    gdprReport?: GDPRComplianceReport;
}
export interface ComplianceIssue {
    framework: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    remediation: string;
    dueDate?: Date;
    status: 'open' | 'in-progress' | 'resolved';
}
export interface ComplianceConfiguration {
    enabledFrameworks: string[];
    assessmentFrequency: 'weekly' | 'monthly' | 'quarterly' | 'annually';
    autoRemediation: boolean;
    notificationSettings: {
        email: string[];
    };
    retentionPeriod: number;
}
export declare class ComplianceFrameworkService {
    private soc2Service;
    private gdprService;
    private configuration;
    private frameworks;
    private complianceReports;
    private complianceIssues;
    constructor(soc2Service: SOC2ComplianceService, gdprService: GDPRComplianceService, config?: Partial<ComplianceConfiguration>);
    /**
     * Initialize supported compliance frameworks
     */
    private initializeFrameworks;
    /**
     * Performs comprehensive compliance assessment across all enabled frameworks
     */
    performComplianceAssessment(): Promise<UnifiedComplianceReport>;
    /**
     * Performs automated remediation for known issues
     */
    performAutomatedRemediation(): Promise<{
        attempted: number;
        successful: number;
        failed: number;
        errors: string[];
    }>;
    /**
     * Gets current compliance status
     */
    getComplianceStatus(): {
        frameworks: ComplianceFramework[];
        overallScore: number;
        criticalIssues: number;
        lastAssessment?: Date;
        nextAssessment?: Date;
    };
    /**
     * Updates compliance configuration
     */
    updateConfiguration(config: Partial<ComplianceConfiguration>): void;
    /**
     * Gets compliance issues by severity
     */
    getComplianceIssues(severity?: 'low' | 'medium' | 'high' | 'critical'): ComplianceIssue[];
    /**
     * Resolves a compliance issue
     */
    resolveComplianceIssue(issueId: string, resolution?: string): boolean;
    /**
     * Gets latest compliance report
     */
    getLatestReport(): UnifiedComplianceReport | null;
    /**
     * Gets compliance report history
     */
    getReportHistory(): UnifiedComplianceReport[];
    private isFrameworkEnabled;
    private calculateNextAssessment;
    private getNextScheduledAssessment;
    private sendComplianceNotifications;
    private sendEmailNotification;
}
export declare const complianceFrameworkService: ComplianceFrameworkService;
//# sourceMappingURL=ComplianceFrameworkService.d.ts.map