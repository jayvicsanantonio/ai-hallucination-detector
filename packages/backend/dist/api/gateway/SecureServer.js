"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.secureServer = exports.SecureServer = void 0;
const express_1 = __importDefault(require("express"));
const https_1 = __importDefault(require("https"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const validation_1 = require("../middleware/validation");
const TLSConfig_1 = require("../security/TLSConfig");
class SecureServer {
    constructor() {
        this.app = (0, express_1.default)();
        this.tlsConfig = new TLSConfig_1.TLSConfig({
            certPath: process.env.TLS_CERT_PATH,
            keyPath: process.env.TLS_KEY_PATH,
            caPath: process.env.TLS_CA_PATH,
        });
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }
    setupMiddleware() {
        // Enhanced security middleware with TLS 1.3 headers
        this.app.use((0, helmet_1.default)({
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
        }));
        // Apply additional security headers
        this.app.use((req, res, next) => {
            const securityHeaders = this.tlsConfig.getSecurityHeaders();
            Object.entries(securityHeaders).forEach(([key, value]) => {
                res.setHeader(key, value);
            });
            next();
        });
        // CORS configuration
        this.app.use((0, cors_1.default)({
            origin: (origin, callback) => {
                const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['https://localhost:3000'];
                // Allow requests with no origin (mobile apps, etc.)
                if (!origin)
                    return callback(null, true);
                if (allowedOrigins.includes(origin)) {
                    callback(null, true);
                }
                else {
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
        }));
        // Enhanced rate limiting with different tiers
        const createRateLimit = (windowMs, max, message) => {
            return (0, express_rate_limit_1.default)({
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
        this.app.use(createRateLimit(15 * 60 * 1000, // 15 minutes
        100, // 100 requests per window
        'Too many requests from this IP, please try again later.'));
        // Stricter rate limit for authentication endpoints
        this.app.use('/api/v1/auth', createRateLimit(15 * 60 * 1000, // 15 minutes
        5, // 5 requests per window
        'Too many authentication attempts, please try again later.'));
        // Body parsing middleware with size limits
        this.app.use(express_1.default.json({
            limit: '10mb',
            verify: (req, res, buf) => {
                // Store raw body for signature verification
                req.rawBody = buf;
            },
        }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
        // Request logging middleware
        this.app.use((req, res, next) => {
            const start = Date.now();
            res.on('finish', () => {
                const duration = Date.now() - start;
                console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
            });
            next();
        });
    }
    setupRoutes() {
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
        this.app.use('/api', auth_1.authMiddleware);
        // Validation middleware for API routes
        this.app.use('/api', validation_1.validationMiddleware);
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
    setupErrorHandling() {
        this.app.use(errorHandler_1.errorHandler);
    }
    /**
     * Starts the secure HTTPS server
     */
    async startSecure(port = 3443) {
        try {
            // Validate TLS configuration
            const validation = this.tlsConfig.validateConfig();
            if (!validation.valid) {
                console.warn('TLS configuration issues:', validation.errors);
                console.warn('Starting with self-signed certificate for development');
            }
            // Create HTTPS server with TLS 1.3
            const httpsOptions = this.tlsConfig.createHTTPSOptions();
            this.httpsServer = https_1.default.createServer(httpsOptions, this.app);
            this.httpsServer.listen(port, () => {
                console.log(`🔒 Secure server running on https://localhost:${port}`);
                console.log('✅ TLS 1.3 enabled');
                console.log('✅ Security headers configured');
                console.log('✅ Rate limiting active');
            });
            // Handle server errors
            this.httpsServer.on('error', (error) => {
                console.error('HTTPS server error:', error);
            });
        }
        catch (error) {
            console.error('Failed to start secure server:', error);
            throw error;
        }
    }
    /**
     * Starts HTTP server that redirects to HTTPS
     */
    startRedirectServer(httpPort = 3000, httpsPort = 3443) {
        const redirectApp = (0, express_1.default)();
        redirectApp.use((req, res) => {
            const httpsUrl = `https://${req.hostname}:${httpsPort}${req.url}`;
            res.redirect(301, httpsUrl);
        });
        this.httpServer = redirectApp.listen(httpPort, () => {
            console.log(`🔄 HTTP redirect server running on port ${httpPort} -> HTTPS ${httpsPort}`);
        });
    }
    /**
     * Gracefully shuts down the servers
     */
    async shutdown() {
        console.log('Shutting down servers...');
        const shutdownPromises = [];
        if (this.httpsServer) {
            shutdownPromises.push(new Promise((resolve) => {
                this.httpsServer.close(() => {
                    console.log('HTTPS server closed');
                    resolve();
                });
            }));
        }
        if (this.httpServer) {
            shutdownPromises.push(new Promise((resolve) => {
                this.httpServer.close(() => {
                    console.log('HTTP redirect server closed');
                    resolve();
                });
            }));
        }
        await Promise.all(shutdownPromises);
        console.log('All servers shut down gracefully');
    }
    getApp() {
        return this.app;
    }
}
exports.SecureServer = SecureServer;
// Export singleton instance
exports.secureServer = new SecureServer();
//# sourceMappingURL=SecureServer.js.map