import express from 'express';
import https from 'https';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../middleware/auth';
import { errorHandler } from '../middleware/errorHandler';
import { validationMiddleware } from '../middleware/validation';
import { TLSConfig } from '../security/TLSConfig';

export class SecureServer {
  private app: express.Application;
  private tlsConfig: TLSConfig;
  private httpServer?: http.Server;
  private httpsServer?: https.Server;

  constructor() {
    this.app = express();
    this.tlsConfig = new TLSConfig({
      certPath: process.env.TLS_CERT_PATH,
      keyPath: process.env.TLS_KEY_PATH,
      caPath: process.env.TLS_CA_PATH,
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Enhanced security middleware with TLS 1.3 headers
    app.use(
      helmet({
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        },
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
          },
        },
        crossOriginEmbedderPolicy: true,
        crossOriginOpenerPolicy: true,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        dnsPrefetchControl: true,
        frameguard: { action: 'deny' },
        hidePoweredBy: true,
        ieNoOpen: true,
        noSniff: true,
        originAgentCluster: true,
        permittedCrossDomainPolicies: false,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        xssFilter: true,
      })
    );

    // Apply additional security headers
    this.app.use((req, res, next) => {
      const securityHeaders = this.tlsConfig.getSecurityHeaders();
      Object.entries(securityHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      next();
    });

    // CORS configuration
    this.app.use(
      cors({
        origin: (origin, callback) => {
          const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(
            ','
          ) || ['https://localhost:3000'];

          // Allow requests with no origin (mobile apps, etc.)
          if (!origin) return callback(null, true);

          if (allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
          'Content-Type',
          'Authorization',
          'X-Requested-With',
        ],
        exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
      })
    );

    // Enhanced rate limiting with different tiers
    const createRateLimit = (
      windowMs: number,
      max: number,
      message: string
    ) => {
      return rateLimit({
        windowMs,
        max,
        message: { error: message },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
          res.status(429).json({
            error: message,
            retryAfter: Math.round(windowMs / 1000),
          });
        },
      });
    };

    // Global rate limit
    this.app.use(
      createRateLimit(
        15 * 60 * 1000, // 15 minutes
        100, // 100 requests per window
        'Too many requests from this IP, please try again later.'
      )
    );

    // Stricter rate limit for authentication endpoints
    this.app.use(
      '/api/v1/auth',
      createRateLimit(
        15 * 60 * 1000, // 15 minutes
        5, // 5 requests per window
        'Too many authentication attempts, please try again later.'
      )
    );

    // Body parsing middleware with size limits
    this.app.use(
      express.json({
        limit: '10mb',
        verify: (req, res, buf) => {
          // Store raw body for signature verification
          (req as any).rawBody = buf;
        },
      })
    );
    this.app.use(
      express.urlencoded({ extended: true, limit: '10mb' })
    );

    // Request logging middleware
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(
          `${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`
        );
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check endpoint (no auth required)
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.APP_VERSION || '1.0.0',
      });
    });

    // Security info endpoint
    this.app.get('/security', (req, res) => {
      res.status(200).json({
        tls: {
          version: 'TLS 1.3',
          ciphers: 'AES-256-GCM, ChaCha20-Poly1305',
        },
        headers: {
          hsts: true,
          csp: true,
          frameOptions: 'DENY',
        },
      });
    });

    // Authentication middleware for API routes
    this.app.use('/api', authMiddleware);

    // Validation middleware for API routes
    this.app.use('/api', validationMiddleware);

    // API routes
    this.app.use('/api/v1/verify', require('../routes/verify'));
    this.app.use('/api/v1/results', require('../routes/results'));
    this.app.use('/api/v1/feedback', require('../routes/feedback'));

    // Catch-all for undefined routes
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  /**
   * Starts the secure HTTPS server
   */
  async startSecure(port: number = 3443): Promise<void> {
    try {
      // Validate TLS configuration
      const validation = this.tlsConfig.validateConfig();
      if (!validation.valid) {
        console.warn('TLS configuration issues:', validation.errors);
        console.warn(
          'Starting with self-signed certificate for development'
        );
      }

      // Create HTTPS server with TLS 1.3
      const httpsOptions = this.tlsConfig.createHTTPSOptions();
      this.httpsServer = https.createServer(httpsOptions, this.app);

      this.httpsServer.listen(port, () => {
        console.log(
          `🔒 Secure server running on https://localhost:${port}`
        );
        console.log('✅ TLS 1.3 enabled');
        console.log('✅ Security headers configured');
        console.log('✅ Rate limiting active');
      });

      // Handle server errors
      this.httpsServer.on('error', (error) => {
        console.error('HTTPS server error:', error);
      });
    } catch (error) {
      console.error('Failed to start secure server:', error);
      throw error;
    }
  }

  /**
   * Starts HTTP server that redirects to HTTPS
   */
  startRedirectServer(
    httpPort: number = 3000,
    httpsPort: number = 3443
  ): void {
    const redirectApp = express();

    redirectApp.use((req, res) => {
      const httpsUrl = `https://${req.hostname}:${httpsPort}${req.url}`;
      res.redirect(301, httpsUrl);
    });

    this.httpServer = redirectApp.listen(httpPort, () => {
      console.log(
        `🔄 HTTP redirect server running on port ${httpPort} -> HTTPS ${httpsPort}`
      );
    });
  }

  /**
   * Gracefully shuts down the servers
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down servers...');

    const shutdownPromises: Promise<void>[] = [];

    if (this.httpsServer) {
      shutdownPromises.push(
        new Promise((resolve) => {
          this.httpsServer!.close(() => {
            console.log('HTTPS server closed');
            resolve();
          });
        })
      );
    }

    if (this.httpServer) {
      shutdownPromises.push(
        new Promise((resolve) => {
          this.httpServer!.close(() => {
            console.log('HTTP redirect server closed');
            resolve();
          });
        })
      );
    }

    await Promise.all(shutdownPromises);
    console.log('All servers shut down gracefully');
  }

  getApp(): express.Application {
    return this.app;
  }
}

// Export singleton instance
export const secureServer = new SecureServer();
