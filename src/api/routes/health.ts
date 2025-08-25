import { Router, Request, Response } from 'express';
import { SystemHealthMonitor } from '../../services/monitoring/SystemHealthMonitor';
import { Logger } from '../../utils/Logger';

const router = Router();

// Mock logger and config for health checks
const mockLogger = new Logger('health-check');
const mockConfig = {
  metricsCollectionInterval: 30000,
  healthCheckInterval: 30000,
  alertThresholds: {
    cpu: { warning: 70, critical: 90 },
    memory: { warning: 80, critical: 95 },
    disk: { warning: 85, critical: 95 },
    responseTime: { warning: 1000, critical: 2000 },
    errorRate: { warning: 5, critical: 10 },
  },
  retentionPeriod: 86400000, // 24 hours
};

// Basic health check
router.get('/', async (req: Request, res: Response) => {
  try {
    const healthMonitor = new SystemHealthMonitor(
      mockLogger,
      mockConfig
    );
    const health = await healthMonitor.performHealthChecks();

    const status = health.status === 'healthy' ? 200 : 503;

    res.status(status).json({
      status: health.status,
      timestamp: new Date().toISOString(),
      checks: health.checks || [],
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

// Detailed health check (requires authentication)
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const healthMonitor = new SystemHealthMonitor(
      mockLogger,
      mockConfig
    );
    const detailedHealth = await healthMonitor.performHealthChecks();

    res.json({
      status: detailedHealth.status,
      timestamp: new Date().toISOString(),
      checks: detailedHealth.checks || [],
      overallScore: detailedHealth.overallScore || 100,
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    });
  } catch (error) {
    console.error('Detailed health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Detailed health check failed',
    });
  }
});

// Readiness probe
router.get('/ready', async (req: Request, res: Response) => {
  try {
    const healthMonitor = new SystemHealthMonitor(
      mockLogger,
      mockConfig
    );
    const health = await healthMonitor.performHealthChecks();
    const isReady = health.status === 'healthy';

    if (isReady) {
      res.json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: 'Readiness check failed',
    });
  }
});

// Liveness probe
router.get('/live', (req: Request, res: Response) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    pid: process.pid,
  });
});

export default router;
