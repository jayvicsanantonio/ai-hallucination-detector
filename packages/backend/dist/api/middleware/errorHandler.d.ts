import { Request, Response, NextFunction } from 'express';
export interface AppError extends Error {
    statusCode?: number;
    code?: string;
    isOperational?: boolean;
}
export declare const createError: (message: string, statusCode?: number, code?: string, isOperational?: boolean, details?: any) => AppError;
export declare const errorHandler: (error: AppError, req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=errorHandler.d.ts.map