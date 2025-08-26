"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemHealthMonitor = void 0;
class SystemHealthMonitor {
    constructor(logger, config) {
        this.metricsHistory = [];
        this.appMetricsHistory = [];
        this.healthHistory = [];
        this.logger = logger;
        this.config = config;
        this.startMonitoring();
    }
    /**
     * Start monitoring system health and metrics
     */
    startMonitoring() {
        // Start metrics collection
        this.metricsTimer = setInterval(async () => {
            try {
                await this.collectMetrics();
            }
            catch (error) {
                this.logger.error('Failed to collect metrics', { error });
            }
        }, this.config.metricsCollectionInterval);
        // Start health checks
        this.healthTimer = setInterval(async () => {
            try {
                await this.performHealthChecks();
            }
            catch (error) {
                this.logger.error('Failed to perform health checks', {
                    error,
                });
            }
        }, this.config.healthCheckInterval);
    }
    /**
     * Collect system and application metrics
     */
    async collectMetrics() {
        try {
            const systemMetrics = await this.collectSystemMetrics();
            const appMetrics = await this.collectApplicationMetrics();
            this.metricsHistory.push(systemMetrics);
            this.appMetricsHistory.push(appMetrics);
            // Clean up old metrics
            this.cleanupOldMetrics();
            this.logger.debug('Collected system metrics', {
                cpu: systemMetrics.cpu.usage,
                memory: systemMetrics.memory.usage,
                requests: appMetrics.requests.requestsPerSecond,
            });
        }
        catch (error) {
            this.logger.error('Failed to collect metrics', { error });
        }
    }
    /**
     * Perform comprehensive health checks
     */
    async performHealthChecks() {
        const checks = [];
        // System resource checks
        checks.push(await this.checkCpuHealth());
        checks.push(await this.checkMemoryHealth());
        checks.push(await this.checkDiskHealth());
        // Application checks
        checks.push(await this.checkDatabaseHealth());
        checks.push(await this.checkCacheHealth());
        checks.push(await this.checkApiHealth());
        // External service checks
        checks.push(await this.checkExternalServicesHealth());
        const overallScore = this.calculateHealthScore(checks);
        const status = this.determineHealthStatus(overallScore, checks);
        const healthStatus = {
            status,
            timestamp: new Date(),
            checks,
            overallScore,
        };
        this.healthHistory.push(healthStatus);
        this.cleanupOldHealthData();
        this.logger.info('Health check completed', {
            status,
            score: overallScore,
            failedChecks: checks.filter((c) => c.status === 'fail').length,
        });
        return healthStatus;
    }
    /**
     * Get current system metrics
     */
    getCurrentMetrics() {
        return {
            system: this.metricsHistory[this.metricsHistory.length - 1] || null,
            application: this.appMetricsHistory[this.appMetricsHistory.length - 1] ||
                null,
        };
    }
    /**
     * Get current health status
     */
    getCurrentHealth() {
        return this.healthHistory[this.healthHistory.length - 1] || null;
    }
    /**
     * Get metrics history for a time period
     */
    getMetricsHistory(startTime, endTime) {
        return {
            system: this.metricsHistory.filter((m) => m.timestamp >= startTime && m.timestamp <= endTime),
            application: this.appMetricsHistory.filter((m) => m.timestamp >= startTime && m.timestamp <= endTime),
        };
    }
    /**
     * Get health history for a time period
     */
    getHealthHistory(startTime, endTime) {
        return this.healthHistory.filter((h) => h.timestamp >= startTime && h.timestamp <= endTime);
    }
    /**
     * Shutdown monitoring
     */
    shutdown() {
        if (this.metricsTimer) {
            clearInterval(this.metricsTimer);
        }
        if (this.healthTimer) {
            clearInterval(this.healthTimer);
        }
    }
    async collectSystemMetrics() {
        // In a real implementation, this would use system monitoring libraries
        // For now, we'll return mock data
        return {
            timestamp: new Date(),
            cpu: {
                usage: Math.random() * 100,
                loadAverage: [1.2, 1.5, 1.8],
            },
            memory: {
                used: 2 * 1024 * 1024 * 1024, // 2GB
                total: 8 * 1024 * 1024 * 1024, // 8GB
                usage: 25,
            },
            disk: {
                used: 50 * 1024 * 1024 * 1024, // 50GB
                total: 500 * 1024 * 1024 * 1024, // 500GB
                usage: 10,
            },
            network: {
                bytesIn: 1024 * 1024,
                bytesOut: 512 * 1024,
                packetsIn: 1000,
                packetsOut: 800,
            },
            processes: {
                active: 150,
                total: 200,
            },
        };
    }
    async collectApplicationMetrics() {
        // In a real implementation, this would collect actual application metrics
        return {
            timestamp: new Date(),
            requests: {
                total: 1000,
                successful: 950,
                failed: 50,
                averageResponseTime: 250,
                requestsPerSecond: 10,
            },
            verification: {
                totalVerifications: 500,
                successfulVerifications: 475,
                failedVerifications: 25,
                averageProcessingTime: 1500,
                verificationsPerHour: 100,
            },
            database: {
                connections: {
                    active: 5,
                    idle: 15,
                    total: 20,
                },
                queries: {
                    total: 2000,
                    successful: 1980,
                    failed: 20,
                    averageExecutionTime: 50,
                },
            },
            cache: {
                hits: 800,
                misses: 200,
                hitRate: 80,
                memoryUsage: 100 * 1024 * 1024, // 100MB
            },
        };
    }
    async checkCpuHealth() {
        const metrics = await this.collectSystemMetrics();
        const cpuUsage = metrics.cpu.usage;
        if (cpuUsage > this.config.alertThresholds.cpu.critical) {
            return {
                name: 'cpu',
                status: 'fail',
                responseTime: 0,
                message: `CPU usage critical: ${cpuUsage.toFixed(1)}%`,
                details: {
                    usage: cpuUsage,
                    threshold: this.config.alertThresholds.cpu.critical,
                },
            };
        }
        else if (cpuUsage > this.config.alertThresholds.cpu.warning) {
            return {
                name: 'cpu',
                status: 'warn',
                responseTime: 0,
                message: `CPU usage high: ${cpuUsage.toFixed(1)}%`,
                details: {
                    usage: cpuUsage,
                    threshold: this.config.alertThresholds.cpu.warning,
                },
            };
        }
        return {
            name: 'cpu',
            status: 'pass',
            responseTime: 0,
            message: `CPU usage normal: ${cpuUsage.toFixed(1)}%`,
        };
    }
    async checkMemoryHealth() {
        const metrics = await this.collectSystemMetrics();
        const memoryUsage = metrics.memory.usage;
        if (memoryUsage > this.config.alertThresholds.memory.critical) {
            return {
                name: 'memory',
                status: 'fail',
                responseTime: 0,
                message: `Memory usage critical: ${memoryUsage.toFixed(1)}%`,
            };
        }
        else if (memoryUsage > this.config.alertThresholds.memory.warning) {
            return {
                name: 'memory',
                status: 'warn',
                responseTime: 0,
                message: `Memory usage high: ${memoryUsage.toFixed(1)}%`,
            };
        }
        return {
            name: 'memory',
            status: 'pass',
            responseTime: 0,
            message: `Memory usage normal: ${memoryUsage.toFixed(1)}%`,
        };
    }
    async checkDiskHealth() {
        const metrics = await this.collectSystemMetrics();
        const diskUsage = metrics.disk.usage;
        if (diskUsage > this.config.alertThresholds.disk.critical) {
            return {
                name: 'disk',
                status: 'fail',
                responseTime: 0,
                message: `Disk usage critical: ${diskUsage.toFixed(1)}%`,
            };
        }
        else if (diskUsage > this.config.alertThresholds.disk.warning) {
            return {
                name: 'disk',
                status: 'warn',
                responseTime: 0,
                message: `Disk usage high: ${diskUsage.toFixed(1)}%`,
            };
        }
        return {
            name: 'disk',
            status: 'pass',
            responseTime: 0,
            message: `Disk usage normal: ${diskUsage.toFixed(1)}%`,
        };
    }
    async checkDatabaseHealth() {
        const startTime = Date.now();
        try {
            // In a real implementation, this would perform a database health check
            await new Promise((resolve) => setTimeout(resolve, 10)); // Simulate DB check
            const responseTime = Date.now() - startTime;
            return {
                name: 'database',
                status: 'pass',
                responseTime,
                message: 'Database connection healthy',
            };
        }
        catch (error) {
            return {
                name: 'database',
                status: 'fail',
                responseTime: Date.now() - startTime,
                message: 'Database connection failed',
                details: { error: error.message },
            };
        }
    }
    async checkCacheHealth() {
        const startTime = Date.now();
        try {
            // In a real implementation, this would check Redis/cache health
            await new Promise((resolve) => setTimeout(resolve, 5)); // Simulate cache check
            const responseTime = Date.now() - startTime;
            return {
                name: 'cache',
                status: 'pass',
                responseTime,
                message: 'Cache service healthy',
            };
        }
        catch (error) {
            return {
                name: 'cache',
                status: 'fail',
                responseTime: Date.now() - startTime,
                message: 'Cache service failed',
                details: { error: error.message },
            };
        }
    }
    async checkApiHealth() {
        const metrics = await this.collectApplicationMetrics();
        const errorRate = (metrics.requests.failed / metrics.requests.total) * 100;
        const avgResponseTime = metrics.requests.averageResponseTime;
        if (errorRate > this.config.alertThresholds.errorRate.critical ||
            avgResponseTime >
                this.config.alertThresholds.responseTime.critical) {
            return {
                name: 'api',
                status: 'fail',
                responseTime: avgResponseTime,
                message: `API performance critical: ${errorRate.toFixed(1)}% error rate, ${avgResponseTime}ms avg response`,
            };
        }
        else if (errorRate > this.config.alertThresholds.errorRate.warning ||
            avgResponseTime >
                this.config.alertThresholds.responseTime.warning) {
            return {
                name: 'api',
                status: 'warn',
                responseTime: avgResponseTime,
                message: `API performance degraded: ${errorRate.toFixed(1)}% error rate, ${avgResponseTime}ms avg response`,
            };
        }
        return {
            name: 'api',
            status: 'pass',
            responseTime: avgResponseTime,
            message: `API performance normal: ${errorRate.toFixed(1)}% error rate, ${avgResponseTime}ms avg response`,
        };
    }
    async checkExternalServicesHealth() {
        // In a real implementation, this would check external service dependencies
        return {
            name: 'external_services',
            status: 'pass',
            responseTime: 100,
            message: 'External services healthy',
        };
    }
    calculateHealthScore(checks) {
        const weights = { pass: 100, warn: 60, fail: 0 };
        const totalScore = checks.reduce((sum, check) => sum + weights[check.status], 0);
        return Math.round(totalScore / checks.length);
    }
    determineHealthStatus(score, checks) {
        const failedChecks = checks.filter((c) => c.status === 'fail').length;
        if (failedChecks > 0 || score < 50) {
            return 'critical';
        }
        else if (score < 70) {
            return 'unhealthy';
        }
        else if (score < 90) {
            return 'degraded';
        }
        else {
            return 'healthy';
        }
    }
    cleanupOldMetrics() {
        const cutoffTime = new Date(Date.now() - this.config.retentionPeriod);
        this.metricsHistory = this.metricsHistory.filter((m) => m.timestamp > cutoffTime);
        this.appMetricsHistory = this.appMetricsHistory.filter((m) => m.timestamp > cutoffTime);
    }
    cleanupOldHealthData() {
        const cutoffTime = new Date(Date.now() - this.config.retentionPeriod);
        this.healthHistory = this.healthHistory.filter((h) => h.timestamp > cutoffTime);
    }
}
exports.SystemHealthMonitor = SystemHealthMonitor;
//# sourceMappingURL=SystemHealthMonitor.js.map