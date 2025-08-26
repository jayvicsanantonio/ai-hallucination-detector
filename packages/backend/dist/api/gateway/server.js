"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
// Import route handlers
const verify_1 = __importDefault(require("../routes/verify"));
const results_1 = __importDefault(require("../routes/results"));
const feedback_1 = __importDefault(require("../routes/feedback"));
const health_1 = __importDefault(require("../routes/health"));
function createApp() {
    const app = (0, express_1.default)();
    // Security middleware
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)());
    // Body parsing middleware
    app.use(express_1.default.json({ limit: '50mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
    // Rate limiting
    const limiter = (0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        message: {
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests from this IP',
            },
        },
    });
    app.use('/api/', limiter);
    // Health check endpoint (no auth required)
    app.use('/api/v1/health', health_1.default);
    // Authentication middleware for protected routes
    app.use('/api/v1', auth_1.authMiddleware);
    // Validation middleware
    app.use('/api/v1', validation_1.validationMiddleware);
    // API routes
    app.use('/api/v1/verify', verify_1.default);
    app.use('/api/v1/results', results_1.default);
    app.use('/api/v1/feedback', feedback_1.default);
    // Error handling middleware
    app.use(errorHandler_1.errorHandler);
    return app;
}
//# sourceMappingURL=server.js.map