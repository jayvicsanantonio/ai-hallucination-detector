"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLES = exports.PERMISSIONS = exports.authMiddleware = exports.generateJWT = exports.requireSameOrganization = exports.requireRole = exports.authorize = exports.authenticate = exports.authenticateAPIKey = exports.authenticateJWT = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errorHandler_1 = require("./errorHandler");
// JWT Authentication middleware
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next((0, errorHandler_1.createError)('Missing or invalid authorization header', 401, 'MISSING_AUTH_TOKEN', false));
    }
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error('JWT_SECRET not configured');
        }
        const payload = jsonwebtoken_1.default.verify(token, jwtSecret);
        req.user = {
            id: payload.sub,
            email: payload.email,
            organizationId: payload.organizationId,
            roles: payload.roles,
            permissions: payload.permissions,
        };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return next((0, errorHandler_1.createError)('Token has expired', 401, 'TOKEN_EXPIRED', false));
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return next((0, errorHandler_1.createError)('Invalid token', 401, 'INVALID_TOKEN', false));
        }
        else {
            return next((0, errorHandler_1.createError)('Authentication failed', 401, 'AUTH_FAILED', false));
        }
    }
};
exports.authenticateJWT = authenticateJWT;
// API Key Authentication middleware
const authenticateAPIKey = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        return next((0, errorHandler_1.createError)('Missing API key', 401, 'MISSING_API_KEY', false));
    }
    try {
        // TODO: Replace with actual database lookup
        // For now, use a mock implementation
        const apiKeyData = await validateAPIKey(apiKey);
        if (!apiKeyData || !apiKeyData.isActive) {
            return next((0, errorHandler_1.createError)('Invalid or inactive API key', 401, 'INVALID_API_KEY', false));
        }
        req.apiKey = {
            id: apiKeyData.id,
            name: apiKeyData.name,
            organizationId: apiKeyData.organizationId,
            permissions: apiKeyData.permissions,
            rateLimit: apiKeyData.rateLimit,
        };
        next();
    }
    catch (error) {
        return next((0, errorHandler_1.createError)('API key validation failed', 401, 'API_KEY_VALIDATION_FAILED', false));
    }
};
exports.authenticateAPIKey = authenticateAPIKey;
// Combined authentication middleware (JWT or API Key)
const authenticate = (req, res, next) => {
    const hasJWT = req.headers.authorization?.startsWith('Bearer ');
    const hasAPIKey = req.headers['x-api-key'];
    if (hasJWT) {
        return (0, exports.authenticateJWT)(req, res, next);
    }
    else if (hasAPIKey) {
        return (0, exports.authenticateAPIKey)(req, res, next);
    }
    else {
        return next((0, errorHandler_1.createError)('Authentication required. Provide either Bearer token or X-API-Key header', 401, 'AUTHENTICATION_REQUIRED', false));
    }
};
exports.authenticate = authenticate;
// Authorization middleware factory
const authorize = (requiredPermissions) => {
    return (req, res, next) => {
        const userPermissions = req.user?.permissions || req.apiKey?.permissions || [];
        // Check if user has all required permissions
        const hasAllPermissions = requiredPermissions.every((permission) => userPermissions.includes(permission) ||
            userPermissions.includes('admin'));
        if (!hasAllPermissions) {
            return next((0, errorHandler_1.createError)(`Insufficient permissions. Required: ${requiredPermissions.join(', ')}`, 403, 'INSUFFICIENT_PERMISSIONS', false, {
                required: requiredPermissions,
                current: userPermissions,
            }));
        }
        next();
    };
};
exports.authorize = authorize;
// Role-based authorization middleware
const requireRole = (requiredRoles) => {
    return (req, res, next) => {
        const userRoles = req.user?.roles || [];
        // API keys don't have roles, only permissions
        if (req.apiKey && !req.user) {
            return next((0, errorHandler_1.createError)('Role-based access requires user authentication (not API key)', 403, 'ROLE_ACCESS_REQUIRES_USER_AUTH', false));
        }
        const hasRequiredRole = requiredRoles.some((role) => userRoles.includes(role) || userRoles.includes('admin'));
        if (!hasRequiredRole) {
            return next((0, errorHandler_1.createError)(`Insufficient role. Required one of: ${requiredRoles.join(', ')}`, 403, 'INSUFFICIENT_ROLE', false, {
                required: requiredRoles,
                current: userRoles,
            }));
        }
        next();
    };
};
exports.requireRole = requireRole;
// Organization isolation middleware
const requireSameOrganization = (req, res, next) => {
    const userOrgId = req.user?.organizationId || req.apiKey?.organizationId;
    if (!userOrgId) {
        return next((0, errorHandler_1.createError)('Organization context required', 400, 'MISSING_ORGANIZATION_CONTEXT', false));
    }
    // Add organization filter to request for use in route handlers
    req.query.organizationId = userOrgId;
    next();
};
exports.requireSameOrganization = requireSameOrganization;
// Mock API key validation function
// TODO: Replace with actual database implementation
async function validateAPIKey(apiKey) {
    // Mock API keys for testing
    const mockAPIKeys = {
        'test-api-key-admin': {
            id: 'api-key-1',
            name: 'Test Admin Key',
            organizationId: 'org-1',
            permissions: [
                'verify:create',
                'verify:read',
                'feedback:create',
                'admin',
            ],
            rateLimit: 10000,
            isActive: true,
        },
        'test-api-key-basic': {
            id: 'api-key-2',
            name: 'Test Basic Key',
            organizationId: 'org-2',
            permissions: ['verify:create', 'verify:read'],
            rateLimit: 1000,
            isActive: true,
        },
        'test-api-key-inactive': {
            id: 'api-key-3',
            name: 'Test Inactive Key',
            organizationId: 'org-3',
            permissions: ['verify:create'],
            rateLimit: 500,
            isActive: false,
        },
    };
    return mockAPIKeys[apiKey] || null;
}
// Utility function to generate JWT tokens (for testing)
const generateJWT = (payload) => {
    const jwtSecret = process.env.JWT_SECRET || 'test-secret';
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    return jsonwebtoken_1.default.sign(payload, jwtSecret, {
        expiresIn,
    });
};
exports.generateJWT = generateJWT;
// Simple auth middleware for backward compatibility
exports.authMiddleware = exports.authenticate;
// Permission constants
exports.PERMISSIONS = {
    VERIFY_CREATE: 'verify:create',
    VERIFY_READ: 'verify:read',
    FEEDBACK_CREATE: 'feedback:create',
    ADMIN: 'admin',
};
// Role constants
exports.ROLES = {
    ADMIN: 'admin',
    COMPLIANCE_OFFICER: 'compliance_officer',
    ANALYST: 'analyst',
    VIEWER: 'viewer',
};
//# sourceMappingURL=auth.js.map