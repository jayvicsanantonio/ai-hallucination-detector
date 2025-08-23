import { Router, Request, Response } from 'express';
import { SystemHealthMonitor } from '../../services/monitoring/SystemHealthMonitor';

const router = Router();

// Basic health check
router.get('/', async (req: Request, res: Response) => {
  try {
    const healthMonitor = new SystemHealthMonitor();
    const health = await healthMonitor.getSystemHealth();

    const status = health.overall === 'healthy' ? 200 : 503;

    res.status(status).json({
      status: health.overall,
      timestamp: new Date().toISOString(),
      services: health.services,
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
    const healthMonitor = new SystemHealthMonitor();
    const detailedHealth = await healthMonitor.getDetailedHealth();

    res.json({
      status: detailedHealth.overall,
      timestamp: new Date().toISOString(),
      services: detailedHealth.services,
      metrics: detailedHealth.metrics,
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
    const healthMonitor = new SystemHealthMonitor();
    const isReady = await healthMonitor.isSystemReady();

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
