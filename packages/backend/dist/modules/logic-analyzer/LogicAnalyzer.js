"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogicAnalyzer = void 0;
const ContradictionDetector_1 = require("./ContradictionDetector");
const LogicalFallacyDetector_1 = require("./LogicalFallacyDetector");
const NumericalConsistencyChecker_1 = require("./NumericalConsistencyChecker");
const CoherenceValidator_1 = require("./CoherenceValidator");
class LogicAnalyzer {
    constructor() {
        this.contradictionDetector = new ContradictionDetector_1.ContradictionDetector();
        this.fallacyDetector = new LogicalFallacyDetector_1.LogicalFallacyDetector();
        this.numericalChecker = new NumericalConsistencyChecker_1.NumericalConsistencyChecker();
        this.coherenceValidator = new CoherenceValidator_1.CoherenceValidator();
    }
    async analyzeLogicalConsistency(content) {
        try {
            // Run all analysis components in parallel
            const [contradictions, logicalFallacies, numericalInconsistencies, coherenceIssues,] = await Promise.all([
                this.contradictionDetector.detectContradictions(content),
                this.fallacyDetector.detectFallacies(content),
                this.numericalChecker.checkNumericalConsistency(content),
                this.coherenceValidator.validateCoherence(content),
            ]);
            // Calculate overall consistency score
            const overallConsistency = this.calculateOverallConsistency(contradictions, logicalFallacies, numericalInconsistencies, coherenceIssues);
            // Calculate confidence based on analysis quality
            const confidence = this.calculateConfidence(contradictions, logicalFallacies, numericalInconsistencies, coherenceIssues);
            return {
                contradictions,
                logicalFallacies,
                numericalInconsistencies,
                coherenceIssues,
                overallConsistency,
                confidence,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Logic analysis failed: ${errorMessage}`);
        }
    }
    convertToIssues(analysisResult) {
        const issues = [];
        // Convert contradictions to issues
        analysisResult.contradictions.forEach((contradiction) => {
            issues.push({
                id: contradiction.id,
                type: 'logical_inconsistency',
                severity: contradiction.severity,
                location: contradiction.location1,
                description: `Contradiction detected: ${contradiction.explanation}`,
                evidence: [
                    contradiction.statement1,
                    contradiction.statement2,
                ],
                suggestedFix: `Resolve contradiction between statements at positions ${contradiction.location1.start}-${contradiction.location1.end} and ${contradiction.location2.start}-${contradiction.location2.end}`,
                confidence: contradiction.confidence,
                moduleSource: 'logic-analyzer',
            });
        });
        // Convert logical fallacies to issues
        analysisResult.logicalFallacies.forEach((fallacy) => {
            issues.push({
                id: fallacy.id,
                type: 'logical_inconsistency',
                severity: fallacy.severity,
                location: fallacy.location,
                description: `Logical fallacy detected: ${fallacy.type} - ${fallacy.description}`,
                evidence: fallacy.examples,
                suggestedFix: fallacy.explanation,
                confidence: fallacy.confidence,
                moduleSource: 'logic-analyzer',
            });
        });
        // Convert numerical inconsistencies to issues
        analysisResult.numericalInconsistencies.forEach((inconsistency) => {
            issues.push({
                id: inconsistency.id,
                type: 'logical_inconsistency',
                severity: inconsistency.severity,
                location: inconsistency.location,
                description: `Numerical inconsistency: ${inconsistency.description}`,
                evidence: inconsistency.expectedValue && inconsistency.actualValue
                    ? [
                        `Expected: ${inconsistency.expectedValue}`,
                        `Actual: ${inconsistency.actualValue}`,
                    ]
                    : [],
                suggestedFix: `Review and correct numerical values`,
                confidence: inconsistency.confidence,
                moduleSource: 'logic-analyzer',
            });
        });
        // Convert coherence issues to issues
        analysisResult.coherenceIssues.forEach((coherenceIssue) => {
            issues.push({
                id: coherenceIssue.id,
                type: 'logical_inconsistency',
                severity: coherenceIssue.severity,
                location: coherenceIssue.location,
                description: `Coherence issue: ${coherenceIssue.description}`,
                evidence: coherenceIssue.evidence,
                suggestedFix: this.getSuggestedFixForCoherenceIssue(coherenceIssue.type),
                confidence: coherenceIssue.confidence,
                moduleSource: 'logic-analyzer',
            });
        });
        return issues;
    }
    calculateOverallConsistency(contradictions, fallacies, numericalIssues, coherenceIssues) {
        const totalIssues = contradictions.length +
            fallacies.length +
            numericalIssues.length +
            coherenceIssues.length;
        if (totalIssues === 0) {
            return 100;
        }
        // Weight issues by severity
        let severityScore = 0;
        const maxSeverityScore = totalIssues * 4; // Critical = 4, High = 3, Medium = 2, Low = 1
        [
            ...contradictions,
            ...fallacies,
            ...numericalIssues,
            ...coherenceIssues,
        ].forEach((issue) => {
            switch (issue.severity) {
                case 'critical':
                    severityScore += 4;
                    break;
                case 'high':
                    severityScore += 3;
                    break;
                case 'medium':
                    severityScore += 2;
                    break;
                case 'low':
                    severityScore += 1;
                    break;
            }
        });
        // Convert to consistency score (higher is better)
        return Math.max(0, 100 - (severityScore / maxSeverityScore) * 100);
    }
    calculateConfidence(contradictions, fallacies, numericalIssues, coherenceIssues) {
        const allIssues = [
            ...contradictions,
            ...fallacies,
            ...numericalIssues,
            ...coherenceIssues,
            ...numericalIssues,
        ];
        if (allIssues.length === 0) {
            return 85; // High confidence when no issues found
        }
        // Average confidence of all detected issues
        const avgConfidence = allIssues.reduce((sum, issue) => sum + issue.confidence, 0) /
            allIssues.length;
        // Adjust based on number of issues (more issues = higher confidence in analysis)
        const issueCountBonus = Math.min(15, allIssues.length * 2);
        return Math.min(100, avgConfidence + issueCountBonus);
    }
    getSuggestedFixForCoherenceIssue(type) {
        switch (type) {
            case 'semantic_incoherence':
                return 'Add transitional phrases or reorganize content for better flow';
            case 'temporal_inconsistency':
                return 'Review and correct temporal references for consistency';
            case 'causal_inconsistency':
                return 'Clarify causal relationships and resolve circular logic';
            case 'reference_error':
                return 'Ensure all references have clear antecedents';
            default:
                return 'Review content for logical coherence';
        }
    }
}
exports.LogicAnalyzer = LogicAnalyzer;
//# sourceMappingURL=LogicAnalyzer.js.map