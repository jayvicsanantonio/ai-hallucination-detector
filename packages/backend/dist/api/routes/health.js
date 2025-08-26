"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SystemHealthMonitor_1 = require("../../services/monitoring/SystemHealthMonitor");
const Logger_1 = require("../../utils/Logger");
const router = (0, express_1.Router)();
// Mock logger and config for health checks
const mockLogger = new Logger_1.Logger('health-check');
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
router.get('/', async (req, res) => {
    try {
        const healthMonitor = new SystemHealthMonitor_1.SystemHealthMonitor(mockLogger, mockConfig);
        const health = await healthMonitor.performHealthChecks();
        const status = health.status === 'healthy' ? 200 : 503;
        res.status(status).json({
            status: health.status,
            timestamp: new Date().toISOString(),
            checks: health.checks || [],
            version: process.env.npm_package_version || '1.0.0',
            uptime: process.uptime(),
        });
    }
    catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Health check failed',
        });
    }
});
// Detailed health check (requires authentication)
router.get('/detailed', async (req, res) => {
    try {
        const healthMonitor = new SystemHealthMonitor_1.SystemHealthMonitor(mockLogger, mockConfig);
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
    }
    catch (error) {
        console.error('Detailed health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Detailed health check failed',
        });
    }
});
// Readiness probe
router.get('/ready', async (req, res) => {
    try {
        const healthMonitor = new SystemHealthMonitor_1.SystemHealthMonitor(mockLogger, mockConfig);
        const health = await healthMonitor.performHealthChecks();
        const isReady = health.status === 'healthy';
        if (isReady) {
            res.json({
                status: 'ready',
                timestamp: new Date().toISOString(),
            });
        }
        else {
            res.status(503).json({
                status: 'not_ready',
                timestamp: new Date().toISOString(),
            });
        }
    }
    catch (error) {
        console.error('Readiness check failed:', error);
        res.status(503).json({
            status: 'not_ready',
            timestamp: new Date().toISOString(),
            error: 'Readiness check failed',
        });
    }
});
// Liveness probe
router.get('/live', (req, res) => {
    res.json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        pid: process.pid,
    });
});
exports.default = router;
//# sourceMappingURL=health.js.map