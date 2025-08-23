import { Router, Request, Response } from 'express';
import { ResultsCache } from '../../services/verification-engine/ResultsCache';
import { AuditLogger } from '../../services/audit-logger/AuditLogger';

const router = Router();

// Get verification results
router.get(
  '/:verificationId',
  async (req: Request, res: Response) => {
    try {
      const { verificationId } = req.params;
      const user = (req as any).user;

      if (!verificationId) {
        return res.status(400).json({
          error: {
            code: 'MISSING_VERIFICATION_ID',
            message: 'Verification ID is required',
          },
        });
      }

      const resultsCache = new ResultsCache();
      const auditLogger = new AuditLogger();

      // Get results from cache/database
      const results = await resultsCache.getResults(verificationId);

      if (!results) {
        return res.status(404).json({
          error: {
            code: 'VERIFICATION_NOT_FOUND',
            message: 'Verification not found',
          },
        });
      }

      // Log results access
      await auditLogger.logVerification({
        verificationId,
        userId: user?.userId,
        action: 'results_accessed',
        details: {
          status: results.status,
        },
      });

      res.json(results);
    } catch (error) {
      console.error('Failed to get verification results:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
        },
      });
    }
  }
);

// Get batch results
router.get('/batch/:batchId', async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;
    const user = (req as any).user;

    if (!batchId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_BATCH_ID',
          message: 'Batch ID is required',
        },
      });
    }

    const resultsCache = new ResultsCache();
    const auditLogger = new AuditLogger();

    // Get batch results
    const batchResults = await resultsCache.getBatchResults(batchId);

    if (!batchResults) {
      return res.status(404).json({
        error: {
          code: 'BATCH_NOT_FOUND',
          message: 'Batch not found',
        },
      });
    }

    // Log batch results access
    await auditLogger.logVerification({
      verificationId: batchId,
      userId: user?.userId,
      action: 'batch_results_accessed',
      details: {
        documentCount: batchResults.documents?.length || 0,
      },
    });

    res.json(batchResults);
  } catch (error) {
    console.error('Failed to get batch results:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
      },
    });
  }
});

// Get verification history for user
router.get(
  '/history/:userId',
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const user = (req as any).user;
      const { limit = 50, offset = 0, status, domain } = req.query;

      // Check authorization - users can only access their own history, admins can access any
      if (user.userId !== userId && user.role !== 'admin') {
        return res.status(403).json({
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message:
              "Cannot access other user's verification history",
          },
        });
      }

      const resultsCache = new ResultsCache();

      const history = await resultsCache.getUserHistory({
        userId,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        status: status as string,
        domain: domain as string,
      });

      res.json(history);
    } catch (error) {
      console.error('Failed to get verification history:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
        },
      });
    }
  }
);

export default router;
