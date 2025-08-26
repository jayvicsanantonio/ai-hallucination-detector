"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NumericalAccuracyValidator = void 0;
class NumericalAccuracyValidator {
    constructor() {
        this.rules = new Map();
        this.PRECISION_TOLERANCE = 0.01; // 1 cent tolerance for monetary calculations
        this.initializeNumericalRules();
    }
    async validateNumericalAccuracy(content, financialData) {
        const issues = [];
        // Validate monetary amounts
        issues.push(...this.validateMonetaryAmounts(financialData, content));
        // Validate percentages
        issues.push(...this.validatePercentages(financialData, content));
        // Validate financial ratios
        issues.push(...this.validateFinancialRatios(financialData, content));
        // Validate calculations
        issues.push(...this.validateCalculationsInContent(content));
        return issues;
    }
    async validateCalculations(calculations) {
        const startTime = Date.now();
        const issues = [];
        for (const calculation of calculations) {
            if (!calculation.isValid) {
                issues.push({
                    id: `calculation-error-${calculation.id}`,
                    type: 'factual_error',
                    severity: 'high',
                    location: {
                        start: calculation.location.start,
                        end: calculation.location.end,
                        line: 1,
                        column: 1,
                    },
                    description: `Mathematical calculation is incorrect: ${calculation.expression}`,
                    evidence: [
                        `Expected: ${calculation.expectedResult}`,
                        `Actual: ${calculation.result}`,
                    ],
                    confidence: 95,
                    moduleSource: 'numerical-accuracy-validator',
                });
            }
            // Check for precision issues
            if (calculation.expectedResult !== undefined) {
                const difference = Math.abs(calculation.result - calculation.expectedResult);
                if (difference > this.PRECISION_TOLERANCE) {
                    issues.push({
                        id: `precision-error-${calculation.id}`,
                        type: 'factual_error',
                        severity: 'medium',
                        location: calculation.location,
                        description: `Calculation precision issue detected`,
                        evidence: [
                            `Difference: ${difference.toFixed(4)}`,
                            `Tolerance: ${this.PRECISION_TOLERANCE}`,
                        ],
                        confidence: 85,
                        moduleSource: 'numerical-accuracy-validator',
                    });
                }
            }
        }
        const processingTime = Math.max(1, Date.now() - startTime);
        const confidence = issues.length === 0
            ? 95
            : Math.max(20, 95 - issues.length * 15);
        return {
            moduleId: 'numerical-accuracy-validator',
            issues,
            confidence,
            processingTime,
        };
    }
    async updateRules(newRules) {
        for (const rule of newRules) {
            this.rules.set(rule.id, rule);
        }
    }
    validateMonetaryAmounts(financialData, content) {
        const issues = [];
        const monetaryAmounts = financialData.filter((d) => d.type === 'monetary_amount');
        for (const amount of monetaryAmounts) {
            // Check for unrealistic amounts
            if (amount.numericValue < 0) {
                issues.push({
                    id: `negative-amount-${amount.id}`,
                    type: 'factual_error',
                    severity: 'medium',
                    location: amount.location,
                    description: 'Negative monetary amount detected',
                    evidence: [amount.value],
                    confidence: 90,
                    moduleSource: 'numerical-accuracy-validator',
                });
            }
            // Check for extremely large amounts that might be errors
            if (amount.numericValue > 1000000000000) {
                // > 1 trillion
                issues.push({
                    id: `excessive-amount-${amount.id}`,
                    type: 'factual_error',
                    severity: 'low',
                    location: amount.location,
                    description: 'Extremely large monetary amount - please verify',
                    evidence: [amount.value],
                    confidence: 60,
                    moduleSource: 'numerical-accuracy-validator',
                });
            }
            // Check for precision issues (more than 2 decimal places for currency)
            const decimalMatch = amount.value.match(/\.(\d+)/);
            if (decimalMatch && decimalMatch[1].length > 2) {
                issues.push({
                    id: `precision-issue-${amount.id}`,
                    type: 'factual_error',
                    severity: 'low',
                    location: amount.location,
                    description: 'Monetary amount has more than 2 decimal places',
                    evidence: [amount.value],
                    confidence: 75,
                    moduleSource: 'numerical-accuracy-validator',
                });
            }
        }
        return issues;
    }
    validatePercentages(financialData, content) {
        const issues = [];
        const percentages = financialData.filter((d) => d.type === 'percentage');
        for (const percentage of percentages) {
            // Check for invalid percentage ranges
            if (percentage.numericValue < 0) {
                issues.push({
                    id: `negative-percentage-${percentage.id}`,
                    type: 'factual_error',
                    severity: 'medium',
                    location: percentage.location,
                    description: 'Negative percentage detected',
                    evidence: [percentage.value],
                    confidence: 90,
                    moduleSource: 'numerical-accuracy-validator',
                });
            }
            // Check for percentages over 100% (might be valid in some contexts)
            if (percentage.numericValue > 100) {
                issues.push({
                    id: `high-percentage-${percentage.id}`,
                    type: 'factual_error',
                    severity: 'low',
                    location: percentage.location,
                    description: 'Percentage over 100% - please verify context',
                    evidence: [percentage.value],
                    confidence: 60,
                    moduleSource: 'numerical-accuracy-validator',
                });
            }
            // Check for unrealistic precision in percentages
            const decimalPlaces = (percentage.value.match(/\.(\d+)/) || [
                '',
                '',
            ])[1].length;
            if (decimalPlaces > 4) {
                issues.push({
                    id: `excessive-precision-${percentage.id}`,
                    type: 'factual_error',
                    severity: 'low',
                    location: percentage.location,
                    description: 'Percentage has excessive decimal precision',
                    evidence: [percentage.value],
                    confidence: 70,
                    moduleSource: 'numerical-accuracy-validator',
                });
            }
        }
        return issues;
    }
    validateFinancialRatios(financialData, content) {
        const issues = [];
        const ratios = financialData.filter((d) => d.type === 'financial_ratio');
        for (const ratio of ratios) {
            // Check for invalid ratios
            if (ratio.numericValue < 0) {
                issues.push({
                    id: `negative-ratio-${ratio.id}`,
                    type: 'factual_error',
                    severity: 'medium',
                    location: ratio.location,
                    description: 'Negative financial ratio detected',
                    evidence: [ratio.value],
                    confidence: 85,
                    moduleSource: 'numerical-accuracy-validator',
                });
            }
            // Check for extremely high ratios that might indicate errors
            if (ratio.numericValue > 1000) {
                issues.push({
                    id: `high-ratio-${ratio.id}`,
                    type: 'factual_error',
                    severity: 'low',
                    location: ratio.location,
                    description: 'Extremely high financial ratio - please verify',
                    evidence: [ratio.value],
                    confidence: 65,
                    moduleSource: 'numerical-accuracy-validator',
                });
            }
        }
        return issues;
    }
    validateCalculationsInContent(content) {
        const issues = [];
        const text = content.extractedText;
        // Look for simple arithmetic expressions
        const calculationPattern = /(\$?[\d,]+(?:\.\d{2})?)\s*([+\-*/])\s*(\$?[\d,]+(?:\.\d{2})?)\s*=\s*(\$?[\d,]+(?:\.\d{2})?)/g;
        let match;
        while ((match = calculationPattern.exec(text)) !== null) {
            const [fullMatch, operand1, operator, operand2, result] = match;
            const num1 = this.parseNumber(operand1);
            const num2 = this.parseNumber(operand2);
            const actualResult = this.parseNumber(result);
            let expectedResult;
            switch (operator) {
                case '+':
                    expectedResult = num1 + num2;
                    break;
                case '-':
                    expectedResult = num1 - num2;
                    break;
                case '*':
                    expectedResult = num1 * num2;
                    break;
                case '/':
                    expectedResult = num2 !== 0 ? num1 / num2 : NaN;
                    break;
                default:
                    continue;
            }
            if (Math.abs(actualResult - expectedResult) >
                this.PRECISION_TOLERANCE) {
                issues.push({
                    id: `calculation-error-${Date.now()}`,
                    type: 'factual_error',
                    severity: 'high',
                    location: {
                        start: match.index,
                        end: match.index + fullMatch.length,
                        line: 1,
                        column: 1,
                    },
                    description: `Mathematical calculation is incorrect`,
                    evidence: [
                        `Expression: ${fullMatch}`,
                        `Expected: ${expectedResult.toFixed(2)}`,
                        `Actual: ${actualResult.toFixed(2)}`,
                    ],
                    confidence: 95,
                    moduleSource: 'numerical-accuracy-validator',
                });
            }
        }
        return issues;
    }
    parseNumber(value) {
        return parseFloat(value.replace(/[$,]/g, ''));
    }
    initializeNumericalRules() {
        const numericalRules = [
            {
                id: 'numerical-001',
                name: 'monetary-accuracy',
                description: 'Monetary amounts must be accurate and properly formatted',
                severity: 'high',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'numerical-002',
                name: 'percentage-validation',
                description: 'Percentages must be within valid ranges',
                severity: 'medium',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'numerical-003',
                name: 'calculation-verification',
                description: 'Mathematical calculations must be correct',
                severity: 'critical',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ];
        numericalRules.forEach((rule) => this.rules.set(rule.id, rule));
    }
}
exports.NumericalAccuracyValidator = NumericalAccuracyValidator;
//# sourceMappingURL=NumericalAccuracyValidator.js.map