"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const FeedbackService_1 = require("../../services/learning/FeedbackService");
const schemas_1 = require("../validation/schemas");
const auth_1 = require("../middleware/auth");
const Logger_1 = require("../../utils/Logger");
const router = (0, express_1.Router)();
const feedbackService = new FeedbackService_1.FeedbackService();
const logger = new Logger_1.Logger('FeedbackAPI');
/**
 * Submit feedback for a verification result
 * POST /api/v1/feedback
 */
router.post('/', auth_1.authenticate, async (req, res) => {
    try {
        const { error, value } = (0, schemas_1.validateFeedback)(req.body);
        if (error) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_FEEDBACK_DATA',
                    message: error.details[0].message,
                    timestamp: new Date(),
                    requestId: req.headers['x-request-id'],
                    retryable: false,
                },
            });
        }
        const feedbackData = {
            ...value,
            userId: req.user?.id,
            timestamp: new Date(),
        };
        const result = await feedbackService.processFeedback(feedbackData);
        logger.info('Feedback processed successfully', {
            verificationId: feedbackData.verificationId,
            userId: feedbackData.userId,
            feedbackType: feedbackData.userFeedback,
        });
        res.status(201).json({
            success: true,
            feedbackId: result.id,
            message: 'Feedback processed successfully',
        });
    }
    catch (error) {
        logger.error('Error processing feedback', {
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
            error: {
                code: 'FEEDBACK_PROCESSING_ERROR',
                message: 'Failed to process feedback',
                timestamp: new Date(),
                requestId: req.headers['x-request-id'],
                retryable: true,
            },
        });
    }
});
/**
 * Get feedback statistics for a verification session
 * GET /api/v1/feedback/stats/:verificationId
 */
router.get('/stats/:verificationId', auth_1.authenticate, async (req, res) => {
    try {
        const { verificationId } = req.params;
        const stats = await feedbackService.getFeedbackStats(verificationId);
        res.json(stats);
    }
    catch (error) {
        logger.error('Error retrieving feedback stats', {
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
            error: {
                code: 'FEEDBACK_STATS_ERROR',
                message: 'Failed to retrieve feedback statistics',
                timestamp: new Date(),
                requestId: req.headers['x-request-id'],
                retryable: true,
            },
        });
    }
});
/**
 * Get feedback patterns and insights
 * GET /api/v1/feedback/patterns
 */
router.get('/patterns', auth_1.authenticate, async (req, res) => {
    try {
        const { domain, timeframe } = req.query;
        const patterns = await feedbackService.analyzeFeedbackPatterns({
            domain: domain,
            timeframe: timeframe,
            userId: req.user?.id,
        });
        res.json(patterns);
    }
    catch (error) {
        logger.error('Error analyzing feedback patterns', {
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
            error: {
                code: 'PATTERN_ANALYSIS_ERROR',
                message: 'Failed to analyze feedback patterns',
                timestamp: new Date(),
                requestId: req.headers['x-request-id'],
                retryable: true,
            },
        });
    }
});
exports.default = router;
//# sourceMappingURL=feedback.js.map