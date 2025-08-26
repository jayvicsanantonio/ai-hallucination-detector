"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedbackService = void 0;
const FeedbackRepository_1 = require("../../database/interfaces/FeedbackRepository");
const KnowledgeBaseUpdater_1 = require("./KnowledgeBaseUpdater");
const PatternAnalyzer_1 = require("./PatternAnalyzer");
const Logger_1 = require("../../utils/Logger");
class FeedbackService {
    constructor(feedbackRepository, knowledgeBaseUpdater, patternAnalyzer) {
        this.feedbackRepository =
            feedbackRepository || new FeedbackRepository_1.FeedbackRepository();
        this.knowledgeBaseUpdater =
            knowledgeBaseUpdater || new KnowledgeBaseUpdater_1.KnowledgeBaseUpdater();
        this.patternAnalyzer = patternAnalyzer || new PatternAnalyzer_1.PatternAnalyzer();
        this.logger = new Logger_1.Logger('FeedbackService');
    }
    /**
     * Process user feedback and update knowledge base
     */
    async processFeedback(feedbackData) {
        try {
            this.logger.info('Processing feedback', {
                verificationId: feedbackData.verificationId,
                feedbackType: feedbackData.userFeedback,
            });
            // Store feedback in database
            const storedFeedback = await this.feedbackRepository.create(feedbackData);
            // Analyze patterns in the feedback
            const patterns = await this.patternAnalyzer.analyzeNewFeedback(feedbackData);
            // Update knowledge base if corrections provided
            let knowledgeBaseUpdated = false;
            if (feedbackData.corrections &&
                feedbackData.userFeedback === 'incorrect') {
                await this.knowledgeBaseUpdater.updateFromFeedback(feedbackData);
                knowledgeBaseUpdated = true;
            }
            // Update verification accuracy metrics
            await this.updateAccuracyMetrics(feedbackData);
            this.logger.info('Feedback processed successfully', {
                feedbackId: storedFeedback.id,
                patternsFound: patterns.length,
                knowledgeBaseUpdated,
            });
            return {
                id: storedFeedback.id,
                processed: true,
                knowledgeBaseUpdated,
                patternsIdentified: patterns,
            };
        }
        catch (error) {
            this.logger.error('Error processing feedback', {
                error: error instanceof Error ? error.message : String(error),
                verificationId: feedbackData.verificationId,
            });
            throw error;
        }
    }
    /**
     * Get feedback statistics for a verification session
     */
    async getFeedbackStats(verificationId) {
        try {
            const feedback = await this.feedbackRepository.findByVerificationId(verificationId);
            const stats = {
                totalFeedback: feedback.length,
                correctCount: feedback.filter((f) => f.userFeedback === 'correct').length,
                incorrectCount: feedback.filter((f) => f.userFeedback === 'incorrect').length,
                partialCount: feedback.filter((f) => f.userFeedback === 'partially_correct').length,
                averageConfidence: this.calculateAverageConfidence(feedback),
                commonIssues: await this.getCommonIssues(verificationId),
            };
            return stats;
        }
        catch (error) {
            this.logger.error('Error getting feedback stats', {
                error: error instanceof Error ? error.message : String(error),
                verificationId,
            });
            throw error;
        }
    }
    /**
     * Analyze feedback patterns for insights
     */
    async analyzeFeedbackPatterns(options) {
        try {
            return await this.patternAnalyzer.analyzeFeedbackPatterns(options);
        }
        catch (error) {
            this.logger.error('Error analyzing feedback patterns', {
                error: error instanceof Error ? error.message : String(error),
                options,
            });
            throw error;
        }
    }
    /**
     * Update accuracy metrics based on feedback
     */
    async updateAccuracyMetrics(feedbackData) {
        try {
            // Get the original verification result
            const verificationResult = await this.feedbackRepository.getVerificationResult(feedbackData.verificationId);
            if (!verificationResult) {
                this.logger.warn('Verification result not found for feedback', {
                    verificationId: feedbackData.verificationId,
                });
                return;
            }
            // Calculate accuracy impact
            const accuracyImpact = this.calculateAccuracyImpact(feedbackData, verificationResult);
            // Update metrics in database
            await this.feedbackRepository.updateAccuracyMetrics(feedbackData.verificationId, accuracyImpact);
        }
        catch (error) {
            this.logger.error('Error updating accuracy metrics', {
                error: error instanceof Error ? error.message : String(error),
                verificationId: feedbackData.verificationId,
            });
        }
    }
    /**
     * Calculate average confidence from feedback
     */
    calculateAverageConfidence(feedback) {
        const confidenceValues = feedback
            .filter((f) => f.confidence !== undefined)
            .map((f) => f.confidence);
        if (confidenceValues.length === 0)
            return 0;
        return (confidenceValues.reduce((sum, conf) => sum + conf, 0) /
            confidenceValues.length);
    }
    /**
     * Get common issues from feedback
     */
    async getCommonIssues(verificationId) {
        try {
            return await this.feedbackRepository.getCommonIssues(verificationId);
        }
        catch (error) {
            this.logger.error('Error getting common issues', {
                error: error instanceof Error ? error.message : String(error),
            });
            return [];
        }
    }
    /**
     * Get feedback data by domain for training purposes
     */
    async getFeedbackByDomain(domain) {
        try {
            return await this.feedbackRepository.findByDomain(domain);
        }
        catch (error) {
            this.logger.error('Error getting feedback by domain', {
                error: error instanceof Error ? error.message : String(error),
                domain,
            });
            throw error;
        }
    }
    /**
     * Calculate accuracy impact of feedback
     */
    calculateAccuracyImpact(feedbackData, verificationResult) {
        // Simple accuracy calculation based on feedback type
        switch (feedbackData.userFeedback) {
            case 'correct':
                return 1.0;
            case 'incorrect':
                return 0.0;
            case 'partially_correct':
                return 0.5;
            default:
                return 0.5;
        }
    }
}
exports.FeedbackService = FeedbackService;
//# sourceMappingURL=FeedbackService.js.map