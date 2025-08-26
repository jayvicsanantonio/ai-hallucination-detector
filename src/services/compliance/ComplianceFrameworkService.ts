import {
  SOC2ComplianceService,
  SOC2Assessment,
} from './SOC2ComplianceService';
import {
  GDPRComplianceService,
  GDPRComplianceReport,
} from './GDPRComplianceService';

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
  assessmentFrequency:
    | 'weekly'
    | 'monthly'
    | 'quarterly'
    | 'annually';
  autoRemediation: boolean;
  notificationSettings: {
    email: string[];
  };
  retentionPeriod: number; // days to keep compliance reports
}

export class ComplianceFrameworkService {
  private soc2Service: SOC2ComplianceService;
  private gdprService: GDPRComplianceService;
  private configuration: ComplianceConfiguration;
  private frameworks: Map<string, ComplianceFramework>;
  private complianceReports: UnifiedComplianceReport[];
  private complianceIssues: Map<string, ComplianceIssue>;

  constructor(
    soc2Service: SOC2ComplianceService,
    gdprService: GDPRComplianceService,
    config?: Partial<ComplianceConfiguration>
  ) {
    this.soc2Service = soc2Service;
    this.gdprService = gdprService;
    this.complianceReports = [];
    this.complianceIssues = new Map();

    this.configuration = {
      enabledFrameworks: ['SOC2', 'GDPR'],
      assessmentFrequency: 'monthly',
      autoRemediation: false,
      notificationSettings: {
        email: [],
      },
      retentionPeriod: 2555, // 7 years
      ...config,
    };

    this.frameworks = new Map();
    this.initializeFrameworks();
  }

  /**
   * Initialize supported compliance frameworks
   */
  private initializeFrameworks(): void {
    const supportedFrameworks: ComplianceFramework[] = [
      {
        id: 'SOC2',
        name: 'SOC 2 Type II',
        description:
          'Service Organization Control 2 - Security, Availability, Processing Integrity, Confidentiality, Privacy',
        enabled:
          this.configuration.enabledFrameworks.includes('SOC2'),
        status: 'not-assessed',
      },
      {
        id: 'GDPR',
        name: 'General Data Protection Regulation',
        description: 'EU regulation for data protection and privacy',
        enabled:
          this.configuration.enabledFrameworks.includes('GDPR'),
        status: 'not-assessed',
      },
      {
        id: 'HIPAA',
        name: 'Health Insurance Portability and Accountability Act',
        description: 'US regulation for healthcare data protection',
        enabled:
          this.configuration.enabledFrameworks.includes('HIPAA'),
        status: 'not-assessed',
      },
      {
        id: 'PCI-DSS',
        name: 'Payment Card Industry Data Security Standard',
        description: 'Security standard for payment card data',
        enabled:
          this.configuration.enabledFrameworks.includes('PCI-DSS'),
        status: 'not-assessed',
      },
      {
        id: 'ISO27001',
        name: 'ISO/IEC 27001',
        description:
          'International standard for information security management',
        enabled:
          this.configuration.enabledFrameworks.includes('ISO27001'),
        status: 'not-assessed',
      },
    ];

    supportedFrameworks.forEach((framework) => {
      this.frameworks.set(framework.id, framework);
    });
  }

  /**
   * Performs comprehensive compliance assessment across all enabled frameworks
   */
  async performComplianceAssessment(): Promise<UnifiedComplianceReport> {
    const reportId = `COMPLIANCE-${Date.now()}`;
    const generatedDate = new Date();
    const criticalIssues: ComplianceIssue[] = [];
    const recommendations: string[] = [];
    let totalScore = 0;
    let assessedFrameworks = 0;

    let soc2Assessment: SOC2Assessment | undefined;
    let gdprReport: GDPRComplianceReport | undefined;

    // Assess SOC 2 if enabled
    if (this.isFrameworkEnabled('SOC2')) {
      try {
        soc2Assessment =
          await this.soc2Service.performAutomatedAssessment();
        const framework = this.frameworks.get('SOC2')!;

        framework.lastAssessment = generatedDate;
        framework.nextAssessment =
          this.calculateNextAssessment(generatedDate);

        if (soc2Assessment.overallStatus === 'compliant') {
          framework.status = 'compliant';
          totalScore += 100;
        } else if (soc2Assessment.overallStatus === 'partial') {
          framework.status = 'partial';
          totalScore += 60;
        } else {
          framework.status = 'non-compliant';
          totalScore += 20;
        }

        // Convert SOC 2 findings to compliance issues
        soc2Assessment.findings.forEach((finding) => {
          const issue: ComplianceIssue = {
            framework: 'SOC2',
            severity: finding.severity,
            description: finding.description,
            remediation: finding.remediation,
            dueDate: finding.dueDate,
            status: 'open',
          };

          if (
            finding.severity === 'critical' ||
            finding.severity === 'high'
          ) {
            criticalIssues.push(issue);
          }

          this.complianceIssues.set(
            `SOC2-${finding.controlId}`,
            issue
          );
        });

        recommendations.push(...soc2Assessment.recommendations);
        assessedFrameworks++;
      } catch (error: any) {
        console.error('SOC 2 assessment failed:', error);
        recommendations.push(
          'SOC 2 assessment failed - manual review required'
        );
      }
    }

    // Assess GDPR if enabled
    if (this.isFrameworkEnabled('GDPR')) {
      try {
        gdprReport = this.gdprService.generateComplianceReport();
        const framework = this.frameworks.get('GDPR')!;

        framework.lastAssessment = generatedDate;
        framework.nextAssessment =
          this.calculateNextAssessment(generatedDate);

        if (gdprReport.complianceScore >= 90) {
          framework.status = 'compliant';
        } else if (gdprReport.complianceScore >= 70) {
          framework.status = 'partial';
        } else {
          framework.status = 'non-compliant';
        }

        totalScore += gdprReport.complianceScore;
        assessedFrameworks++;

        // Create compliance issues for GDPR problems
        if (gdprReport.expiredData > 0) {
          const issue: ComplianceIssue = {
            framework: 'GDPR',
            severity: 'high',
            description: `${gdprReport.expiredData} data subjects have expired retention periods`,
            remediation:
              'Perform data retention cleanup to remove or anonymize expired data',
            status: 'open',
          };
          criticalIssues.push(issue);
          this.complianceIssues.set('GDPR-expired-data', issue);
        }

        if (gdprReport.pendingRequests > 5) {
          const issue: ComplianceIssue = {
            framework: 'GDPR',
            severity: 'medium',
            description: `${gdprReport.pendingRequests} pending data subject requests`,
            remediation:
              'Process pending requests within 30-day legal requirement',
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: 'open',
          };
          this.complianceIssues.set('GDPR-pending-requests', issue);
        }

        recommendations.push(...gdprReport.recommendations);
      } catch (error: any) {
        console.error('GDPR assessment failed:', error);
        recommendations.push(
          'GDPR assessment failed - manual review required'
        );
      }
    }

    // Calculate overall compliance score
    const overallComplianceScore =
      assessedFrameworks > 0
        ? Math.round(totalScore / assessedFrameworks)
        : 0;

    // Add general recommendations based on overall score
    if (overallComplianceScore < 70) {
      recommendations.push(
        'Overall compliance score is below acceptable threshold - immediate action required'
      );
      recommendations.push(
        'Consider engaging compliance consultant for comprehensive review'
      );
    } else if (overallComplianceScore < 90) {
      recommendations.push(
        'Good compliance posture but room for improvement'
      );
      recommendations.push(
        'Focus on addressing medium and high severity issues'
      );
    }

    const report: UnifiedComplianceReport = {
      reportId,
      generatedDate,
      frameworks: Array.from(this.frameworks.values()),
      overallComplianceScore,
      criticalIssues,
      recommendations,
      soc2Assessment,
      gdprReport,
    };

    this.complianceReports.push(report);

    // Send notifications if configured
    await this.sendComplianceNotifications(report);

    return report;
  }

  /**
   * Performs automated remediation for known issues
   */
  async performAutomatedRemediation(): Promise<{
    attempted: number;
    successful: number;
    failed: number;
    errors: string[];
  }> {
    if (!this.configuration.autoRemediation) {
      return {
        attempted: 0,
        successful: 0,
        failed: 0,
        errors: ['Auto-remediation is disabled'],
      };
    }

    const results = {
      attempted: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Remediate GDPR data retention issues
    if (this.isFrameworkEnabled('GDPR')) {
      try {
        results.attempted++;
        const cleanupResults =
          await this.gdprService.performRetentionCleanup();

        if (cleanupResults.errors.length === 0) {
          results.successful++;

          // Update compliance issue status
          const issue = this.complianceIssues.get(
            'GDPR-expired-data'
          );
          if (issue) {
            issue.status = 'resolved';
          }
        } else {
          results.failed++;
          results.errors.push(...(cleanupResults.errors as string[]));
        }
      } catch (error: any) {
        results.failed++;
        results.errors.push(
          `GDPR remediation failed: ${(error as Error).message}`
        );
      }
    }

    return results;
  }

  /**
   * Gets current compliance status
   */
  getComplianceStatus(): {
    frameworks: ComplianceFramework[];
    overallScore: number;
    criticalIssues: number;
    lastAssessment?: Date;
    nextAssessment?: Date;
  } {
    const latestReport = this.getLatestReport();
    const criticalIssues = Array.from(
      this.complianceIssues.values()
    ).filter(
      (issue) =>
        issue.severity === 'critical' && issue.status === 'open'
    ).length;

    return {
      frameworks: Array.from(this.frameworks.values()),
      overallScore: latestReport?.overallComplianceScore || 0,
      criticalIssues,
      lastAssessment: latestReport?.generatedDate,
      nextAssessment: this.getNextScheduledAssessment(),
    };
  }

  /**
   * Updates compliance configuration
   */
  updateConfiguration(
    config: Partial<ComplianceConfiguration>
  ): void {
    this.configuration = { ...this.configuration, ...config };

    // Update framework enabled status
    this.frameworks.forEach((framework, id) => {
      framework.enabled =
        this.configuration.enabledFrameworks.includes(id);
    });
  }

  /**
   * Gets compliance issues by severity
   */
  getComplianceIssues(
    severity?: 'low' | 'medium' | 'high' | 'critical'
  ): ComplianceIssue[] {
    const issues = Array.from(this.complianceIssues.values());
    return severity
      ? issues.filter((issue) => issue.severity === severity)
      : issues;
  }

  /**
   * Resolves a compliance issue
   */
  resolveComplianceIssue(
    issueId: string,
    resolution?: string
  ): boolean {
    const issue = this.complianceIssues.get(issueId);
    if (!issue) {
      return false;
    }

    issue.status = 'resolved';
    return true;
  }

  /**
   * Gets latest compliance report
   */
  getLatestReport(): UnifiedComplianceReport | null {
    return this.complianceReports.length > 0
      ? this.complianceReports[this.complianceReports.length - 1]
      : null;
  }

  /**
   * Gets compliance report history
   */
  getReportHistory(): UnifiedComplianceReport[] {
    return this.complianceReports;
  }

  private isFrameworkEnabled(frameworkId: string): boolean {
    const framework = this.frameworks.get(frameworkId);
    return framework?.enabled || false;
  }

  private calculateNextAssessment(lastAssessment: Date): Date {
    const frequency = this.configuration.assessmentFrequency;
    const nextDate = new Date(lastAssessment);

    switch (frequency) {
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'annually':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }

    return nextDate;
  }

  private getNextScheduledAssessment(): Date | undefined {
    const frameworks = Array.from(this.frameworks.values())
      .filter((f) => f.enabled && f.nextAssessment)
      .sort(
        (a, b) =>
          a.nextAssessment!.getTime() - b.nextAssessment?.getTime()
      );

    return frameworks.length > 0
      ? frameworks[0].nextAssessment
      : undefined;
  }

  private async sendComplianceNotifications(
    report: UnifiedComplianceReport
  ): Promise<void> {
    const { notificationSettings } = this.configuration;

    // Send email notifications
    for (const email of notificationSettings.email) {
      try {
        await this.sendEmailNotification(email, report);
      } catch (error: any) {
        console.error(
          `Failed to send email notification to ${email}:`,
          error
        );
      }
    }

    // Webhook notifications removed
  }

  private async sendEmailNotification(
    email: string,
    report: UnifiedComplianceReport
  ): Promise<void> {
    // Email notification implementation would go here
    console.log(
      `Sending compliance report ${report.reportId} to ${email}`
    );
  }

  // Webhook notification method removed
}

export const complianceFrameworkService =
  new ComplianceFrameworkService(
    new SOC2ComplianceService(),
    new GDPRComplianceService()
  );
