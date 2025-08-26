import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export interface ValidationError extends Error {
  statusCode: number;
  code: string;
}

// Validation schemas
const verificationSchema = Joi.object({
  content: Joi.string()
    .required()
    .max(10 * 1024 * 1024), // 10MB limit
  contentType: Joi.string()
    .valid('text', 'pdf', 'docx', 'json')
    .required(),
  domain: Joi.string()
    .valid('legal', 'financial', 'healthcare', 'insurance')
    .required(),
  urgency: Joi.string().valid('low', 'medium', 'high').optional(),
  metadata: Joi.object().optional(),
});

const feedbackSchema = Joi.object({
  verificationId: Joi.string().required(),
  feedback: Joi.string()
    .valid('correct', 'incorrect', 'partially_correct')
    .required(),
  expertNotes: Joi.string().optional(),
  corrections: Joi.array().items(Joi.object()).optional(),
});

export const validationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Skip validation for GET requests and health checks
  if (req.method === 'GET' || req.path.includes('/health')) {
    return next();
  }

  let schema: Joi.ObjectSchema | null = null;

  // Select appropriate schema based on route
  if (req.path.includes('/verify')) {
    schema = verificationSchema;
  } else if (req.path.includes('/feedback')) {
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
    const validationError: ValidationError = new Error(
      `Validation failed: ${error.details
        .map((d) => d.message)
        .join(', ')}`
    ) as ValidationError;
    validationError.statusCode = 400;
    validationError.code = 'VALIDATION_ERROR';
    return next(validationError);
  }

  // Replace request body with validated and sanitized data
  req.body = value;
  next();
};
