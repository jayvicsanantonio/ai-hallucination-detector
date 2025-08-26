"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GDPRChecker = void 0;
class GDPRChecker {
    constructor() {
        this.GDPR_PATTERNS = [
            {
                name: 'Consent Violation',
                pattern: /\b(collect|process|use|share)\s+.*\s+(without|no)\s+(consent|permission|authorization)\b/gi,
                severity: 'critical',
                description: 'Processing personal data without consent',
            },
            {
                name: 'Automatic Processing',
                pattern: /\b(automatically|auto)\s+(process|share|transfer|collect)\s+.*\s+(personal\s+)?data\b/gi,
                severity: 'high',
                description: 'Automatic processing of personal data without proper safeguards',
            },
            {
                name: 'Third Party Sharing',
                pattern: /\b(share|transfer|provide)\s+.*\s+(personal\s+)?data\s+.*\s+(third\s+part(y|ies)|partner|vendor)\b/gi,
                severity: 'high',
                description: 'Sharing personal data with third parties',
            },
            {
                name: 'Data Retention',
                pattern: /\b(keep|store|retain)\s+.*\s+(personal\s+)?data\s+.*\s+(indefinitely|forever|permanently)\b/gi,
                severity: 'high',
                description: 'Indefinite retention of personal data',
            },
        ];
        this.PERSONAL_DATA_INDICATORS = [
            { keyword: 'email address', severity: 'medium' },
            { keyword: 'phone number', severity: 'medium' },
            { keyword: 'home address', severity: 'medium' },
            { keyword: 'ip address', severity: 'medium' },
            { keyword: 'cookie', severity: 'low' },
            { keyword: 'tracking', severity: 'medium' },
            { keyword: 'location data', severity: 'high' },
            { keyword: 'biometric', severity: 'critical' },
            { keyword: 'genetic', severity: 'critical' },
            { keyword: 'health data', severity: 'critical' },
        ];
        this.GDPR_RIGHTS_KEYWORDS = [
            'right to access',
            'right to rectification',
            'right to erasure',
            'right to portability',
            'right to object',
            'data subject rights',
        ];
    }
    async checkCompliance(content) {
        const violations = [];
        const text = content.extractedText;
        // Check for GDPR violation patterns
        for (const pattern of this.GDPR_PATTERNS) {
            const matches = Array.from(text.matchAll(pattern.pattern));
            for (const match of matches) {
                if (match.index !== undefined) {
                    violations.push({
                        ruleId: `gdpr-pattern-${pattern.name
                            .toLowerCase()
                            .replace(/\s+/g, '-')}`,
                        rule: {
                            id: `gdpr-pattern-${pattern.name
                                .toLowerCase()
                                .replace(/\s+/g, '-')}`,
                            ruleText: `GDPR requires lawful basis and proper safeguards for personal data processing`,
                            regulation: 'GDPR',
                            jurisdiction: 'EU',
                            domain: 'legal',
                            severity: pattern.severity,
                            examples: [],
                            keywords: [],
                            patterns: [pattern.pattern.source],
                            lastUpdated: new Date(),
                            isActive: true,
                        },
                        violationType: 'pattern_match',
                        location: {
                            start: match.index,
                            end: match.index + match[0].length,
                            text: match[0],
                        },
                        confidence: 90,
                        severity: pattern.severity,
                        description: pattern.description,
                        regulatoryReference: 'GDPR Articles 6, 7, and 13',
                        suggestedFix: 'Ensure proper legal basis and consent mechanisms for personal data processing',
                    });
                }
            }
        }
        // Check for personal data indicators
        const lowerText = text.toLowerCase();
        for (const { keyword, severity } of this
            .PERSONAL_DATA_INDICATORS) {
            const keywordIndex = lowerText.indexOf(keyword);
            if (keywordIndex !== -1) {
                const context = this.extractContext(text, keywordIndex, 100);
                const riskLevel = this.assessPersonalDataRisk(keyword, context);
                if (riskLevel > 0.5) {
                    violations.push({
                        ruleId: `gdpr-personal-data-${keyword.replace(/\s+/g, '-')}`,
                        rule: {
                            id: `gdpr-personal-data-${keyword.replace(/\s+/g, '-')}`,
                            ruleText: `GDPR requires proper handling of ${keyword}`,
                            regulation: 'GDPR',
                            jurisdiction: 'EU',
                            domain: 'legal',
                            severity: severity,
                            examples: [],
                            keywords: [keyword],
                            patterns: [],
                            lastUpdated: new Date(),
                            isActive: true,
                        },
                        violationType: 'keyword_match',
                        location: {
                            start: keywordIndex,
                            end: keywordIndex + keyword.length,
                            text: keyword,
                        },
                        confidence: Math.round(riskLevel * 100),
                        severity: severity,
                        description: `Personal data type "${keyword}" detected - ensure GDPR compliance`,
                        regulatoryReference: 'GDPR Article 4 (Definition of Personal Data)',
                        suggestedFix: 'Implement appropriate technical and organizational measures for personal data protection',
                    });
                }
            }
        }
        // Check for missing data subject rights information
        const rightsViolations = this.checkDataSubjectRights(content);
        violations.push(...rightsViolations);
        // Check for cross-border data transfers
        const transferViolations = this.checkDataTransfers(content);
        violations.push(...transferViolations);
        return violations;
    }
    extractContext(text, index, radius) {
        const start = Math.max(0, index - radius);
        const end = Math.min(text.length, index + radius);
        return text.substring(start, end);
    }
    assessPersonalDataRisk(keyword, context) {
        const lowerContext = context.toLowerCase();
        // High risk indicators
        const highRiskIndicators = [
            'collect',
            'store',
            'process',
            'share',
            'transfer',
            'without consent',
            'automatically',
            'third party',
        ];
        // Low risk indicators (proper GDPR language)
        const lowRiskIndicators = [
            'with consent',
            'lawful basis',
            'legitimate interest',
            'data protection',
            'privacy policy',
            'opt-in',
        ];
        let riskScore = 0.3; // Base risk for personal data
        for (const indicator of highRiskIndicators) {
            if (lowerContext.includes(indicator)) {
                riskScore += 0.3;
            }
        }
        for (const indicator of lowRiskIndicators) {
            if (lowerContext.includes(indicator)) {
                riskScore -= 0.2;
            }
        }
        return Math.min(1.0, Math.max(0.0, riskScore));
    }
    checkDataSubjectRights(content) {
        const violations = [];
        const text = content.extractedText.toLowerCase();
        // Check if document mentions personal data but lacks data subject rights information
        const hasPersonalDataMention = this.PERSONAL_DATA_INDICATORS.some((indicator) => text.includes(indicator.keyword));
        if (hasPersonalDataMention) {
            const hasRightsMention = this.GDPR_RIGHTS_KEYWORDS.some((right) => text.includes(right.toLowerCase()));
            if (!hasRightsMention) {
                violations.push({
                    ruleId: 'gdpr-missing-rights',
                    rule: {
                        id: 'gdpr-missing-rights',
                        ruleText: 'GDPR requires informing data subjects of their rights',
                        regulation: 'GDPR',
                        jurisdiction: 'EU',
                        domain: 'legal',
                        severity: 'high',
                        examples: [],
                        keywords: this.GDPR_RIGHTS_KEYWORDS,
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
                    confidence: 80,
                    severity: 'high',
                    description: 'Document processes personal data but lacks information about data subject rights',
                    regulatoryReference: 'GDPR Articles 13 and 14',
                    suggestedFix: 'Include information about data subject rights (access, rectification, erasure, portability, objection)',
                });
            }
        }
        return violations;
    }
    checkDataTransfers(content) {
        const violations = [];
        const text = content.extractedText.toLowerCase();
        const transferKeywords = [
            'transfer to',
            'send to',
            'share with',
            'provide to',
            'third country',
            'outside eu',
            'international transfer',
        ];
        const adequacyKeywords = [
            'adequacy decision',
            'standard contractual clauses',
            'binding corporate rules',
            'certification',
        ];
        for (const keyword of transferKeywords) {
            const keywordIndex = text.indexOf(keyword);
            if (keywordIndex !== -1) {
                const context = this.extractContext(content.extractedText, keywordIndex, 200);
                const hasAdequacySafeguards = adequacyKeywords.some((safeguard) => context.toLowerCase().includes(safeguard));
                if (!hasAdequacySafeguards) {
                    violations.push({
                        ruleId: 'gdpr-transfer-safeguards',
                        rule: {
                            id: 'gdpr-transfer-safeguards',
                            ruleText: 'GDPR requires appropriate safeguards for international data transfers',
                            regulation: 'GDPR',
                            jurisdiction: 'EU',
                            domain: 'legal',
                            severity: 'high',
                            examples: [],
                            keywords: transferKeywords,
                            patterns: [],
                            lastUpdated: new Date(),
                            isActive: true,
                        },
                        violationType: 'keyword_match',
                        location: {
                            start: keywordIndex,
                            end: keywordIndex + keyword.length,
                            text: keyword,
                        },
                        confidence: 75,
                        severity: 'high',
                        description: 'International data transfer mentioned without adequate safeguards',
                        regulatoryReference: 'GDPR Chapter V (Articles 44-49)',
                        suggestedFix: 'Ensure appropriate safeguards are in place for international data transfers',
                    });
                }
            }
        }
        return violations;
    }
}
exports.GDPRChecker = GDPRChecker;
//# sourceMappingURL=GDPRChecker.js.map