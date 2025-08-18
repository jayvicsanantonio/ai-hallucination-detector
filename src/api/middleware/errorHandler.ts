import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../interfaces/APITypes';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  retryable?: boolean;
  details?: Record<string, any>;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const retryable =
    err.retryable !== undefined ? err.retryable : statusCode >= 500;

  const errorResponse: ErrorResponse = {
    error: {
      code: errorCode,
      message: err.message || 'An unexpected error occurred',
      details: err.details,
      timestamp: new Date(),
      requestId: (req.headers['x-request-id'] as string) || 'unknown',
      retryable,
    },
  };

  // Log error for monitoring
  console.error('API Error:', {
    requestId: errorResponse.error.requestId,
    code: errorCode,
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    statusCode,
  });

  res.status(statusCode).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (
  fn: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Create specific error types
export const createError = (
  message: string,
  statusCode: number = 500,
  code?: string,
  retryable?: boolean,
  details?: Record<string, any>
): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = code;
  error.retryable = retryable;
  error.details = details;
  return error;
};
