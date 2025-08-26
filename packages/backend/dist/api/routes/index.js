"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const verify_1 = __importDefault(require("./verify"));
const results_1 = __importDefault(require("./results"));
const feedback_1 = __importDefault(require("./feedback"));
const router = (0, express_1.Router)();
// Mount route modules
router.use('/verify', verify_1.default);
router.use('/results', results_1.default);
router.use('/feedback', feedback_1.default);
// API info endpoint
router.get('/', (req, res) => {
    res.json({
        name: 'CertaintyAI API',
        version: '1.0.0',
        description: 'Enterprise AI hallucination detection system',
        endpoints: {
            verify: 'POST /api/v1/verify',
            batchVerify: 'POST /api/v1/verify/batch',
            results: 'GET /api/v1/results/:verificationId',
            feedback: 'POST /api/v1/feedback',
        },
        timestamp: new Date().toISOString(),
    });
});
exports.default = router;
//# sourceMappingURL=index.js.map