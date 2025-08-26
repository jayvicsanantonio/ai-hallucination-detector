"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedComplianceValidator = void 0;
const DatabaseRulesEngine_1 = require("./DatabaseRulesEngine");
const HIPAAChecker_1 = require("./industry-checkers/HIPAAChecker");
const SOXChecker_1 = require("./industry-checkers/SOXChecker");
const GDPRChecker_1 = require("./industry-checkers/GDPRChecker");
/**
 * Enhanced compliance validator with database persistence,
 * advanced rule matching, and comprehensive violation tracking
 */
class EnhancedComplianceValidator {
    constructor(repository, rulesEngine) {
        this.repository = repository;
        this.rulesEngine =
            rulesEngine || new DatabaseRulesEngine_1.DatabaseRulesEngine(repository);
        this.hipaaChecker = new HIPAAChecker_1.HIPAAChecker();
        this.soxChecker = new SOXChecker_1.SOXChecker();
        this.gdprChecker = new GDPRChecker_1.GDPRChecker();
    }
    async validateCompliance(content, domain, jurisdiction = 'US', sessionId) {
        // Get applicable rules for the domain and jurisdiction
        const applicableRules = await this.rulesEngine.getApplicableRules(domain, jurisdiction);
        const violations = [];
        // Run general rule-based compliance checks
        const generalViolations = await this.checkGeneralCompliance(content, applicableRules);
        violations.push(...generalViolations);
        // Run industry-specific compliance checks
        const industryViolations = await this.checkIndustrySpecificCompliance(content, domain);
        violations.push(...industryViolations);
        // Run semantic analysis for context-aware violations
        const semanticViolations = await this.checkSemanticCompliance(content, applicableRules, domain);
        violations.push(...semanticViolations);
        // Calculate overall risk and compliance score
        const overallRisk = this.calculateOverallRisk(violations);
        const complianceScore = this.calculateComplianceScore(violations, applicableRules.length);
        // Record violations for audit trail if session ID provided
        if (sessionId) {
            await this.recordViolations(violations, sessionId);
        }
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
        // Enhanced keyword matching with context analysis
        for (const keyword of rule.keywords) {
            const matches = this.findKeywordMatches(text, keyword.toLowerCase());
            for (const match of matches) {
                const context = this.extractContext(content.extractedText, match.start, 100);
                const contextualRisk = this.assessContextualRisk(keyword, context, rule.domain);
                if (contextualRisk > 0.6) {
                    violations.push({
                        ruleId: rule.id,
                        rule,
                        violationType: 'keyword_match',
                        location: match,
                        confidence: Math.round(contextualRisk * 100),
                        severity: rule.severity,
                        description: `Potential compliance violation: Found keyword "${keyword}" in high-risk context for ${rule.regulation}`,
                        regulatoryReference: `${rule.regulation} - ${rule.ruleText}`,
                        suggestedFix: `Review content for compliance with ${rule.regulation} requirements`,
                    });
                }
            }
        }
        // Enhanced pattern matching with confidence scoring
        for (const pattern of rule.patterns) {
            const matches = this.findPatternMatches(text, pattern);
            for (const match of matches) {
                const confidence = this.calculatePatternConfidence(pattern, match.text, rule);
                violations.push({
                    ruleId: rule.id,
                    rule,
                    violationType: 'pattern_match',
                    location: match,
                    confidence,
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
            case 'insurance':
                // Insurance-specific checks would go here
                break;
        }
        return violations;
    }
    async checkSemanticCompliance(content, rules, domain) {
        const violations = [];
        // Check for missing required disclosures
        const missingDisclosures = this.checkRequiredDisclosures(content, domain);
        violations.push(...missingDisclosures);
        // Check for contradictory statements
        const contradictions = this.checkContradictoryStatements(content, rules);
        violations.push(...contradictions);
        return violations;
    }
    checkRequiredDisclosures(content, domain) {
        const violations = [];
        const text = content.extractedText.toLowerCase();
        const requiredDisclosures = {
            financial: [
                'risk disclosure',
                'investment risk',
                'past performance',
            ],
            healthcare: ['privacy notice', 'patient rights', 'hipaa'],
            legal: ['data protection', 'privacy policy', 'consent'],
            insurance: [
                'policy terms',
                'coverage limitations',
                'exclusions',
            ],
        };
        const disclosures = requiredDisclosures[domain] || [];
        for (const disclosure of disclosures) {
            if (!text.includes(disclosure)) {
                violations.push({
                    ruleId: `missing-disclosure-${domain}`,
                    rule: {
                        id: `missing-disclosure-${domain}`,
                        ruleText: `Required disclosure missing for ${domain} domain`,
                        regulation: `${domain.toUpperCase()} Regulations`,
                        jurisdiction: 'US',
                        domain: domain,
                        severity: 'medium',
                        examples: [],
                        keywords: [disclosure],
                        patterns: [],
                        lastUpdated: new Date(),
                        isActive: true,
                    },
                    violationType: 'semantic_match',
                    location: {
                        start: 0,
                        end: 50,
                        text: content.extractedText.substring(0, 50) + '...',
                    },
                    confidence: 85,
                    severity: 'medium',
                    description: `Missing required disclosure: "${disclosure}"`,
                    regulatoryReference: `${domain.toUpperCase()} disclosure requirements`,
                    suggestedFix: `Add required ${disclosure} disclosure to the document`,
                });
            }
        }
        return violations;
    }
    checkContradictoryStatements(content, rules) {
        const violations = [];
        const text = content.extractedText.toLowerCase();
        // Simple contradiction detection patterns
        const contradictionPatterns = [
            {
                positive: 'guaranteed',
                negative: 'may lose',
                severity: 'critical',
            },
            {
                positive: 'risk-free',
                negative: 'risk',
                severity: 'high',
            },
            {
                positive: 'always profitable',
                negative: 'may lose',
                severity: 'critical',
            },
        ];
        for (const pattern of contradictionPatterns) {
            if (text.includes(pattern.positive) &&
                text.includes(pattern.negative)) {
                violations.push({
                    ruleId: 'contradiction-detected',
                    rule: {
                        id: 'contradiction-detected',
                        ruleText: 'Content must not contain contradictory statements',
                        regulation: 'General Compliance',
                        jurisdiction: 'US',
                        domain: 'legal',
                        severity: pattern.severity,
                        examples: [],
                        keywords: [pattern.positive, pattern.negative],
                        patterns: [],
                        lastUpdated: new Date(),
                        isActive: true,
                    },
                    violationType: 'semantic_match',
                    location: {
                        start: text.indexOf(pattern.positive),
                        end: text.indexOf(pattern.positive) +
                            pattern.positive.length,
                        text: pattern.positive,
                    },
                    confidence: 90,
                    severity: pattern.severity,
                    description: `Contradictory statements detected: "${pattern.positive}" and "${pattern.negative}"`,
                    regulatoryReference: 'Truth in advertising and disclosure requirements',
                    suggestedFix: 'Remove contradictory statements and ensure consistent messaging',
                });
            }
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
    extractContext(text, index, radius) {
        const start = Math.max(0, index - radius);
        const end = Math.min(text.length, index + radius);
        return text.substring(start, end);
    }
    assessContextualRisk(keyword, context, domain) {
        const lowerContext = context.toLowerCase();
        let riskScore = 0.3; // Base risk
        // Domain-specific risk indicators
        const riskIndicators = {
            healthcare: [
                'patient',
                'diagnosis',
                'treatment',
                'medical',
                'health',
            ],
            financial: [
                'investment',
                'profit',
                'loss',
                'money',
                'financial',
            ],
            legal: [
                'contract',
                'agreement',
                'legal',
                'liability',
                'rights',
            ],
            insurance: [
                'claim',
                'coverage',
                'policy',
                'premium',
                'benefit',
            ],
        };
        // Low-risk contexts that should reduce the score
        const lowRiskContexts = [
            'system',
            'portal',
            'software',
            'application',
            'update',
            'interface',
            'user experience',
            'technology',
            'platform',
            'service',
        ];
        // Check for low-risk context first
        for (const lowRiskTerm of lowRiskContexts) {
            if (lowerContext.includes(lowRiskTerm)) {
                riskScore -= 0.2;
            }
        }
        const indicators = riskIndicators[domain] || [];
        for (const indicator of indicators) {
            if (lowerContext.includes(indicator)) {
                riskScore += 0.2;
            }
        }
        // General high-risk indicators
        const highRiskTerms = [
            'personal',
            'confidential',
            'private',
            'sensitive',
        ];
        for (const term of highRiskTerms) {
            if (lowerContext.includes(term)) {
                riskScore += 0.3;
            }
        }
        return Math.min(1.0, Math.max(0.0, riskScore));
    }
    calculatePatternConfidence(pattern, matchText, rule) {
        let confidence = 85; // Base confidence
        // Increase confidence for exact matches
        if (matchText.length === pattern.length) {
            confidence += 10;
        }
        // Adjust based on rule severity
        switch (rule.severity) {
            case 'critical':
                confidence += 5;
                break;
            case 'high':
                confidence += 3;
                break;
            case 'medium':
                confidence += 1;
                break;
        }
        return Math.min(100, confidence);
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
    async recordViolations(violations, sessionId) {
        for (const violation of violations) {
            try {
                await this.repository.recordViolation({
                    ...violation,
                    verification_session_id: sessionId,
                });
            }
            catch (error) {
                console.error('Failed to record violation:', error);
            }
        }
    }
    // Public methods for rule management
    async addRule(rule) {
        const validation = this.rulesEngine.validateRule(rule);
        if (!validation.isValid) {
            throw new Error(`Invalid rule: ${validation.errors.join(', ')}`);
        }
        return await this.rulesEngine.addRule(rule);
    }
    async updateRule(ruleId, updates) {
        // Only validate fields that are being updated, not all required fields
        if (Object.keys(updates).length > 0) {
            // Get existing rule to merge with updates for validation
            const existingRule = await this.rulesEngine.getRuleById(ruleId);
            if (!existingRule) {
                throw new Error(`Rule with ID ${ruleId} not found`);
            }
            const mergedRule = { ...existingRule, ...updates };
            const validation = this.rulesEngine.validateRule(mergedRule);
            if (!validation.isValid) {
                throw new Error(`Invalid rule updates: ${validation.errors.join(', ')}`);
            }
        }
        return await this.rulesEngine.updateRule(ruleId, updates);
    }
    async getViolationStats(domain, timeRange) {
        return await this.repository.getViolationStats(domain, timeRange);
    }
}
exports.EnhancedComplianceValidator = EnhancedComplianceValidator;
//# sourceMappingURL=EnhancedComplianceValidator.js.map