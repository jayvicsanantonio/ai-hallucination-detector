"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ResultsCache_1 = require("../../services/verification-engine/ResultsCache");
const router = (0, express_1.Router)();
// Get verification results
router.get('/:verificationId', async (req, res) => {
    try {
        const { verificationId } = req.params;
        const user = req.user;
        if (!verificationId) {
            return res.status(400).json({
                error: {
                    code: 'MISSING_VERIFICATION_ID',
                    message: 'Verification ID is required',
                },
            });
        }
        const resultsCache = new ResultsCache_1.ResultsCache();
        // Skip audit logging for now since we don't have a proper repository
        // const auditLogger = new AuditLogger(...);
        // Get results from cache/database
        const results = await resultsCache.get(verificationId);
        if (!results) {
            return res.status(404).json({
                error: {
                    code: 'VERIFICATION_NOT_FOUND',
                    message: 'Verification not found',
                },
            });
        }
        // Log results access (skipped for now)
        // await auditLogger.logVerification(...);
        res.json(results);
    }
    catch (error) {
        console.error('Failed to get verification results:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'An internal error occurred',
            },
        });
    }
});
// Get batch results
router.get('/batch/:batchId', async (req, res) => {
    try {
        const { batchId } = req.params;
        const user = req.user;
        if (!batchId) {
            return res.status(400).json({
                error: {
                    code: 'MISSING_BATCH_ID',
                    message: 'Batch ID is required',
                },
            });
        }
        const resultsCache = new ResultsCache_1.ResultsCache();
        // Skip audit logging for now since we don't have a proper repository
        // const auditLogger = new AuditLogger(...);
        // Get batch results - using regular get method
        const batchResults = await resultsCache.get(batchId);
        if (!batchResults) {
            return res.status(404).json({
                error: {
                    code: 'BATCH_NOT_FOUND',
                    message: 'Batch not found',
                },
            });
        }
        // Log batch results access (skipped for now)
        // await auditLogger.logVerification(...);
        res.json(batchResults);
    }
    catch (error) {
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
router.get('/history/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = req.user;
        const { limit = 50, offset = 0, status, domain } = req.query;
        // Check authorization - users can only access their own history, admins can access any
        if (user.userId !== userId && user.role !== 'admin') {
            return res.status(403).json({
                error: {
                    code: 'INSUFFICIENT_PERMISSIONS',
                    message: "Cannot access other user's verification history",
                },
            });
        }
        const resultsCache = new ResultsCache_1.ResultsCache();
        // Mock user history - ResultsCache doesn't have getUserHistory method
        const history = {
            results: [],
            total: 0,
            limit: parseInt(limit),
            offset: parseInt(offset),
        };
        res.json(history);
    }
    catch (error) {
        console.error('Failed to get verification history:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'An internal error occurred',
            },
        });
    }
});
exports.default = router;
//# sourceMappingURL=results.js.map