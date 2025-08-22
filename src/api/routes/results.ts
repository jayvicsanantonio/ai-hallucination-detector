import { Router, Request, Response } from 'express';
import {
  validateRequest,
  asyncHandler,
  createError,
  authenticate,
  authorize,
  requireSameOrganization,
  PERMISSIONS,
} from '../middleware';
import { getResultsSchema } from '../validation/schemas';
import { GetResultsResponse } from '../interfaces/APITypes';

const router = Router();

// GET /api/v1/results/:verificationId - Get verification results
router.get(
  '/:verificationId',
  authenticate,
  authorize([PERMISSIONS.VERIFY_READ]),
  requireSameOrganization,
  validateRequest(getResultsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { verificationId } = req.params;
    const { includeAuditTrail } = req.query;

    // TODO: Integrate with database to fetch actual results
    // For now, return a mock response

    // Simulate different states based on verification ID for testing
    const mockStates = ['processing', 'completed', 'failed'];
    const randomState =
      mockStates[Math.floor(Math.random() * mockStates.length)];

    if (randomState === 'failed') {
      const response: GetResultsResponse = {
        verificationId,
        status: 'failed',
        error: 'Content processing failed due to unsupported format',
        createdAt: new Date(Date.now() - 30000), // 30 seconds ago
      };
      return res.status(200).json(response);
    }

    if (randomState === 'processing') {
      const response: GetResultsResponse = {
        verificationId,
        status: 'processing',
        createdAt: new Date(Date.now() - 5000), // 5 seconds ago
      };
      return res.status(200).json(response);
    }

    // Mock completed result
    const response: GetResultsResponse = {
      verificationId,
      status: 'completed',
      result: {
        verificationId,
        overallConfidence: 85,
        riskLevel: 'medium',
        issues: [
          {
            id: 'issue-1',
            type: 'factual_error',
            severity: 'medium',
            location: {
              start: 120,
              end: 145,
              line: 5,
              column: 10,
              section: 'Company History',
            },
            description: 'Potential factual inaccuracy detected',
            evidence: ['Company records show founding date as 1994'],
            confidence: 75,
            suggestedFix:
              'Verify the founding date from official records',
            moduleSource: 'fact-checker',
          },
        ],
        auditTrail: includeAuditTrail
          ? [
              {
                id: 'audit-1',
                sessionId: verificationId,
                timestamp: new Date(Date.now() - 10000),
                action: 'content_parsed',
                component: 'content-processor',
                details: { contentType: 'text', wordCount: 150 },
              },
              {
                id: 'audit-2',
                sessionId: verificationId,
                timestamp: new Date(Date.now() - 8000),
                action: 'fact_check_completed',
                component: 'fact-checker',
                details: { claimsChecked: 3, issuesFound: 1 },
              },
            ]
          : [],
        processingTime: 1850,
        recommendations: [
          'Review highlighted sections for accuracy',
          'Consider adding source citations',
        ],
        timestamp: new Date(Date.now() - 5000),
      },
      createdAt: new Date(Date.now() - 15000), // 15 seconds ago
      completedAt: new Date(Date.now() - 5000), // 5 seconds ago
    };

    // Log the results request
    console.log('Results request received:', {
      verificationId,
      includeAuditTrail,
      requestId: req.headers['x-request-id'],
    });

    res.status(200).json(response);
  })
);

export default router;
