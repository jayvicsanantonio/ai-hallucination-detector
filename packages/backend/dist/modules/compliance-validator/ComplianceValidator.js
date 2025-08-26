"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceValidator = void 0;
const HIPAAChecker_1 = require("./industry-checkers/HIPAAChecker");
const SOXChecker_1 = require("./industry-checkers/SOXChecker");
const GDPRChecker_1 = require("./industry-checkers/GDPRChecker");
class ComplianceValidator {
    constructor(rulesEngine) {
        this.rulesEngine = rulesEngine;
        this.hipaaChecker = new HIPAAChecker_1.HIPAAChecker();
        this.soxChecker = new SOXChecker_1.SOXChecker();
        this.gdprChecker = new GDPRChecker_1.GDPRChecker();
    }
    async validateCompliance(content, domain, jurisdiction = 'US') {
        // Get applicable rules for the domain and jurisdiction
        const applicableRules = await this.rulesEngine.getApplicableRules(domain, jurisdiction);
        const violations = [];
        // Run general rule-based compliance checks
        const generalViolations = await this.checkGeneralCompliance(content, applicableRules);
        violations.push(...generalViolations);
        // Run industry-specific compliance checks
        const industryViolations = await this.checkIndustrySpecificCompliance(content, domain);
        violations.push(...industryViolations);
        // Calculate overall risk and compliance score
        const overallRisk = this.calculateOverallRisk(violations);
        const complianceScore = this.calculateComplianceScore(violations, applicableRules.length);
        return {
            violations,
            overallRisk,
            complianceScore,
            checkedRules: applicableRules.length,
            applicableRules,
        };
    }
    async checkGeneralCompliance(content, rules) {
        const violations = [];
        for (const rule of rules) {
            const ruleViolations = await this.checkRuleViolations(content, rule);
            violations.push(...ruleViolations);
        }
        return violations;
    }
    async checkRuleViolations(content, rule) {
        const violations = [];
        const text = content.extractedText.toLowerCase();
        // Check keyword matches
        for (const keyword of rule.keywords) {
            const matches = this.findKeywordMatches(text, keyword.toLowerCase());
            for (const match of matches) {
                violations.push({
                    ruleId: rule.id,
                    rule,
                    violationType: 'keyword_match',
                    location: match,
                    confidence: 85,
                    severity: rule.severity,
                    description: `Potential compliance violation: Found keyword "${keyword}" which may violate ${rule.regulation}`,
                    regulatoryReference: `${rule.regulation} - ${rule.ruleText}`,
                    suggestedFix: `Review content for compliance with ${rule.regulation} requirements`,
                });
            }
        }
        // Check pattern matches
        for (const pattern of rule.patterns) {
            const matches = this.findPatternMatches(text, pattern);
            for (const match of matches) {
                violations.push({
                    ruleId: rule.id,
                    rule,
                    violationType: 'pattern_match',
                    location: match,
                    confidence: 90,
                    severity: rule.severity,
                    description: `Pattern match violation: Content matches restricted pattern for ${rule.regulation}`,
                    regulatoryReference: `${rule.regulation} - ${rule.ruleText}`,
                    suggestedFix: `Modify content to comply with ${rule.regulation} pattern restrictions`,
                });
            }
        }
        return violations;
    }
    async checkIndustrySpecificCompliance(content, domain) {
        const violations = [];
        switch (domain) {
            case 'healthcare':
                const hipaaViolations = await this.hipaaChecker.checkCompliance(content);
                violations.push(...hipaaViolations);
                break;
            case 'financial':
                const soxViolations = await this.soxChecker.checkCompliance(content);
                violations.push(...soxViolations);
                break;
            case 'legal':
                const gdprViolations = await this.gdprChecker.checkCompliance(content);
                violations.push(...gdprViolations);
                break;
        }
        return violations;
    }
    findKeywordMatches(text, keyword) {
        const matches = [];
        let index = 0;
        while ((index = text.indexOf(keyword, index)) !== -1) {
            matches.push({
                start: index,
                end: index + keyword.length,
                text: text.substring(index, index + keyword.length),
            });
            index += keyword.length;
        }
        return matches;
    }
    findPatternMatches(text, pattern) {
        const matches = [];
        try {
            const regex = new RegExp(pattern, 'gi');
            let match;
            while ((match = regex.exec(text)) !== null) {
                matches.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    text: match[0],
                });
            }
        }
        catch (error) {
            console.warn(`Invalid regex pattern: ${pattern}`, error);
        }
        return matches;
    }
    calculateOverallRisk(violations) {
        if (violations.length === 0)
            return 'low';
        const criticalCount = violations.filter((v) => v.severity === 'critical').length;
        const highCount = violations.filter((v) => v.severity === 'high').length;
        const mediumCount = violations.filter((v) => v.severity === 'medium').length;
        if (criticalCount > 0)
            return 'critical';
        if (highCount > 2)
            return 'critical';
        if (highCount > 0 || mediumCount > 5)
            return 'high';
        if (mediumCount > 0)
            return 'medium';
        return 'low';
    }
    calculateComplianceScore(violations, totalRules) {
        if (totalRules === 0)
            return 100;
        let penaltyPoints = 0;
        for (const violation of violations) {
            switch (violation.severity) {
                case 'critical':
                    penaltyPoints += 25;
                    break;
                case 'high':
                    penaltyPoints += 15;
                    break;
                case 'medium':
                    penaltyPoints += 8;
                    break;
                case 'low':
                    penaltyPoints += 3;
                    break;
            }
        }
        const score = Math.max(0, 100 - penaltyPoints);
        return Math.round(score);
    }
}
exports.ComplianceValidator = ComplianceValidator;
//# sourceMappingURL=ComplianceValidator.js.map