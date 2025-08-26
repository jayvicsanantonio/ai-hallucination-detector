"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFeedback = exports.feedbackSchema = exports.getResultsSchema = exports.batchVerifySchema = exports.verifyContentSchema = void 0;
const joi_1 = __importDefault(require("joi"));
// Define schemas directly since they're not exported from validation middleware
const contentTypeSchema = joi_1.default.string()
    .valid('text', 'pdf', 'docx', 'json')
    .default('text');
const domainSchema = joi_1.default.string()
    .valid('healthcare', 'financial', 'legal', 'insurance', 'general')
    .default('general');
const urgencySchema = joi_1.default.string()
    .valid('low', 'medium', 'high', 'critical')
    .default('medium');
const feedbackTypeSchema = joi_1.default.string()
    .valid('correct', 'incorrect', 'partially_correct', 'unclear')
    .required();
// Verify content request schema
exports.verifyContentSchema = {
    body: joi_1.default.object({
        content: joi_1.default.string().min(1).max(10000000).required(),
        contentType: contentTypeSchema,
        domain: domainSchema,
        urgency: urgencySchema,
        metadata: joi_1.default.object().optional(),
        filename: joi_1.default.string().optional(),
    }),
};
// Batch verify request schema
exports.batchVerifySchema = {
    body: joi_1.default.object({
        documents: joi_1.default.array()
            .items(joi_1.default.object({
            id: joi_1.default.string().required(),
            content: joi_1.default.string().min(1).max(10000000).required(),
            contentType: contentTypeSchema,
            domain: domainSchema,
            filename: joi_1.default.string().optional(),
            metadata: joi_1.default.object().optional(),
        }))
            .min(1)
            .max(100) // Limit batch size
            .required(),
        domain: domainSchema,
        urgency: urgencySchema,
    }),
};
// Get results request schema
exports.getResultsSchema = {
    params: joi_1.default.object({
        verificationId: joi_1.default.string().uuid().required(),
    }),
    query: joi_1.default.object({
        includeAuditTrail: joi_1.default.boolean().default(false),
    }),
};
// Feedback request schema
exports.feedbackSchema = {
    body: joi_1.default.object({
        verificationId: joi_1.default.string().uuid().required(),
        feedback: feedbackTypeSchema,
        corrections: joi_1.default.string().max(5000).optional(),
        expertNotes: joi_1.default.string().max(2000).optional(),
        issueId: joi_1.default.string().uuid().optional(),
        confidence: joi_1.default.number().min(0).max(1).optional(),
    }),
};
// Validation function for feedback
const validateFeedback = (data) => {
    return exports.feedbackSchema.body.validate(data);
};
exports.validateFeedback = validateFeedback;
//# sourceMappingURL=schemas.js.map