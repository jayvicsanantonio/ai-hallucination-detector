import Joi from 'joi';
import {
  contentTypeSchema,
  domainSchema,
  urgencySchema,
  feedbackTypeSchema,
} from '../middleware/validation';

// Verify content request schema
export const verifyContentSchema = {
  body: Joi.object({
    content: Joi.string().min(1).max(10000000).required(),
    contentType: contentTypeSchema,
    domain: domainSchema,
    urgency: urgencySchema,
    metadata: Joi.object().optional(),
    filename: Joi.string().optional(),
  }),
};

// Batch verify request schema
export const batchVerifySchema = {
  body: Joi.object({
    documents: Joi.array()
      .items(
        Joi.object({
          id: Joi.string().required(),
          content: Joi.string().min(1).max(10000000).required(),
          contentType: contentTypeSchema,
          domain: domainSchema,
          filename: Joi.string().optional(),
          metadata: Joi.object().optional(),
        })
      )
      .min(1)
      .max(100) // Limit batch size
      .required(),
    domain: domainSchema,
    urgency: urgencySchema,
  }),
};

// Get results request schema
export const getResultsSchema = {
  params: Joi.object({
    verificationId: Joi.string().uuid().required(),
  }),
  query: Joi.object({
    includeAuditTrail: Joi.boolean().default(false),
  }),
};

// Feedback request schema
export const feedbackSchema = {
  body: Joi.object({
    verificationId: Joi.string().uuid().required(),
    feedback: feedbackTypeSchema,
    corrections: Joi.string().max(5000).optional(),
    expertNotes: Joi.string().max(2000).optional(),
    issueId: Joi.string().uuid().optional(),
  }),
};
