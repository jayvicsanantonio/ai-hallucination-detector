import { Router, Request, Response } from 'express';
import { FeedbackService } from '../../services/learning/FeedbackService';
import { validateFeedback } from '../validation/schemas';
import { authenticate } from '../middleware/auth';
import { Logger } from '../../utils/Logger';

const router = Router();
const feedbackService = new FeedbackService();
const logger = new Logger('FeedbackAPI');

/**
 * Submit feedback for a verification result
 * POST /api/v1/feedback
 */
router.post(
  '/',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { error, value } = validateFeedback(req.body);
      if (error) {
        return res.status(400).json({
          error: {
            code: 'INVALID_FEEDBACK_DATA',
            message: error.details[0].message,
            timestamp: new Date(),
            requestId: req.headers['x-request-id'] as string,
            retryable: false,
          },
        });
      }

      const feedbackData = {
        ...value,
        userId: req.user?.id,
        timestamp: new Date(),
      };

      const result = await feedbackService.processFeedback(
        feedbackData
      );

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
    } catch (error) {
      logger.error('Error processing feedback', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        error: {
          code: 'FEEDBACK_PROCESSING_ERROR',
          message: 'Failed to process feedback',
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string,
          retryable: true,
        },
      });
    }
  }
);

/**
 * Get feedback statistics for a verification session
 * GET /api/v1/feedback/stats/:verificationId
 */
router.get(
  '/stats/:verificationId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { verificationId } = req.params;
      const stats = await feedbackService.getFeedbackStats(
        verificationId
      );

      res.json(stats);
    } catch (error) {
      logger.error('Error retrieving feedback stats', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        error: {
          code: 'FEEDBACK_STATS_ERROR',
          message: 'Failed to retrieve feedback statistics',
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string,
          retryable: true,
        },
      });
    }
  }
);

/**
 * Get feedback patterns and insights
 * GET /api/v1/feedback/patterns
 */
router.get(
  '/patterns',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { domain, timeframe } = req.query;
      const patterns = await feedbackService.analyzeFeedbackPatterns({
        domain: domain as string,
        timeframe: timeframe as string,
        userId: req.user?.id,
      });

      res.json(patterns);
    } catch (error) {
      logger.error('Error analyzing feedback patterns', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        error: {
          code: 'PATTERN_ANALYSIS_ERROR',
          message: 'Failed to analyze feedback patterns',
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string,
          retryable: true,
        },
      });
    }
  }
);

export default router;
