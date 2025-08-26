import { Request, Response, NextFunction } from 'express';
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
    sub: string;
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
export declare const authenticateJWT: (req: Request, res: Response, next: NextFunction) => void;
export declare const authenticateAPIKey: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => void | Promise<void>;
export declare const authorize: (requiredPermissions: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const requireRole: (requiredRoles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const requireSameOrganization: (req: Request, res: Response, next: NextFunction) => void;
export declare const generateJWT: (payload: Omit<JWTPayload, "iat" | "exp">) => string;
export declare const authMiddleware: (req: Request, res: Response, next: NextFunction) => void | Promise<void>;
export declare const PERMISSIONS: {
    readonly VERIFY_CREATE: "verify:create";
    readonly VERIFY_READ: "verify:read";
    readonly FEEDBACK_CREATE: "feedback:create";
    readonly ADMIN: "admin";
};
export declare const ROLES: {
    readonly ADMIN: "admin";
    readonly COMPLIANCE_OFFICER: "compliance_officer";
    readonly ANALYST: "analyst";
    readonly VIEWER: "viewer";
};
//# sourceMappingURL=auth.d.ts.map