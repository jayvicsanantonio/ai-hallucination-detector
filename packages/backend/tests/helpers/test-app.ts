import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from '../../src/api/middleware/errorHandler';
import { authMiddleware } from '../../src/api/middleware/auth';
import { validationMiddleware } from '../../src/api/middleware/validation';

// Import route handlers
import verifyRoutes from '../../src/api/routes/verify';
import resultsRoutes from '../../src/api/routes/results';
import feedbackRoutes from '../../src/api/routes/feedback';
import healthRoutes from '../../src/api/routes/health';

interface TestAppConfig {
  database?: any;
  redis?: any;
  enableAuth?: boolean;
  enableRateLimit?: boolean;
}

export async function createTestApp(
  config: TestAppConfig = {}
): Promise<Express> {
  const app = express();

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: false, // Disable for testing
    })
  );

  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  // Body parsing middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Rate limiting (configurable for testing)
  if (config.enableRateLimit !== false) {
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests from this IP',
          retryAfter: '15 minutes',
        },
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use('/api/', limiter);
  }

  // Authentication middleware (configurable for testing)
  if (config.enableAuth !== false) {
    app.use('/api/v1', authMiddleware);
  }

  // Validation middleware
  app.use('/api/v1', validationMiddleware);

  // Health check endpoint (no auth required)
  app.use('/api/v1/health', healthRoutes);

  // API routes
  app.use('/api/v1/verify', verifyRoutes);
  app.use('/api/v1/results', resultsRoutes);
  app.use('/api/v1/feedback', feedbackRoutes);

  // Admin routes (require admin role)
  app.get('/api/v1/admin/system-health', (req, res) => {
    // Check if user has admin role
    const user = (req as any).user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Admin access required',
        },
      });
    }

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: 'connected',
        verification: 'operational',
      },
    });
  });

  // API version validation
  app.use('/api/v*', (req, res, next) => {
    const version = req.path.split('/')[2];
    if (version !== 'v1') {
      return res.status(404).json({
        error: {
          code: 'UNSUPPORTED_API_VERSION',
          message: `API version ${version} is not supported`,
        },
      });
    }
    next();
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
      },
    });
  });

  // Error handling middleware
  app.use(errorHandler);

  return app;
}

export function createMockServices() {
  return {
    verificationEngine: {
      verifyContent: jest.fn().mockResolvedValue({
        verificationId: 'test-verification-id',
        overallConfidence: 85,
        riskLevel: 'medium',
        issues: [],
        auditTrail: [],
        processingTime: 1500,
        recommendations: [],
      }),
    },

    contentProcessor: {
      processContent: jest.fn().mockResolvedValue({
        id: 'test-content-id',
        extractedText: 'Processed content',
        contentType: 'text',
        structure: {
          sections: [],
          tables: [],
          figures: [],
          references: [],
        },
        entities: [],
        metadata: {},
        createdAt: new Date(),
      }),
    },

    auditLogger: {
      logVerification: jest.fn().mockResolvedValue(undefined),
      logFeedback: jest.fn().mockResolvedValue(undefined),
    },

    cacheManager: {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    },
  };
}
