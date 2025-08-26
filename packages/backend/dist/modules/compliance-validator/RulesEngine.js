"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RulesEngine = void 0;
class RulesEngine {
    constructor() {
        this.rules = new Map();
        this.initializeDefaultRules();
    }
    async getApplicableRules(domain, jurisdiction = 'US') {
        const domainRules = this.rules.get(domain) || [];
        return domainRules.filter((rule) => rule.isActive &&
            (rule.jurisdiction === jurisdiction ||
                rule.jurisdiction === 'GLOBAL'));
    }
    async addRule(rule) {
        const domainRules = this.rules.get(rule.domain) || [];
        domainRules.push(rule);
        this.rules.set(rule.domain, domainRules);
    }
    async updateRule(ruleId, updates) {
        for (const [domain, rules] of this.rules.entries()) {
            const ruleIndex = rules.findIndex((r) => r.id === ruleId);
            if (ruleIndex !== -1) {
                this.rules.get(domain)[ruleIndex] = {
                    ...rules[ruleIndex],
                    ...updates,
                };
                break;
            }
        }
    }
    async deactivateRule(ruleId) {
        await this.updateRule(ruleId, { isActive: false });
    }
    initializeDefaultRules() {
        // Healthcare/HIPAA rules
        const hipaaRules = [
            {
                id: 'hipaa-phi-001',
                ruleText: 'Protected Health Information (PHI) must not be disclosed without proper authorization',
                regulation: 'HIPAA',
                jurisdiction: 'US',
                domain: 'healthcare',
                severity: 'critical',
                examples: [
                    'Patient John Doe has diabetes',
                    'SSN: 123-45-6789 diagnosed with cancer',
                ],
                keywords: [
                    'ssn',
                    'social security',
                    'patient',
                    'diagnosis',
                    'medical record',
                    'health information',
                ],
                patterns: [
                    '\\b\\d{3}-\\d{2}-\\d{4}\\b', // SSN pattern
                    '\\b[A-Z][a-z]+ [A-Z][a-z]+ (has|diagnosed with|suffers from)\\b', // Patient diagnosis pattern
                ],
                lastUpdated: new Date(),
                isActive: true,
            },
        ];
        // Financial/SOX rules
        const soxRules = [
            {
                id: 'sox-financial-001',
                ruleText: 'Financial statements must be accurate and not contain material misstatements',
                regulation: 'SOX',
                jurisdiction: 'US',
                domain: 'financial',
                severity: 'critical',
                examples: [
                    'Revenue increased by 500% (unrealistic)',
                    'No material weaknesses identified (when there are known issues)',
                ],
                keywords: [
                    'revenue',
                    'profit',
                    'loss',
                    'material weakness',
                    'internal controls',
                    'financial statement',
                ],
                patterns: [
                    '\\b(revenue|profit|earnings)\\s+(increased|decreased)\\s+by\\s+\\d{3,}%\\b', // Extreme percentage changes
                    '\\bno\\s+material\\s+weaknesses?\\b', // Absolute statements about controls
                ],
                lastUpdated: new Date(),
                isActive: true,
            },
        ];
        // Legal/GDPR rules
        const gdprRules = [
            {
                id: 'gdpr-privacy-001',
                ruleText: 'Personal data processing must have lawful basis and data subject consent',
                regulation: 'GDPR',
                jurisdiction: 'EU',
                domain: 'legal',
                severity: 'high',
                examples: [
                    'We collect your email without consent',
                    'Personal data is shared with third parties automatically',
                ],
                keywords: [
                    'personal data',
                    'consent',
                    'data subject',
                    'processing',
                    'third party',
                    'data sharing',
                ],
                patterns: [
                    '\\b(collect|process|share)\\s+.*\\s+(without|no)\\s+consent\\b',
                    '\\bpersonal\\s+data\\s+.*\\s+automatically\\s+(shared|processed)\\b',
                ],
                lastUpdated: new Date(),
                isActive: true,
            },
        ];
        // Insurance rules
        const insuranceRules = [
            {
                id: 'insurance-claim-001',
                ruleText: 'Insurance claims must be processed fairly and without discrimination',
                regulation: 'State Insurance Code',
                jurisdiction: 'US',
                domain: 'insurance',
                severity: 'high',
                examples: [
                    'Claims from certain zip codes are automatically denied',
                    'Age-based claim rejection without medical justification',
                ],
                keywords: [
                    'claim denial',
                    'discrimination',
                    'unfair practice',
                    'automatic rejection',
                    'bias',
                ],
                patterns: [
                    '\\b(automatically|always)\\s+(deny|reject)\\s+claims?\\b',
                    '\\b(age|race|gender|zip\\s+code)\\s+based\\s+(denial|rejection)\\b',
                ],
                lastUpdated: new Date(),
                isActive: true,
            },
        ];
        this.rules.set('healthcare', hipaaRules);
        this.rules.set('financial', soxRules);
        this.rules.set('legal', gdprRules);
        this.rules.set('insurance', insuranceRules);
    }
    async getRuleById(ruleId) {
        for (const rules of this.rules.values()) {
            const rule = rules.find((r) => r.id === ruleId);
            if (rule)
                return rule;
        }
        return null;
    }
    async getAllRules() {
        const allRules = [];
        for (const rules of this.rules.values()) {
            allRules.push(...rules);
        }
        return allRules;
    }
}
exports.RulesEngine = RulesEngine;
//# sourceMappingURL=RulesEngine.js.map