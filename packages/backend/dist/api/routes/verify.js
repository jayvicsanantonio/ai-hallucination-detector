"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const VerificationEngine_1 = require("../../services/verification-engine/VerificationEngine");
const ContentProcessingService_1 = require("../../services/content-processing/ContentProcessingService");
const router = (0, express_1.Router)();
// Single document verification
router.post('/', async (req, res) => {
    try {
        const { content, contentType, domain, urgency, metadata } = req.body;
        const user = req.user;
        // Validate required fields
        if (!content || !contentType || !domain) {
            return res.status(400).json({
                error: {
                    code: 'MISSING_REQUIRED_FIELDS',
                    message: 'Content, contentType, and domain are required',
                },
            });
        }
        // Validate content type
        const validContentTypes = ['text', 'pdf', 'docx', 'json'];
        if (!validContentTypes.includes(contentType)) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_CONTENT_TYPE',
                    message: `Content type must be one of: ${validContentTypes.join(', ')}`,
                },
            });
        }
        // Validate domain
        const validDomains = [
            'legal',
            'financial',
            'healthcare',
            'insurance',
        ];
        if (!validDomains.includes(domain)) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_DOMAIN',
                    message: `Domain must be one of: ${validDomains.join(', ')}`,
                },
            });
        }
        // Generate verification ID
        const verificationId = `verify_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`;
        // Start async verification process (using mocked services for now)
        const verificationEngine = new VerificationEngine_1.VerificationEngine();
        const contentProcessor = new ContentProcessingService_1.ContentProcessingService();
        const auditLogger = {
            logVerification: jest.fn().mockResolvedValue(undefined),
        };
        // Process content (mocked for now)
        const parsedContent = {
            id: `content_${Date.now()}`,
            extractedText: content,
            contentType,
            structure: {
                sections: [],
                tables: [],
                figures: [],
                references: [],
            },
            entities: [],
            metadata: metadata || {},
            createdAt: new Date(),
        };
        // Start verification (async) - mocked for now
        setTimeout(() => {
            // Simulate async processing
            console.log(`Processing verification ${verificationId}`);
        }, 100);
        // Log verification start (mocked)
        console.log(`Verification ${verificationId} started for user ${user?.userId}`);
        res.status(202).json({
            verificationId,
            status: 'processing',
            message: 'Verification started successfully',
        });
    }
    catch (error) {
        console.error('Verification request failed:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'An internal error occurred',
            },
        });
    }
});
// Batch verification
router.post('/batch', async (req, res) => {
    try {
        const { documents } = req.body;
        const user = req.user;
        if (!documents ||
            !Array.isArray(documents) ||
            documents.length === 0) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_BATCH_REQUEST',
                    message: 'Documents array is required and must not be empty',
                },
            });
        }
        if (documents.length > 100) {
            return res.status(400).json({
                error: {
                    code: 'BATCH_SIZE_EXCEEDED',
                    message: 'Maximum batch size is 100 documents',
                },
            });
        }
        const batchId = `batch_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`;
        const documentIds = [];
        // Mock services for batch processing
        const auditLogger = {
            logVerification: jest.fn().mockResolvedValue(undefined),
        };
        // Process each document
        for (const doc of documents) {
            const verificationId = `verify_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 9)}`;
            documentIds.push(verificationId);
            // Validate document
            if (!doc.content || !doc.contentType || !doc.domain) {
                continue; // Skip invalid documents
            }
            try {
                // Mock processing for now
                console.log(`Processing document ${verificationId} in batch ${batchId}`);
            }
            catch (error) {
                console.error(`Failed to process document ${doc.id}:`, error);
            }
        }
        // Log batch start (mocked)
        console.log(`Batch ${batchId} started with ${documentIds.length} documents`);
        res.status(202).json({
            batchId,
            documentIds,
            status: 'processing',
            message: `Batch verification started for ${documentIds.length} documents`,
        });
    }
    catch (error) {
        console.error('Batch verification request failed:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'An internal error occurred',
            },
        });
    }
});
exports.default = router;
//# sourceMappingURL=verify.js.map