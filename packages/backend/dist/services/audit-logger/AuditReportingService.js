"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditReportingService = void 0;
class AuditReportingService {
    constructor(auditRepository, logger) {
        this.auditRepository = auditRepository;
        this.logger = logger;
    }
    /**
     * Generate comprehensive audit report
     */
    async generateAuditReport(filter, format = 'json', generatedBy) {
        try {
            const query = {
                organizationId: filter.organizationId,
                startDate: filter.startDate,
                endDate: filter.endDate,
                action: filter.actions?.[0], // Simplified for single action queries
                severity: filter.severities?.[0], // Simplified for single severity queries
                component: filter.components?.[0], // Simplified for single component queries
                userId: filter.userIds?.[0], // Simplified for single user queries
                success: filter.successOnly
                    ? true
                    : filter.failuresOnly
                        ? false
                        : undefined,
                limit: 10000, // Reasonable limit for reports
            };
            const [entries, summary] = await Promise.all([
                this.auditRepository.queryAuditEntries(query),
                this.auditRepository.getAuditSummary(filter.organizationId, filter.startDate, filter.endDate),
            ]);
            const report = {
                id: this.generateReportId(),
                organizationId: filter.organizationId,
                filter,
                summary,
                entries,
                generatedAt: new Date(),
                generatedBy,
                format,
            };
            this.logger.info('Generated audit report', {
                reportId: report.id,
                organizationId: filter.organizationId,
                entryCount: entries.length,
                format,
            });
            return report;
        }
        catch (error) {
            this.logger.error('Failed to generate audit report', {
                error,
                filter,
            });
            throw error;
        }
    }
    /**
     * Generate compliance-focused report
     */
    async generateComplianceReport(organizationId, startDate, endDate) {
        try {
            // Query compliance-related entries
            const complianceEntries = await this.auditRepository.queryAuditEntries({
                organizationId,
                startDate,
                endDate,
                limit: 50000,
            });
            const complianceActions = [
                'compliance_check_started',
                'compliance_check_completed',
                'violation_detected',
                'rule_applied',
            ];
            const relevantEntries = complianceEntries.filter((entry) => complianceActions.includes(entry.action));
            // Analyze compliance data
            const totalVerifications = complianceEntries.filter((e) => e.action === 'verification_completed').length;
            const complianceChecks = relevantEntries.filter((e) => e.action === 'compliance_check_completed').length;
            const violations = relevantEntries.filter((e) => e.action === 'violation_detected');
            const violationsByType = this.groupBy(violations, (entry) => entry.details.violationType || 'unknown');
            const violationsBySeverity = this.groupBy(violations, (entry) => entry.severity);
            const topViolatedRules = this.getTopViolatedRules(violations);
            const userActivity = await this.getUserActivity(organizationId, startDate, endDate);
            const systemPerformance = this.calculateSystemPerformance(complianceEntries);
            const recommendations = this.generateComplianceRecommendations(violations, systemPerformance);
            const report = {
                organizationId,
                period: { startDate, endDate },
                totalVerifications,
                complianceChecks,
                violationsDetected: violations.length,
                violationsByType,
                violationsBySeverity,
                topViolatedRules,
                userActivity,
                systemPerformance,
                recommendations,
            };
            this.logger.info('Generated compliance report', {
                organizationId,
                totalVerifications,
                violationsDetected: violations.length,
            });
            return report;
        }
        catch (error) {
            this.logger.error('Failed to generate compliance report', {
                error,
                organizationId,
            });
            throw error;
        }
    }
    /**
     * Generate security-focused report
     */
    async generateSecurityReport(organizationId, startDate, endDate) {
        try {
            const securityEntries = await this.auditRepository.queryAuditEntries({
                organizationId,
                startDate,
                endDate,
                limit: 50000,
            });
            const authEvents = securityEntries.filter((e) => e.action === 'user_authenticated');
            const authFailures = securityEntries.filter((e) => e.action === 'user_authorized' && !e.success);
            const suspiciousActivities = securityEntries.filter((e) => e.action === 'security_event' &&
                e.details.event === 'suspicious_activity');
            const securityIncidents = securityEntries.filter((e) => e.severity === 'critical' ||
                (e.severity === 'error' && e.action === 'security_event'));
            const accessPatterns = this.analyzeAccessPatterns(securityEntries);
            const riskAssessment = this.assessSecurityRisk(authFailures.length, suspiciousActivities.length, securityIncidents.length);
            const recommendations = this.generateSecurityRecommendations(riskAssessment, authFailures.length, suspiciousActivities.length);
            const report = {
                organizationId,
                period: { startDate, endDate },
                authenticationEvents: authEvents.length,
                authorizationFailures: authFailures.length,
                suspiciousActivities: suspiciousActivities.length,
                accessPatterns,
                securityIncidents,
                riskAssessment,
                recommendations,
            };
            this.logger.info('Generated security report', {
                organizationId,
                riskAssessment,
                incidentCount: securityIncidents.length,
            });
            return report;
        }
        catch (error) {
            this.logger.error('Failed to generate security report', {
                error,
                organizationId,
            });
            throw error;
        }
    }
    /**
     * Export report in specified format
     */
    async exportReport(report, format) {
        try {
            switch (format) {
                case 'json':
                    return JSON.stringify(report, null, 2);
                case 'csv':
                    return this.convertToCSV(report);
                case 'pdf':
                    return this.convertToPDF(report);
                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }
        }
        catch (error) {
            this.logger.error('Failed to export report', { error, format });
            throw error;
        }
    }
    /**
     * Query audit entries with advanced filtering
     */
    async queryAuditEntries(query) {
        try {
            return await this.auditRepository.queryAuditEntries(query);
        }
        catch (error) {
            this.logger.error('Failed to query audit entries', {
                error,
                query,
            });
            throw error;
        }
    }
    /**
     * Get audit trends over time
     */
    async getAuditTrends(organizationId, startDate, endDate, granularity = 'day') {
        try {
            const entries = await this.auditRepository.queryAuditEntries({
                organizationId,
                startDate,
                endDate,
                limit: 100000,
            });
            const trends = this.calculateTrends(entries, granularity);
            this.logger.debug('Calculated audit trends', {
                organizationId,
                granularity,
                periodCount: trends.length,
            });
            return trends;
        }
        catch (error) {
            this.logger.error('Failed to get audit trends', {
                error,
                organizationId,
            });
            throw error;
        }
    }
    groupBy(array, keyFn) {
        return array.reduce((acc, item) => {
            const key = keyFn(item);
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
    }
    getTopViolatedRules(violations) {
        const ruleCounts = this.groupBy(violations, (entry) => entry.details.ruleId || 'unknown');
        return Object.entries(ruleCounts)
            .map(([ruleId, count]) => ({
            ruleId,
            count,
            regulation: violations.find((v) => v.details.ruleId === ruleId)?.details
                .regulation || 'unknown',
        }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }
    async getUserActivity(organizationId, startDate, endDate) {
        const entries = await this.auditRepository.queryAuditEntries({
            organizationId,
            startDate,
            endDate,
            limit: 50000,
        });
        const userMap = new Map();
        entries.forEach((entry) => {
            if (!entry.userId)
                return;
            if (!userMap.has(entry.userId)) {
                userMap.set(entry.userId, {
                    verifications: 0,
                    violations: 0,
                });
            }
            const stats = userMap.get(entry.userId);
            if (entry.action === 'verification_completed') {
                stats.verifications++;
            }
            else if (entry.action === 'violation_detected') {
                stats.violations++;
            }
        });
        return Array.from(userMap.entries()).map(([userId, stats]) => ({
            userId,
            ...stats,
        }));
    }
    calculateSystemPerformance(entries) {
        const processingTimes = entries
            .filter((e) => e.duration !== undefined)
            .map((e) => e.duration);
        const averageProcessingTime = processingTimes.length > 0
            ? processingTimes.reduce((sum, time) => sum + time, 0) /
                processingTimes.length
            : 0;
        const totalEntries = entries.length;
        const successfulEntries = entries.filter((e) => e.success).length;
        const successRate = totalEntries > 0 ? (successfulEntries / totalEntries) * 100 : 0;
        const errorRate = 100 - successRate;
        return {
            averageProcessingTime: Math.round(averageProcessingTime),
            successRate: Math.round(successRate * 100) / 100,
            errorRate: Math.round(errorRate * 100) / 100,
        };
    }
    generateComplianceRecommendations(violations, performance) {
        const recommendations = [];
        if (violations.length > 100) {
            recommendations.push('High number of compliance violations detected. Consider reviewing and updating compliance rules.');
        }
        if (performance.errorRate > 10) {
            recommendations.push('Error rate is above 10%. Investigate system issues and improve error handling.');
        }
        if (performance.successRate < 95) {
            recommendations.push('Success rate is below 95%. Review system performance and optimize processing pipeline.');
        }
        const criticalViolations = violations.filter((v) => v.severity === 'critical');
        if (criticalViolations.length > 0) {
            recommendations.push(`${criticalViolations.length} critical violations found. Immediate attention required.`);
        }
        return recommendations;
    }
    analyzeAccessPatterns(entries) {
        const userAccess = new Map();
        entries.forEach((entry) => {
            if (!entry.userId)
                return;
            const existing = userAccess.get(entry.userId);
            if (!existing || entry.timestamp > existing.lastAccess) {
                userAccess.set(entry.userId, {
                    count: (existing?.count || 0) + 1,
                    lastAccess: entry.timestamp,
                });
            }
        });
        return Array.from(userAccess.entries()).map(([userId, data]) => ({
            userId,
            accessCount: data.count,
            lastAccess: data.lastAccess,
        }));
    }
    assessSecurityRisk(authFailures, suspiciousActivities, securityIncidents) {
        if (securityIncidents > 10 || suspiciousActivities > 50) {
            return 'critical';
        }
        else if (securityIncidents > 5 ||
            suspiciousActivities > 20 ||
            authFailures > 100) {
            return 'high';
        }
        else if (securityIncidents > 1 ||
            suspiciousActivities > 5 ||
            authFailures > 20) {
            return 'medium';
        }
        else {
            return 'low';
        }
    }
    generateSecurityRecommendations(riskLevel, authFailures, suspiciousActivities) {
        const recommendations = [];
        if (riskLevel === 'critical' || riskLevel === 'high') {
            recommendations.push('Immediate security review required. Consider implementing additional security measures.');
        }
        if (authFailures > 50) {
            recommendations.push('High number of authentication failures. Review user access policies and implement account lockout mechanisms.');
        }
        if (suspiciousActivities > 10) {
            recommendations.push('Multiple suspicious activities detected. Enhance monitoring and consider implementing behavioral analysis.');
        }
        return recommendations;
    }
    calculateTrends(entries, granularity) {
        const periodMap = new Map();
        entries.forEach((entry) => {
            const period = this.getPeriodKey(entry.timestamp, granularity);
            const existing = periodMap.get(period) || {
                total: 0,
                successful: 0,
            };
            existing.total++;
            if (entry.success) {
                existing.successful++;
            }
            periodMap.set(period, existing);
        });
        return Array.from(periodMap.entries()).map(([period, data]) => ({
            period,
            count: data.total,
            successRate: data.total > 0 ? (data.successful / data.total) * 100 : 0,
        }));
    }
    getPeriodKey(date, granularity) {
        switch (granularity) {
            case 'hour':
                return date.toISOString().substring(0, 13);
            case 'day':
                return date.toISOString().substring(0, 10);
            case 'week':
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                return weekStart.toISOString().substring(0, 10);
            default:
                return date.toISOString().substring(0, 10);
        }
    }
    convertToCSV(report) {
        // Simplified CSV conversion - would need more sophisticated implementation
        return JSON.stringify(report);
    }
    convertToPDF(report) {
        // Placeholder for PDF conversion - would need PDF library integration
        return JSON.stringify(report);
    }
    generateReportId() {
        return `report_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`;
    }
}
exports.AuditReportingService = AuditReportingService;
//# sourceMappingURL=AuditReportingService.js.map