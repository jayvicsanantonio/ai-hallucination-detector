import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './errorHandler';

// Extend Request interface to include user information
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        organizationId: string;
        roles: string[];
        permissions: string[];
      };
      apiKey?: {
        id: string;
        name: string;
        organizationId: string;
        permissions: string[];
        rateLimit?: number;
      };
    }
  }
}

export interface JWTPayload {
  sub: string; // user ID
  email: string;
  organizationId: string;
  roles: string[];
  permissions: string[];
  iat: number;
  exp: number;
}

export interface APIKeyData {
  id: string;
  name: string;
  organizationId: string;
  permissions: string[];
  rateLimit?: number;
  isActive: boolean;
}

// JWT Authentication middleware
export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(
      createError(
        'Missing or invalid authorization header',
        401,
        'MISSING_AUTH_TOKEN',
        false
      )
    );
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const payload = jwt.verify(token, jwtSecret) as JWTPayload;

    req.user = {
      id: payload.sub,
      email: payload.email,
      organizationId: payload.organizationId,
      roles: payload.roles,
      permissions: payload.permissions,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(
        createError('Token has expired', 401, 'TOKEN_EXPIRED', false)
      );
    } else if (error instanceof jwt.JsonWebTokenError) {
      return next(
        createError('Invalid token', 401, 'INVALID_TOKEN', false)
      );
    } else {
      return next(
        createError(
          'Authentication failed',
          401,
          'AUTH_FAILED',
          false
        )
      );
    }
  }
};

// API Key Authentication middleware
export const authenticateAPIKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return next(
      createError('Missing API key', 401, 'MISSING_API_KEY', false)
    );
  }

  try {
    // TODO: Replace with actual database lookup
    // For now, use a mock implementation
    const apiKeyData = await validateAPIKey(apiKey);

    if (!apiKeyData || !apiKeyData.isActive) {
      return next(
        createError(
          'Invalid or inactive API key',
          401,
          'INVALID_API_KEY',
          false
        )
      );
    }

    req.apiKey = {
      id: apiKeyData.id,
      name: apiKeyData.name,
      organizationId: apiKeyData.organizationId,
      permissions: apiKeyData.permissions,
      rateLimit: apiKeyData.rateLimit,
    };

    next();
  } catch (error) {
    return next(
      createError(
        'API key validation failed',
        401,
        'API_KEY_VALIDATION_FAILED',
        false
      )
    );
  }
};

// Combined authentication middleware (JWT or API Key)
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const hasJWT = req.headers.authorization?.startsWith('Bearer ');
  const hasAPIKey = req.headers['x-api-key'];

  if (hasJWT) {
    return authenticateJWT(req, res, next);
  } else if (hasAPIKey) {
    return authenticateAPIKey(req, res, next);
  } else {
    return next(
      createError(
        'Authentication required. Provide either Bearer token or X-API-Key header',
        401,
        'AUTHENTICATION_REQUIRED',
        false
      )
    );
  }
};

// Authorization middleware factory
export const authorize = (requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userPermissions =
      req.user?.permissions || req.apiKey?.permissions || [];

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every(
      (permission) =>
        userPermissions.includes(permission) ||
        userPermissions.includes('admin')
    );

    if (!hasAllPermissions) {
      return next(
        createError(
          `Insufficient permissions. Required: ${requiredPermissions.join(
            ', '
          )}`,
          403,
          'INSUFFICIENT_PERMISSIONS',
          false,
          {
            required: requiredPermissions,
            current: userPermissions,
          }
        )
      );
    }

    next();
  };
};

// Role-based authorization middleware
export const requireRole = (requiredRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRoles = req.user?.roles || [];

    // API keys don't have roles, only permissions
    if (req.apiKey && !req.user) {
      return next(
        createError(
          'Role-based access requires user authentication (not API key)',
          403,
          'ROLE_ACCESS_REQUIRES_USER_AUTH',
          false
        )
      );
    }

    const hasRequiredRole = requiredRoles.some(
      (role) =>
        userRoles.includes(role) || userRoles.includes('admin')
    );

    if (!hasRequiredRole) {
      return next(
        createError(
          `Insufficient role. Required one of: ${requiredRoles.join(
            ', '
          )}`,
          403,
          'INSUFFICIENT_ROLE',
          false,
          {
            required: requiredRoles,
            current: userRoles,
          }
        )
      );
    }

    next();
  };
};

// Organization isolation middleware
export const requireSameOrganization = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userOrgId =
    req.user?.organizationId || req.apiKey?.organizationId;

  if (!userOrgId) {
    return next(
      createError(
        'Organization context required',
        400,
        'MISSING_ORGANIZATION_CONTEXT',
        false
      )
    );
  }

  // Add organization filter to request for use in route handlers
  req.query.organizationId = userOrgId;

  next();
};

// Mock API key validation function
// TODO: Replace with actual database implementation
async function validateAPIKey(
  apiKey: string
): Promise<APIKeyData | null> {
  // Mock API keys for testing
  const mockAPIKeys: Record<string, APIKeyData> = {
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
export const generateJWT = (
  payload: Omit<JWTPayload, 'iat' | 'exp'>
): string => {
  const jwtSecret = process.env.JWT_SECRET || 'test-secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

  return jwt.sign(payload, jwtSecret, {
    expiresIn,
  } as jwt.SignOptions);
};

// Simple auth middleware for backward compatibility
export const authMiddleware = authenticate;

// Permission constants
export const PERMISSIONS = {
  VERIFY_CREATE: 'verify:create',
  VERIFY_READ: 'verify:read',
  FEEDBACK_CREATE: 'feedback:create',
  ADMIN: 'admin',
} as const;

// Role constants
export const ROLES = {
  ADMIN: 'admin',
  COMPLIANCE_OFFICER: 'compliance_officer',
  ANALYST: 'analyst',
  VIEWER: 'viewer',
} as const;
