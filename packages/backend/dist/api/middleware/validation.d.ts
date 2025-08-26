import { Request, Response, NextFunction } from 'express';
export interface ValidationError extends Error {
    statusCode: number;
    code: string;
}
export declare const validationMiddleware: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=validation.d.ts.map