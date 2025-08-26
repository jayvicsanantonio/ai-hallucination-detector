"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationMiddleware = void 0;
const joi_1 = __importDefault(require("joi"));
// Validation schemas
const verificationSchema = joi_1.default.object({
    content: joi_1.default.string()
        .required()
        .max(10 * 1024 * 1024), // 10MB limit
    contentType: joi_1.default.string()
        .valid('text', 'pdf', 'docx', 'json')
        .required(),
    domain: joi_1.default.string()
        .valid('legal', 'financial', 'healthcare', 'insurance')
        .required(),
    urgency: joi_1.default.string().valid('low', 'medium', 'high').optional(),
    metadata: joi_1.default.object().optional(),
});
const feedbackSchema = joi_1.default.object({
    verificationId: joi_1.default.string().required(),
    feedback: joi_1.default.string()
        .valid('correct', 'incorrect', 'partially_correct')
        .required(),
    expertNotes: joi_1.default.string().optional(),
    corrections: joi_1.default.array().items(joi_1.default.object()).optional(),
});
const validationMiddleware = (req, res, next) => {
    // Skip validation for GET requests and health checks
    if (req.method === 'GET' || req.path.includes('/health')) {
        return next();
    }
    let schema = null;
    // Select appropriate schema based on route
    if (req.path.includes('/verify')) {
        schema = verificationSchema;
    }
    else if (req.path.includes('/feedback')) {
        schema = feedbackSchema;
    }
    // If no schema is defined for this route, skip validation
    if (!schema) {
        return next();
    }
    // Validate request body
    const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
    });
    if (error) {
        const validationError = new Error(`Validation failed: ${error.details
            .map((d) => d.message)
            .join(', ')}`);
        validationError.statusCode = 400;
        validationError.code = 'VALIDATION_ERROR';
        return next(validationError);
    }
    // Replace request body with validated and sanitized data
    req.body = value;
    next();
};
exports.validationMiddleware = validationMiddleware;
//# sourceMappingURL=validation.js.map