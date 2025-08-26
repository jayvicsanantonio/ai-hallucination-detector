"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.createError = void 0;
const createError = (message, statusCode = 500, code = 'INTERNAL_ERROR', isOperational = true, details) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    error.isOperational = isOperational;
    if (details) {
        error.details = details;
    }
    return error;
};
exports.createError = createError;
const errorHandler = (error, req, res, next) => {
    // Default error values
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Internal Server Error';
    let code = error.code || 'INTERNAL_ERROR';
    // Log error for debugging
    console.error('Error:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        statusCode,
        code,
    });
    // Handle specific error types
    if (error.name === 'ValidationError') {
        statusCode = 400;
        code = 'VALIDATION_ERROR';
    }
    else if (error.name === 'UnauthorizedError') {
        statusCode = 401;
        code = 'UNAUTHORIZED';
    }
    else if (error.name === 'CastError') {
        statusCode = 400;
        code = 'INVALID_ID';
        message = 'Invalid ID format';
    }
    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
        message = 'Internal Server Error';
    }
    res.status(statusCode).json({
        error: {
            code,
            message,
            ...(process.env.NODE_ENV === 'development' && {
                stack: error.stack,
            }),
        },
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map