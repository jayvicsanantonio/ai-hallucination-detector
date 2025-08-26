"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceReporter = void 0;
/**
 * Compliance reporting service that generates comprehensive reports
 * with severity levels, regulatory references, and audit trails
 */
class ComplianceReporter {
    constructor(complianceRepository, auditRepository) {
        this.complianceRepository = complianceRepository;
        this.auditRepository = auditRepository;
    }
    /**
     * Generate a comprehensive compliance report for a verification session
     */
    async generateReport(sessionId, organizationId, domain, checkResult, reportType = 'detailed_analysis') {
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
            const violationReports = await this.createViolationReports(checkResult.violations, domain);
            // Generate recommendations
            const recommendations = this.generateRecommendations(checkResult.violations, domain);
            // Collect regulatory references
            const regulatoryReferences = await this.collectRegulatoryReferences(checkResult.violations);
            // Get audit trail for the session
            const auditTrail = await this.getSessionAuditTrail(sessionId);
            const report = {
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
            await this.logAuditEvent(sessionId, 'compliance_report_generated', {
                reportId,
                violationCount: checkResult.violations.length,
                complianceScore: checkResult.complianceScore,
            });
            return report;
        }
        catch (error) {
            // Log report generation failure
            await this.logAuditEvent(sessionId, 'compliance_report_failed', {
                reportId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    /**
     * Generate compliance metrics and trends for an organization
     */
    async generateMetrics(organizationId, domain, timeRange) {
        const stats = await this.complianceRepository.getViolationStats(domain, timeRange);
        // Calculate compliance score based on violation trends
        const complianceScore = this.calculateComplianceScore(stats);
        // Determine risk level
        const riskLevel = this.determineRiskLevel(stats);
        // Analyze violation trends
        const violationTrends = this.analyzeViolationTrends(stats.trendsOverTime);
        // Identify top violation types
        const topViolationTypes = await this.getTopViolationTypes(stats.violationsByRule);
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
    async exportReport(report, format) {
        await this.logAuditEvent(report.sessionId, 'compliance_report_exported', {
            reportId: report.id,
            format,
        });
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
    generateReportSummary(checkResult) {
        const violationsBySeverity = checkResult.violations.reduce((acc, violation) => {
            acc[violation.severity] = (acc[violation.severity] || 0) + 1;
            return acc;
        }, {});
        const failedRules = new Set(checkResult.violations.map((v) => v.ruleId)).size;
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
    async createViolationReports(violations, domain) {
        return Promise.all(violations.map(async (violation) => {
            const impact = this.assessViolationImpact(violation, domain);
            const urgency = this.assessViolationUrgency(violation);
            const remediation = this.createRemediationPlan(violation);
            const regulatoryContext = await this.getRegulatoryContext(violation.rule);
            return {
                violation,
                impact,
                urgency,
                remediation,
                regulatoryContext,
            };
        }));
    }
    generateRecommendations(violations, domain) {
        const recommendations = [];
        // Group violations by severity
        const criticalViolations = violations.filter((v) => v.severity === 'critical');
        const highViolations = violations.filter((v) => v.severity === 'high');
        if (criticalViolations.length > 0) {
            recommendations.push(`Immediate action required: ${criticalViolations.length} critical compliance violations detected. Review and remediate immediately to avoid regulatory penalties.`);
        }
        if (highViolations.length > 0) {
            recommendations.push(`High priority: ${highViolations.length} high-severity violations require attention within 24-48 hours.`);
        }
        // Domain-specific recommendations
        const domainRecommendations = this.getDomainSpecificRecommendations(violations, domain);
        recommendations.push(...domainRecommendations);
        return recommendations;
    }
    async collectRegulatoryReferences(violations) {
        const references = new Map();
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
            }
            else {
                const existing = references.get(key);
                if (!existing.applicableDomains.includes(violation.rule.domain)) {
                    existing.applicableDomains.push(violation.rule.domain);
                }
            }
        }
        return Array.from(references.values());
    }
    async getSessionAuditTrail(sessionId) {
        return await this.auditRepository.getEntriesBySession(sessionId);
    }
    assessViolationImpact(violation, domain) {
        // Base impact on severity
        let impact = violation.severity;
        // Adjust based on domain-specific factors
        const highImpactDomains = ['healthcare', 'financial'];
        if (highImpactDomains.includes(domain) &&
            violation.severity !== 'low') {
            // Escalate impact for high-risk domains
            const impactLevels = ['low', 'medium', 'high', 'critical'];
            const currentIndex = impactLevels.indexOf(impact);
            impact = impactLevels[Math.min(currentIndex + 1, 3)];
        }
        return impact;
    }
    assessViolationUrgency(violation) {
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
    createRemediationPlan(violation) {
        const priority = this.calculateRemediationPriority(violation);
        const estimatedEffort = this.estimateRemediationEffort(violation);
        const suggestedActions = this.generateRemediationActions(violation);
        return {
            priority,
            estimatedEffort,
            suggestedActions,
            status: 'pending',
        };
    }
    async getRegulatoryContext(rule) {
        return {
            regulation: rule.regulation,
            section: this.extractSection(rule.ruleText),
            description: rule.ruleText,
            penalties: this.getPenalties(rule.regulation, rule.domain),
            precedents: [], // Would be populated from a regulatory database
            lastUpdated: rule.lastUpdated,
        };
    }
    calculateRemediationPriority(violation) {
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
    estimateRemediationEffort(violation) {
        // Simple heuristic based on violation type and severity
        if (violation.violationType === 'semantic_match') {
            return 'high'; // Semantic issues often require more complex fixes
        }
        if (violation.severity === 'critical' ||
            violation.severity === 'high') {
            return 'medium';
        }
        return 'low';
    }
    generateRemediationActions(violation) {
        const actions = [];
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
        actions.push(`Verify compliance with ${violation.rule.regulation}`);
        actions.push('Document remediation steps taken');
        return actions;
    }
    getDomainSpecificRecommendations(violations, domain) {
        const recommendations = [];
        switch (domain) {
            case 'healthcare':
                if (violations.some((v) => v.rule.regulation.includes('HIPAA'))) {
                    recommendations.push('Ensure all patient information is properly protected and anonymized according to HIPAA requirements.');
                }
                break;
            case 'financial':
                if (violations.some((v) => v.rule.regulation.includes('SOX'))) {
                    recommendations.push('Review financial disclosures and ensure accuracy of all numerical data per SOX requirements.');
                }
                break;
            case 'legal':
                if (violations.some((v) => v.rule.regulation.includes('GDPR'))) {
                    recommendations.push('Verify data processing consent and implement proper data subject rights handling per GDPR.');
                }
                break;
        }
        return recommendations;
    }
    extractSection(ruleText) {
        // Simple extraction - in practice, this would be more sophisticated
        const sectionMatch = ruleText.match(/Section\s+(\d+(?:\.\d+)*)/i);
        return sectionMatch ? sectionMatch[1] : 'General';
    }
    getPenalties(regulation, domain) {
        // This would typically come from a regulatory database
        const penalties = {
            HIPAA: [
                'Up to $1.5M per incident',
                'Criminal charges possible',
            ],
            SOX: ['Up to $5M fine', 'Up to 20 years imprisonment'],
            GDPR: ['Up to 4% of annual revenue', 'Up to €20M fine'],
        };
        return (penalties[regulation] || ['Regulatory penalties may apply']);
    }
    calculateComplianceScore(stats) {
        if (stats.totalViolations === 0)
            return 100;
        // Simple scoring algorithm - could be more sophisticated
        const criticalWeight = 25;
        const highWeight = 15;
        const mediumWeight = 8;
        const lowWeight = 3;
        const penalties = (stats.violationsBySeverity.critical || 0) * criticalWeight +
            (stats.violationsBySeverity.high || 0) * highWeight +
            (stats.violationsBySeverity.medium || 0) * mediumWeight +
            (stats.violationsBySeverity.low || 0) * lowWeight;
        return Math.max(0, 100 - penalties);
    }
    determineRiskLevel(stats) {
        const critical = stats.violationsBySeverity.critical || 0;
        const high = stats.violationsBySeverity.high || 0;
        const medium = stats.violationsBySeverity.medium || 0;
        if (critical > 0)
            return 'critical';
        if (high > 2)
            return 'critical';
        if (high > 0 || medium > 5)
            return 'high';
        if (medium > 0)
            return 'medium';
        return 'low';
    }
    analyzeViolationTrends(trendsOverTime) {
        // For now, return the data as-is with 'mixed' severity
        // In practice, this would analyze trends by severity
        return trendsOverTime.map((trend) => ({
            ...trend,
            severity: 'mixed',
        }));
    }
    async getTopViolationTypes(violationsByRule) {
        const topRules = Object.entries(violationsByRule)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);
        const results = [];
        for (const [ruleId, count] of topRules) {
            const rule = await this.complianceRepository.getRuleById(ruleId);
            results.push({
                ruleId,
                regulation: rule?.regulation || 'Unknown',
                count,
                trend: 'stable', // Would calculate actual trend
            });
        }
        return results;
    }
    async getComplianceByDomain(organizationId, timeRange) {
        const domains = ['legal', 'financial', 'healthcare', 'insurance'];
        const result = {};
        for (const domain of domains) {
            const stats = await this.complianceRepository.getViolationStats(domain, timeRange);
            result[domain] = {
                score: this.calculateComplianceScore(stats),
                violations: stats.totalViolations,
                riskLevel: this.determineRiskLevel(stats),
            };
        }
        return result;
    }
    exportToCsv(report) {
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
    exportToXml(report) {
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
    generateReportId() {
        return `compliance-report-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`;
    }
    async logAuditEvent(sessionId, action, details) {
        try {
            await this.auditRepository.createEntry({
                sessionId,
                timestamp: new Date(),
                action: action,
                component: 'ComplianceReporter',
                details,
                success: true,
                severity: 'info',
            });
        }
        catch (error) {
            console.error('Failed to log audit event:', error);
        }
    }
}
exports.ComplianceReporter = ComplianceReporter;
//# sourceMappingURL=ComplianceReporter.js.map