import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';

// Add request ID to all requests
export const requestId = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  req.headers['x-request-id'] =
    req.headers['x-request-id'] || uuidv4();
  res.setHeader('x-request-id', req.headers['x-request-id']);
  next();
};

// Validation middleware factory
export const validateRequest = (schema: {
  body?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    // Validate body
    if (schema.body) {
      const { error } = schema.body.validate(req.body);
      if (error) {
        errors.push(
          `Body: ${error.details.map((d) => d.message).join(', ')}`
        );
      }
    }

    // Validate params
    if (schema.params) {
      const { error } = schema.params.validate(req.params);
      if (error) {
        errors.push(
          `Params: ${error.details.map((d) => d.message).join(', ')}`
        );
      }
    }

    // Validate query
    if (schema.query) {
      const { error } = schema.query.validate(req.query);
      if (error) {
        errors.push(
          `Query: ${error.details.map((d) => d.message).join(', ')}`
        );
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: { validationErrors: errors },
          timestamp: new Date(),
          requestId: req.headers['x-request-id'],
          retryable: false,
        },
      });
    }

    next();
  };
};

// Content type validation schemas
export const contentTypeSchema = Joi.string()
  .valid('text', 'pdf', 'docx', 'json')
  .required();

export const domainSchema = Joi.string()
  .valid('legal', 'financial', 'healthcare', 'insurance')
  .required();

export const urgencySchema = Joi.string()
  .valid('low', 'medium', 'high')
  .default('medium');

export const feedbackTypeSchema = Joi.string()
  .valid('correct', 'incorrect', 'partial')
  .required();
