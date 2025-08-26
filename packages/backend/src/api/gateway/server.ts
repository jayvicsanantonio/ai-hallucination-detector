import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from '../middleware/errorHandler';
import { authMiddleware } from '../middleware/auth';
import { validationMiddleware } from '../middleware/validation';

// Import route handlers
import verifyRoutes from '../routes/verify';
import resultsRoutes from '../routes/results';
import feedbackRoutes from '../routes/feedback';
import healthRoutes from '../routes/health';

export default function createApp() {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());

  // Body parsing middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP',
      },
    },
  });
  app.use('/api/', limiter);

  // Health check endpoint (no auth required)
  app.use('/api/v1/health', healthRoutes);

  // Authentication middleware for protected routes
  app.use('/api/v1', authMiddleware);

  // Validation middleware
  app.use('/api/v1', validationMiddleware);

  // API routes
  app.use('/api/v1/verify', verifyRoutes);
  app.use('/api/v1/results', resultsRoutes);
  app.use('/api/v1/feedback', feedbackRoutes);

  // Error handling middleware
  app.use(errorHandler);

  return app;
}
