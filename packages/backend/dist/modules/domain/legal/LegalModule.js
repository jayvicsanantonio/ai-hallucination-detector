"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegalModule = void 0;
const ContractTermValidator_1 = require("./ContractTermValidator");
const LegalComplianceChecker_1 = require("./LegalComplianceChecker");
const LegalEntityRecognizer_1 = require("./LegalEntityRecognizer");
class LegalModule {
    constructor() {
        this.domain = 'legal';
        this.version = '1.0.0';
        this.rules = new Map();
        this.contractValidator = new ContractTermValidator_1.ContractTermValidator();
        this.complianceChecker = new LegalComplianceChecker_1.LegalComplianceChecker();
        this.entityRecognizer = new LegalEntityRecognizer_1.LegalEntityRecognizer();
        this.initializeDefaultRules();
    }
    async validateContent(content) {
        const startTime = Date.now();
        const issues = [];
        try {
            // Extract legal entities
            const legalEntities = await this.entityRecognizer.extractLegalEntities(content);
            // Validate contract terms if applicable
            const contractIssues = await this.contractValidator.validateContractTerms(content, legalEntities);
            issues.push(...contractIssues);
            // Check legal compliance
            const complianceIssues = await this.complianceChecker.checkCompliance(content, legalEntities);
            issues.push(...complianceIssues);
            // Calculate overall confidence based on issues found
            const confidence = this.calculateConfidence(issues, content);
            const processingTime = Date.now() - startTime;
            return {
                moduleId: 'legal-module',
                issues,
                confidence,
                processingTime,
                metadata: {
                    entitiesFound: legalEntities.length,
                    rulesApplied: this.rules.size,
                    contractTermsChecked: contractIssues.length > 0,
                },
            };
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            return {
                moduleId: 'legal-module',
                issues: [
                    {
                        id: `legal-error-${Date.now()}`,
                        type: 'compliance_violation',
                        severity: 'medium',
                        location: { start: 0, end: 0, line: 1, column: 1 },
                        description: `Legal validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        evidence: [],
                        confidence: 0,
                        moduleSource: 'legal-module',
                    },
                ],
                confidence: 0,
                processingTime,
                metadata: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                },
            };
        }
    }
    async updateRules(newRules) {
        for (const rule of newRules) {
            this.rules.set(rule.id, rule);
        }
        // Update validators with new rules
        await this.contractValidator.updateRules(newRules.filter((r) => r.name.includes('contract')));
        await this.complianceChecker.updateRules(newRules.filter((r) => r.name.includes('compliance')));
    }
    async learnFromFeedback(feedback) {
        // Implement learning logic based on user feedback
        // This would typically update rule weights or add new patterns
        console.log(`Learning from feedback for legal module: ${feedback.userFeedback}`);
        if (feedback.corrections) {
            // Parse corrections and update validation patterns
            await this.updateValidationPatterns(feedback);
        }
    }
    getModuleInfo() {
        return {
            name: 'Legal Domain Module',
            version: this.version,
            domain: this.domain,
            description: 'Validates legal documents for contract accuracy, compliance, and entity recognition',
            capabilities: [
                'Contract term validation',
                'Legal compliance checking',
                'Legal entity recognition',
                'Jurisdiction-specific validation',
                'Clause analysis',
            ],
            lastUpdated: new Date(),
            rulesCount: this.rules.size,
        };
    }
    // Legal-specific methods
    async validateContractTerms(terms) {
        return this.contractValidator.validateTerms(terms);
    }
    async checkLegalCompliance(content, jurisdiction) {
        return this.complianceChecker.checkJurisdictionCompliance(content, jurisdiction);
    }
    initializeDefaultRules() {
        const defaultRules = [
            {
                id: 'legal-001',
                name: 'contract-term-completeness',
                description: 'Ensures all essential contract terms are present',
                pattern: '(party|parties|consideration|offer|acceptance|capacity)',
                severity: 'high',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'legal-002',
                name: 'legal-entity-validation',
                description: 'Validates legal entity names and structures',
                pattern: '(LLC|Inc|Corp|Ltd|LP|LLP)',
                severity: 'medium',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'legal-003',
                name: 'jurisdiction-compliance',
                description: 'Checks compliance with jurisdiction-specific laws',
                severity: 'critical',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ];
        defaultRules.forEach((rule) => this.rules.set(rule.id, rule));
    }
    calculateConfidence(issues, content) {
        if (issues.length === 0)
            return 95;
        const criticalIssues = issues.filter((i) => i.severity === 'critical').length;
        const highIssues = issues.filter((i) => i.severity === 'high').length;
        const mediumIssues = issues.filter((i) => i.severity === 'medium').length;
        const lowIssues = issues.filter((i) => i.severity === 'low').length;
        // Calculate confidence based on issue severity and content length
        const contentLength = content.extractedText.length;
        const issueWeight = criticalIssues * 40 +
            highIssues * 20 +
            mediumIssues * 10 +
            lowIssues * 5;
        const normalizedWeight = Math.min(issueWeight / (contentLength / 1000), 95);
        return Math.max(5, 95 - normalizedWeight);
    }
    async updateValidationPatterns(feedback) {
        // Implementation for updating validation patterns based on feedback
        // This would involve machine learning or rule adjustment logic
        console.log(`Updating validation patterns based on feedback: ${feedback.corrections}`);
    }
}
exports.LegalModule = LegalModule;
//# sourceMappingURL=LegalModule.js.map