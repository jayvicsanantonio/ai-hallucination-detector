import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  validateRequest,
  asyncHandler,
  createError,
  authenticate,
  authorize,
  requireSameOrganization,
  PERMISSIONS,
} from '../middleware';
import { feedbackSchema } from '../validation/schemas';
import {
  FeedbackRequest,
  FeedbackResponse,
} from '../interfaces/APITypes';

const router = Router();

// POST /api/v1/feedback - Submit feedback for verification results
router.post(
  '/',
  authenticate,
  authorize([PERMISSIONS.FEEDBACK_CREATE]),
  requireSameOrganization,
  validateRequest(feedbackSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const request = req.body as FeedbackRequest;

    // Generate feedback ID
    const feedbackId = uuidv4();

    // TODO: Integrate with learning service to process feedback
    // TODO: Validate that verificationId exists in database

    // For now, simulate successful feedback submission
    const response: FeedbackResponse = {
      success: true,
      message:
        'Feedback received and will be used to improve accuracy',
      feedbackId,
    };

    // Log the feedback submission
    console.log('Feedback received:', {
      feedbackId,
      verificationId: request.verificationId,
      feedback: request.feedback,
      hasCorrections: !!request.corrections,
      hasExpertNotes: !!request.expertNotes,
      issueId: request.issueId,
      requestId: req.headers['x-request-id'],
    });

    res.status(201).json(response);
  })
);

export default router;
