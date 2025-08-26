"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegalComplianceChecker = void 0;
class LegalComplianceChecker {
    constructor() {
        this.rules = new Map();
        this.jurisdictionRules = new Map();
        this.initializeComplianceRules();
        this.initializeJurisdictionRules();
    }
    async checkCompliance(content, entities) {
        const issues = [];
        // Check general legal compliance
        issues.push(...this.checkGeneralCompliance(content));
        // Check jurisdiction-specific compliance
        for (const entity of entities) {
            if (entity.jurisdiction) {
                const jurisdictionIssues = await this.checkJurisdictionSpecificCompliance(content, entity.jurisdiction);
                issues.push(...jurisdictionIssues);
            }
        }
        // Check contract law compliance
        issues.push(...this.checkContractLawCompliance(content));
        // Check disclosure requirements
        issues.push(...this.checkDisclosureRequirements(content));
        return issues;
    }
    async checkJurisdictionCompliance(content, jurisdiction) {
        const violations = [];
        const checkedRules = [];
        const jurisdictionRules = this.jurisdictionRules.get(jurisdiction.toLowerCase()) || [];
        for (const rule of jurisdictionRules) {
            checkedRules.push(rule.id);
            if (rule.pattern &&
                !new RegExp(rule.pattern, 'i').test(content)) {
                violations.push({
                    ruleId: rule.id,
                    ruleName: rule.name,
                    description: rule.description,
                    severity: rule.severity,
                    suggestion: rule.suggestion,
                });
            }
            // Check for required clauses
            if (rule.requiredClauses) {
                for (const requiredClause of rule.requiredClauses) {
                    if (!new RegExp(requiredClause, 'i').test(content)) {
                        violations.push({
                            ruleId: `${rule.id}-missing-clause`,
                            ruleName: `${rule.name} - Missing Required Clause`,
                            description: `${rule.description} - Missing required clause: ${requiredClause}`,
                            severity: rule.severity,
                            suggestion: rule.suggestion ||
                                `Add required clause: ${requiredClause}`,
                        });
                    }
                }
            }
            // Check for prohibited terms
            if (rule.prohibitedTerms) {
                for (const term of rule.prohibitedTerms) {
                    if (new RegExp(term, 'i').test(content)) {
                        violations.push({
                            ruleId: `${rule.id}-prohibited`,
                            ruleName: `${rule.name} - Prohibited Term`,
                            description: `Use of prohibited term: ${term}`,
                            severity: rule.severity,
                            suggestion: `Remove or replace the term "${term}"`,
                        });
                    }
                }
            }
        }
        const confidence = violations.length === 0
            ? 95
            : Math.max(20, 95 - violations.length * 10);
        return {
            isCompliant: violations.length === 0,
            violations,
            confidence,
            checkedRules,
        };
    }
    async updateRules(newRules) {
        for (const rule of newRules) {
            this.rules.set(rule.id, rule);
        }
    }
    checkGeneralCompliance(content) {
        const issues = [];
        const text = content.extractedText.toLowerCase();
        // Check for discriminatory language
        const discriminatoryTerms = [
            'race',
            'color',
            'religion',
            'sex',
            'national origin',
            'age',
            'disability',
        ];
        for (const term of discriminatoryTerms) {
            const discriminatoryPattern = new RegExp(`(?:no|not|exclude|prohibit|ban).*${term}`, 'i');
            if (discriminatoryPattern.test(text)) {
                const match = text.match(discriminatoryPattern);
                if (match && match.index !== undefined) {
                    issues.push({
                        id: `discriminatory-language-${Date.now()}`,
                        type: 'compliance_violation',
                        severity: 'critical',
                        location: {
                            start: match.index,
                            end: match.index + match[0].length,
                            line: 1,
                            column: 1,
                        },
                        description: 'Potentially discriminatory language detected',
                        evidence: [match[0]],
                        confidence: 85,
                        moduleSource: 'legal-compliance-checker',
                    });
                }
            }
        }
        // Check for unconscionable terms
        const unconscionableTerms = [
            'waive all rights',
            'unlimited liability',
            'no recourse',
            'absolute discretion',
        ];
        for (const term of unconscionableTerms) {
            if (text.includes(term.toLowerCase())) {
                const index = text.indexOf(term.toLowerCase());
                issues.push({
                    id: `unconscionable-term-${Date.now()}`,
                    type: 'compliance_violation',
                    severity: 'high',
                    location: {
                        start: index,
                        end: index + term.length,
                        line: 1,
                        column: 1,
                    },
                    description: 'Potentially unconscionable contract term detected',
                    evidence: [term],
                    confidence: 75,
                    moduleSource: 'legal-compliance-checker',
                });
            }
        }
        return issues;
    }
    async checkJurisdictionSpecificCompliance(content, jurisdiction) {
        const issues = [];
        const text = content.extractedText.toLowerCase();
        const jurisdictionRules = this.jurisdictionRules.get(jurisdiction.toLowerCase()) || [];
        for (const rule of jurisdictionRules) {
            if (rule.requiredClauses) {
                for (const requiredClause of rule.requiredClauses) {
                    if (!new RegExp(requiredClause, 'i').test(text)) {
                        issues.push({
                            id: `missing-required-clause-${Date.now()}`,
                            type: 'compliance_violation',
                            severity: rule.severity,
                            location: { start: 0, end: 100, line: 1, column: 1 },
                            description: `Missing required clause for ${jurisdiction}: ${rule.name}`,
                            evidence: [`Required: ${requiredClause}`],
                            confidence: 90,
                            moduleSource: 'legal-compliance-checker',
                        });
                    }
                }
            }
            if (rule.prohibitedTerms) {
                for (const prohibitedTerm of rule.prohibitedTerms) {
                    if (new RegExp(prohibitedTerm, 'i').test(text)) {
                        const match = text.match(new RegExp(prohibitedTerm, 'i'));
                        if (match && match.index !== undefined) {
                            issues.push({
                                id: `prohibited-term-${Date.now()}`,
                                type: 'compliance_violation',
                                severity: rule.severity,
                                location: {
                                    start: match.index,
                                    end: match.index + match[0].length,
                                    line: 1,
                                    column: 1,
                                },
                                description: `Prohibited term in ${jurisdiction}: ${prohibitedTerm}`,
                                evidence: [match[0]],
                                confidence: 85,
                                moduleSource: 'legal-compliance-checker',
                            });
                        }
                    }
                }
            }
        }
        return issues;
    }
    checkContractLawCompliance(content) {
        const issues = [];
        const text = content.extractedText.toLowerCase();
        // Check for statute of frauds compliance
        const contractValue = this.extractContractValue(text);
        if (contractValue &&
            contractValue > 500 &&
            !this.hasWrittenSignature(text)) {
            issues.push({
                id: `statute-of-frauds-${Date.now()}`,
                type: 'compliance_violation',
                severity: 'high',
                location: { start: 0, end: 100, line: 1, column: 1 },
                description: 'Contract may violate Statute of Frauds - requires written signature for contracts over $500',
                evidence: [`Contract value: $${contractValue}`],
                confidence: 80,
                moduleSource: 'legal-compliance-checker',
            });
        }
        // Check for capacity requirements
        if (!this.hasCapacityAcknowledgment(text)) {
            issues.push({
                id: `capacity-acknowledgment-${Date.now()}`,
                type: 'compliance_violation',
                severity: 'medium',
                location: { start: 0, end: 100, line: 1, column: 1 },
                description: 'Contract lacks acknowledgment of legal capacity',
                evidence: ['No capacity acknowledgment found'],
                confidence: 70,
                moduleSource: 'legal-compliance-checker',
            });
        }
        return issues;
    }
    checkDisclosureRequirements(content) {
        const issues = [];
        const text = content.extractedText.toLowerCase();
        // Check for required disclosures
        const requiredDisclosures = [
            {
                term: 'right to cancel',
                description: 'Right to cancel disclosure',
            },
            {
                term: 'dispute resolution',
                description: 'Dispute resolution mechanism',
            },
            { term: 'governing law', description: 'Governing law clause' },
        ];
        for (const disclosure of requiredDisclosures) {
            if (!new RegExp(disclosure.term, 'i').test(text)) {
                issues.push({
                    id: `missing-disclosure-${Date.now()}`,
                    type: 'compliance_violation',
                    severity: 'medium',
                    location: { start: 0, end: 100, line: 1, column: 1 },
                    description: `Missing required disclosure: ${disclosure.description}`,
                    evidence: [`Required: ${disclosure.term}`],
                    confidence: 75,
                    moduleSource: 'legal-compliance-checker',
                });
            }
        }
        return issues;
    }
    extractContractValue(text) {
        const valueMatch = text.match(/\$[\d,]+/);
        if (valueMatch) {
            return parseInt(valueMatch[0].replace(/[$,]/g, ''));
        }
        return null;
    }
    hasWrittenSignature(text) {
        return /(?:sign|signature|executed|witnessed)/i.test(text);
    }
    hasCapacityAcknowledgment(text) {
        return /(?:legal age|competent|capacity|authorized)/i.test(text);
    }
    initializeComplianceRules() {
        const complianceRules = [
            {
                id: 'compliance-001',
                name: 'anti-discrimination',
                description: 'Contract must not contain discriminatory language',
                pattern: '(?!.*(?:no|not|exclude|prohibit|ban).*(race|color|religion|sex|national origin|age|disability))',
                severity: 'critical',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'compliance-002',
                name: 'unconscionable-terms',
                description: 'Contract must not contain unconscionable terms',
                severity: 'high',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'compliance-003',
                name: 'statute-of-frauds',
                description: 'Contract must comply with Statute of Frauds requirements',
                severity: 'high',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ];
        complianceRules.forEach((rule) => this.rules.set(rule.id, rule));
    }
    initializeJurisdictionRules() {
        // US Federal rules
        this.jurisdictionRules.set('us', [
            {
                id: 'us-001',
                name: 'Federal Anti-Discrimination',
                description: 'Must comply with federal anti-discrimination laws',
                severity: 'critical',
                prohibitedTerms: [
                    'discriminate based on race',
                    'exclude minorities',
                ],
                requiredClauses: ['equal opportunity'],
            },
        ]);
        // California rules
        this.jurisdictionRules.set('california', [
            {
                id: 'ca-001',
                name: 'California Consumer Protection',
                description: 'Must include California consumer protection disclosures',
                severity: 'high',
                requiredClauses: ['right to cancel within 3 days'],
                suggestion: 'Add California-specific consumer protection language',
            },
        ]);
        // New York rules
        this.jurisdictionRules.set('new york', [
            {
                id: 'ny-001',
                name: 'New York Contract Law',
                description: 'Must comply with New York contract requirements',
                severity: 'medium',
                requiredClauses: ['governing law: new york'],
                suggestion: 'Specify New York governing law',
            },
        ]);
        // European Union rules
        this.jurisdictionRules.set('eu', [
            {
                id: 'eu-001',
                name: 'GDPR Compliance',
                description: 'Must include GDPR data protection clauses',
                severity: 'critical',
                requiredClauses: ['data protection', 'privacy rights'],
                suggestion: 'Add GDPR-compliant data protection clauses',
            },
        ]);
    }
}
exports.LegalComplianceChecker = LegalComplianceChecker;
//# sourceMappingURL=LegalComplianceChecker.js.map