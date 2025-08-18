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
import {
  verifyContentSchema,
  batchVerifySchema,
} from '../validation/schemas';
import {
  VerifyContentRequest,
  VerifyContentResponse,
  BatchVerifyRequest,
  BatchVerifyResponse,
} from '../interfaces/APITypes';

const router = Router();

// POST /api/v1/verify - Single document verification
router.post(
  '/',
  authenticate,
  authorize([PERMISSIONS.VERIFY_CREATE]),
  requireSameOrganization,
  validateRequest(verifyContentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const request = req.body as VerifyContentRequest;

    // Generate verification ID
    const verificationId = uuidv4();

    // TODO: Integrate with verification engine once implemented
    // For now, return a mock response indicating processing
    const response: VerifyContentResponse = {
      verificationId,
      status: 'processing',
      estimatedProcessingTime: 2000, // 2 seconds
    };

    // Log the verification request
    console.log('Verification request received:', {
      verificationId,
      contentType: request.contentType,
      domain: request.domain,
      urgency: request.urgency,
      contentLength:
        typeof request.content === 'string'
          ? request.content.length
          : request.content.byteLength,
      requestId: req.headers['x-request-id'],
    });

    res.status(202).json(response);
  })
);

// POST /api/v1/verify/batch - Batch document verification
router.post(
  '/batch',
  authenticate,
  authorize([PERMISSIONS.VERIFY_CREATE]),
  requireSameOrganization,
  validateRequest(batchVerifySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const request = req.body as BatchVerifyRequest;

    // Generate batch ID
    const batchId = uuidv4();

    // Generate verification IDs for each document
    const results = request.documents.map((doc) => ({
      documentId: doc.id,
      verificationId: uuidv4(),
      status: 'processing' as const,
    }));

    // TODO: Integrate with verification engine for batch processing
    const response: BatchVerifyResponse = {
      batchId,
      status: 'processing',
      results,
      totalDocuments: request.documents.length,
      completedDocuments: 0,
    };

    // Log the batch verification request
    console.log('Batch verification request received:', {
      batchId,
      totalDocuments: request.documents.length,
      domain: request.domain,
      urgency: request.urgency,
      requestId: req.headers['x-request-id'],
    });

    res.status(202).json(response);
  })
);

export default router;
