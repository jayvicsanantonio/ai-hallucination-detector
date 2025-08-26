"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultsProcessor = void 0;
const ResultsCache_1 = require("./ResultsCache");
const Logger_1 = require("@/utils/Logger");
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
class ResultsProcessor {
    constructor(config = {}) {
        this.logger = new Logger_1.Logger('ResultsProcessor');
        this.config = {
            enableCaching: config.enableCaching ?? true,
            cacheTtl: config.cacheTtl || 3600,
            enablePersistence: config.enablePersistence ?? true,
            confidenceWeights: config.confidenceWeights || {
                legal: 1.0,
                financial: 1.2,
                healthcare: 1.1,
                insurance: 1.0,
            },
        };
        this.cache = new ResultsCache_1.ResultsCache({
            ttl: this.config.cacheTtl,
            keyPrefix: 'results:',
        });
        this.metrics = {
            totalProcessed: 0,
            averageConfidence: 0,
            riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
            issueTypeDistribution: {
                factual_error: 0,
                logical_inconsistency: 0,
                compliance_violation: 0,
                formatting_issue: 0,
                other: 0,
            },
            averageProcessingTime: 0,
        };
    }
    async processResults(verificationId, request, moduleResults, processingTime) {
        const startTime = Date.now();
        try {
            // Check cache first if enabled
            if (this.config.enableCaching) {
                const cacheKey = this.generateCacheKey(request);
                const cachedResult = await this.cache.get(cacheKey);
                if (cachedResult) {
                    this.logger.debug(`Returning cached result for verification ${verificationId}`);
                    return {
                        ...cachedResult,
                        verificationId, // Update with current verification ID
                        timestamp: new Date(),
                    };
                }
            }
            // Aggregate results from all modules
            const aggregatedResult = await this.aggregateModuleResults(verificationId, request, moduleResults, processingTime);
            // Apply domain-specific confidence weighting
            const weightedResult = this.applyConfidenceWeighting(aggregatedResult, request.domain);
            // Format result for consistency
            const formattedResult = this.formatResult(weightedResult);
            // Cache result if enabled
            if (this.config.enableCaching) {
                const cacheKey = this.generateCacheKey(request);
                await this.cache.set(cacheKey, formattedResult);
            }
            // Persist result if enabled
            if (this.config.enablePersistence) {
                await this.persistResult(formattedResult, request);
            }
            // Update metrics
            this.updateMetrics(formattedResult);
            const totalProcessingTime = Date.now() - startTime;
            this.logger.debug(`Results processed in ${totalProcessingTime}ms for verification ${verificationId}`);
            return formattedResult;
        }
        catch (error) {
            this.logger.error(`Error processing results for verification ${verificationId}:`, error);
            throw error;
        }
    }
    async getResult(verificationId) {
        // Try cache first
        if (this.config.enableCaching) {
            const cachedResult = await this.cache.get(verificationId);
            if (cachedResult) {
                return cachedResult;
            }
        }
        // Try database if persistence is enabled
        if (this.config.enablePersistence) {
            return await this.getPersistedResult(verificationId);
        }
        return null;
    }
    async invalidateCache(cacheKey) {
        if (cacheKey) {
            await this.cache.delete(cacheKey);
        }
        else {
            await this.cache.clear();
        }
    }
    getMetrics() {
        return { ...this.metrics };
    }
    getCacheStats() {
        return this.cache.getStats();
    }
    async aggregateModuleResults(verificationId, request, moduleResults, processingTime) {
        // Combine all issues from modules
        const allIssues = [];
        const confidenceScores = [];
        const recommendations = [];
        moduleResults.forEach((result) => {
            // Add issues with module source information
            const moduleIssues = result.issues.map((issue) => ({
                ...issue,
                moduleSource: result.moduleId,
            }));
            allIssues.push(...moduleIssues);
            // Collect confidence scores
            if (result.confidence > 0) {
                confidenceScores.push(result.confidence);
            }
            // Generate module-specific recommendations
            if (result.issues.length > 0) {
                recommendations.push(`${result.moduleId} module detected ${result.issues.length} issue(s)`);
            }
        });
        // Calculate overall confidence
        const overallConfidence = confidenceScores.length > 0
            ? Math.round(confidenceScores.reduce((sum, score) => sum + score, 0) /
                confidenceScores.length)
            : 100;
        // Determine risk level
        const riskLevel = this.calculateRiskLevel(allIssues, overallConfidence);
        // Apply confidence threshold if specified
        const options = request.options || {};
        if (options.confidenceThreshold &&
            overallConfidence < options.confidenceThreshold) {
            allIssues.push({
                id: (0, uuid_1.v4)(),
                type: 'factual_error',
                severity: 'medium',
                location: { start: 0, end: 0, line: 1, column: 1 },
                description: `Overall confidence (${overallConfidence}%) is below threshold (${options.confidenceThreshold}%)`,
                evidence: ['Low confidence score from verification modules'],
                confidence: 100,
                moduleSource: 'VerificationEngine',
            });
        }
        // Generate general recommendations
        const generalRecommendations = this.generateRecommendations(allIssues, riskLevel);
        recommendations.push(...generalRecommendations);
        return {
            verificationId,
            overallConfidence,
            riskLevel,
            issues: allIssues,
            auditTrail: [], // Will be populated by the calling service
            processingTime: Math.max(1, processingTime),
            recommendations: [...new Set(recommendations)], // Remove duplicates
            timestamp: new Date(),
        };
    }
    applyConfidenceWeighting(result, domain) {
        const weight = this.config.confidenceWeights[domain] || 1.0;
        if (weight === 1.0) {
            return result;
        }
        // Apply weight to confidence score
        const weightedConfidence = Math.min(100, Math.max(0, result.overallConfidence * weight));
        // Recalculate risk level with weighted confidence
        const newRiskLevel = this.calculateRiskLevel(result.issues, weightedConfidence);
        return {
            ...result,
            overallConfidence: Math.round(weightedConfidence),
            riskLevel: newRiskLevel,
        };
    }
    formatResult(result) {
        // Sort issues by severity and confidence
        const sortedIssues = result.issues.sort((a, b) => {
            const severityOrder = {
                critical: 4,
                high: 3,
                medium: 2,
                low: 1,
            };
            const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
            if (severityDiff !== 0) {
                return severityDiff;
            }
            return b.confidence - a.confidence;
        });
        // Ensure all required fields are present
        return {
            ...result,
            issues: sortedIssues,
            recommendations: result.recommendations.filter((rec) => rec.trim().length > 0),
            timestamp: new Date(result.timestamp),
        };
    }
    calculateRiskLevel(issues, confidence) {
        if (issues.length === 0 && confidence >= 90) {
            return 'low';
        }
        const criticalIssues = issues.filter((issue) => issue.severity === 'critical');
        const highIssues = issues.filter((issue) => issue.severity === 'high');
        if (criticalIssues.length > 0 || confidence < 50) {
            return 'critical';
        }
        if (highIssues.length > 0 || confidence < 70) {
            return 'high';
        }
        if (issues.length > 0 || confidence < 85) {
            return 'medium';
        }
        return 'low';
    }
    generateRecommendations(issues, riskLevel) {
        const recommendations = [];
        if (issues.length === 0) {
            recommendations.push('Content appears to be accurate and compliant. No issues detected.');
            return recommendations;
        }
        // Group issues by type
        const issuesByType = issues.reduce((acc, issue) => {
            if (!acc[issue.type]) {
                acc[issue.type] = [];
            }
            acc[issue.type].push(issue);
            return acc;
        }, {});
        // Generate type-specific recommendations
        if (issuesByType.factual_error) {
            recommendations.push(`${issuesByType.factual_error.length} factual error(s) detected. Review and verify against authoritative sources.`);
        }
        if (issuesByType.logical_inconsistency) {
            recommendations.push(`${issuesByType.logical_inconsistency.length} logical inconsistency(ies) found. Check for contradictions and ensure coherent reasoning.`);
        }
        if (issuesByType.compliance_violation) {
            recommendations.push(`${issuesByType.compliance_violation.length} compliance violation(s) identified. Consult with legal/compliance team before proceeding.`);
        }
        // Risk-level specific recommendations
        switch (riskLevel) {
            case 'critical':
                recommendations.push('CRITICAL: Do not use this content without thorough review and correction.');
                break;
            case 'high':
                recommendations.push('HIGH RISK: Significant issues detected. Manual review strongly recommended.');
                break;
            case 'medium':
                recommendations.push('MEDIUM RISK: Some issues detected. Consider review before use.');
                break;
        }
        return recommendations;
    }
    generateCacheKey(request) {
        // Create a hash of the content and verification parameters
        const contentHash = crypto_1.default
            .createHash('sha256')
            .update(request.content.extractedText)
            .digest('hex')
            .substring(0, 16);
        const options = {
            domain: request.domain,
            urgency: request.urgency,
            options: request.options || {},
        };
        return this.cache.generateCacheKey(contentHash, request.domain, options);
    }
    async persistResult(result, request) {
        // TODO: Implement database persistence
        // This would typically save to PostgreSQL with proper indexing
        this.logger.debug(`Persisting result for verification ${result.verificationId}`);
        // For now, just log that persistence would happen
        // In a real implementation, this would:
        // 1. Save to verification_results table
        // 2. Save issues to verification_issues table
        // 3. Update audit trail
        // 4. Create proper indexes for fast retrieval
    }
    async getPersistedResult(verificationId) {
        // TODO: Implement database retrieval
        // This would typically query PostgreSQL
        this.logger.debug(`Retrieving persisted result for verification ${verificationId}`);
        return null;
    }
    updateMetrics(result) {
        this.metrics.totalProcessed++;
        // Update average confidence
        const totalConfidence = this.metrics.averageConfidence *
            (this.metrics.totalProcessed - 1) +
            result.overallConfidence;
        this.metrics.averageConfidence =
            totalConfidence / this.metrics.totalProcessed;
        // Update risk distribution
        this.metrics.riskDistribution[result.riskLevel]++;
        // Update issue type distribution
        result.issues.forEach((issue) => {
            this.metrics.issueTypeDistribution[issue.type]++;
        });
        // Update average processing time
        const totalTime = this.metrics.averageProcessingTime *
            (this.metrics.totalProcessed - 1) +
            result.processingTime;
        this.metrics.averageProcessingTime =
            totalTime / this.metrics.totalProcessed;
    }
}
exports.ResultsProcessor = ResultsProcessor;
//# sourceMappingURL=ResultsProcessor.js.map