"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialModule = void 0;
const NumericalAccuracyValidator_1 = require("./NumericalAccuracyValidator");
const FinancialComplianceChecker_1 = require("./FinancialComplianceChecker");
const CalculationVerifier_1 = require("./CalculationVerifier");
class FinancialModule {
    constructor() {
        this.domain = 'financial';
        this.version = '1.0.0';
        this.rules = new Map();
        this.numericalValidator = new NumericalAccuracyValidator_1.NumericalAccuracyValidator();
        this.complianceChecker = new FinancialComplianceChecker_1.FinancialComplianceChecker();
        this.calculationVerifier = new CalculationVerifier_1.CalculationVerifier();
        this.initializeDefaultRules();
    }
    async validateContent(content) {
        const startTime = Date.now();
        const issues = [];
        try {
            // Extract financial data
            const financialData = await this.extractFinancialData(content);
            // Validate numerical accuracy
            const numericalIssues = await this.numericalValidator.validateNumericalAccuracy(content, financialData);
            issues.push(...numericalIssues);
            // Check financial regulation compliance
            const complianceIssues = await this.complianceChecker.checkFinancialCompliance(content, financialData);
            issues.push(...complianceIssues);
            // Verify calculations
            const calculationIssues = await this.calculationVerifier.verifyCalculations(content, financialData);
            issues.push(...calculationIssues);
            // Calculate overall confidence based on issues found
            const confidence = this.calculateConfidence(issues, content);
            const processingTime = Date.now() - startTime;
            return {
                moduleId: 'financial-module',
                issues,
                confidence,
                processingTime,
                metadata: {
                    financialDataFound: financialData.length,
                    rulesApplied: this.rules.size,
                    calculationsVerified: calculationIssues.length > 0,
                },
            };
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            return {
                moduleId: 'financial-module',
                issues: [
                    {
                        id: `financial-error-${Date.now()}`,
                        type: 'compliance_violation',
                        severity: 'medium',
                        location: { start: 0, end: 0, line: 1, column: 1 },
                        description: `Financial validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        evidence: [],
                        confidence: 0,
                        moduleSource: 'financial-module',
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
        await this.numericalValidator.updateRules(newRules.filter((r) => r.name.includes('numerical')));
        await this.complianceChecker.updateRules(newRules.filter((r) => r.name.includes('compliance')));
    }
    async learnFromFeedback(feedback) {
        // Implement learning logic based on user feedback
        console.log(`Learning from feedback for financial module: ${feedback.userFeedback}`);
        if (feedback.corrections) {
            // Parse corrections and update validation patterns
            await this.updateValidationPatterns(feedback);
        }
    }
    getModuleInfo() {
        return {
            name: 'Financial Domain Module',
            version: this.version,
            domain: this.domain,
            description: 'Validates financial documents for numerical accuracy, compliance, and calculation verification',
            capabilities: [
                'Numerical accuracy validation',
                'Financial regulation compliance checking',
                'Calculation verification and audit trail',
                'Financial data extraction',
                'Risk assessment',
            ],
            lastUpdated: new Date(),
            rulesCount: this.rules.size,
        };
    }
    // Financial-specific methods
    async validateNumericalAccuracy(calculations) {
        return this.numericalValidator.validateCalculations(calculations);
    }
    async checkRegulatoryCompliance(content, regulations) {
        return this.complianceChecker.checkRegulationCompliance(content, regulations);
    }
    async extractFinancialData(content) {
        const financialData = [];
        const text = content.extractedText;
        // Extract monetary amounts
        const amountMatches = text.matchAll(/\$[\d,]+(?:\.\d{2})?/g);
        for (const match of amountMatches) {
            if (match.index !== undefined) {
                financialData.push({
                    id: `amount-${financialData.length}`,
                    type: 'monetary_amount',
                    value: match[0],
                    location: {
                        start: match.index,
                        end: match.index + match[0].length,
                    },
                    numericValue: this.parseAmount(match[0]),
                });
            }
        }
        // Extract percentages
        const percentageMatches = text.matchAll(/\d+(?:\.\d+)?%/g);
        for (const match of percentageMatches) {
            if (match.index !== undefined) {
                financialData.push({
                    id: `percentage-${financialData.length}`,
                    type: 'percentage',
                    value: match[0],
                    location: {
                        start: match.index,
                        end: match.index + match[0].length,
                    },
                    numericValue: parseFloat(match[0].replace('%', '')),
                });
            }
        }
        // Extract financial ratios
        const ratioMatches = text.matchAll(/(?:ratio|rate)\s*:?\s*(\d+(?:\.\d+)?(?::\d+(?:\.\d+)?)?)/gi);
        for (const match of ratioMatches) {
            if (match.index !== undefined) {
                financialData.push({
                    id: `ratio-${financialData.length}`,
                    type: 'financial_ratio',
                    value: match[1],
                    location: {
                        start: match.index,
                        end: match.index + match[0].length,
                    },
                    numericValue: this.parseRatio(match[1]),
                });
            }
        }
        return financialData;
    }
    parseAmount(amount) {
        return parseFloat(amount.replace(/[$,]/g, ''));
    }
    parseRatio(ratio) {
        if (ratio.includes(':')) {
            const parts = ratio.split(':');
            return parseFloat(parts[0]) / parseFloat(parts[1]);
        }
        return parseFloat(ratio);
    }
    initializeDefaultRules() {
        const defaultRules = [
            {
                id: 'financial-001',
                name: 'numerical-accuracy',
                description: 'Ensures numerical calculations are accurate',
                severity: 'high',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'financial-002',
                name: 'regulatory-compliance',
                description: 'Validates compliance with financial regulations',
                pattern: '(SEC|GAAP|IFRS|SOX|Basel)',
                severity: 'critical',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'financial-003',
                name: 'calculation-verification',
                description: 'Verifies mathematical calculations and formulas',
                severity: 'high',
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
        console.log(`Updating financial validation patterns based on feedback: ${feedback.corrections}`);
    }
}
exports.FinancialModule = FinancialModule;
//# sourceMappingURL=FinancialModule.js.map