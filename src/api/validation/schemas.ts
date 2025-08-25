import Joi from 'joi';

// Define schemas directly since they're not exported from validation middleware
const contentTypeSchema = Joi.string()
  .valid('text', 'pdf', 'docx', 'json')
  .default('text');
const domainSchema = Joi.string()
  .valid('healthcare', 'financial', 'legal', 'insurance', 'general')
  .default('general');
const urgencySchema = Joi.string()
  .valid('low', 'medium', 'high', 'critical')
  .default('medium');
const feedbackTypeSchema = Joi.string()
  .valid('correct', 'incorrect', 'partially_correct', 'unclear')
  .required();

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
    confidence: Joi.number().min(0).max(1).optional(),
  }),
};

// Validation function for feedback
export const validateFeedback = (data: any) => {
  return feedbackSchema.body.validate(data);
};
