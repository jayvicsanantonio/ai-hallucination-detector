import {
  AlertingService,
  AlertRule,
  AlertingConfig,
  AlertType,
  AlertSeverity,
} from '../../../../src/services/monitoring/AlertingService';
import {
  SystemMetrics,
  ApplicationMetrics,
  HealthStatus,
} from '../../../../src/services/monitoring/SystemHealthMonitor';
import { Logger } from '../../../../src/utils/Logger';

describe('AlertingService', () => {
  let alertingService: AlertingService;
  let mockLogger: jest.Mocked<Logger>;
  let config: AlertingConfig;
  let mockSystemMetrics: SystemMetrics;
  let mockAppMetrics: ApplicationMetrics;
  let mockHealthStatus: HealthStatus;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    config = {
      evaluationInterval: 1000,
      maxActiveAlerts: 100,
      defaultCooldownPeriod: 300000, // 5 minutes
      retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
    };

    mockSystemMetrics = {
      timestamp: new Date(),
      cpu: { usage: 50, loadAverage: [1.0, 1.1, 1.2] },
      memory: { used: 4096, total: 8192, usage: 50 },
      disk: { used: 2048, total: 10240, usage: 20 },
      network: {
        bytesIn: 1024,
        bytesOut: 512,
        packetsIn: 100,
        packetsOut: 80,
      },
      processes: { active: 50, total: 100 },
    };

    mockAppMetrics = {
      timestamp: new Date(),
      requests: {
        total: 1000,
        successful: 950,
        failed: 50,
        averageResponseTime: 200,
        requestsPerSecond: 10,
      },
      verification: {
        totalVerifications: 500,
        successfulVerifications: 475,
        failedVerifications: 25,
        averageProcessingTime: 1000,
        verificationsPerHour: 100,
      },
      database: {
        connections: { active: 5, idle: 15, total: 20 },
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
        memoryUsage: 100 * 1024 * 1024,
      },
    };

    mockHealthStatus = {
      status: 'healthy',
      timestamp: new Date(),
      checks: [
        {
          name: 'cpu',
          status: 'pass',
          responseTime: 0,
          message: 'CPU usage normal',
        },
        {
          name: 'memory',
          status: 'pass',
          responseTime: 0,
          message: 'Memory usage normal',
        },
      ],
      overallScore: 95,
    };

    alertingService = new AlertingService(mockLogger, config);
  });

  afterEach(() => {
    alertingService.shutdown();
  });

  describe('addAlertRule', () => {
    it('should add alert rule successfully', () => {
      const rule: AlertRule = {
        id: 'cpu-high',
        name: 'High CPU Usage',
        description: 'CPU usage is too high',
        enabled: true,
        type: 'system_resource',
        severity: 'warning',
        condition: {
          metric: 'system.cpu.usage',
          operator: 'gt',
          threshold: 80,
        },
        cooldownPeriod: 300000,
        notificationChannels: ['email'],
      };

      alertingService.addAlertRule(rule);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Alert rule added',
        { ruleId: 'cpu-high', name: 'High CPU Usage' }
      );
    });
  });

  describe('removeAlertRule', () => {
    it('should remove existing alert rule', () => {
      const rule: AlertRule = {
        id: 'cpu-high',
        name: 'High CPU Usage',
        description: 'CPU usage is too high',
        enabled: true,
        type: 'system_resource',
        severity: 'warning',
        condition: {
          metric: 'system.cpu.usage',
          operator: 'gt',
          threshold: 80,
        },
        cooldownPeriod: 300000,
        notificationChannels: ['email'],
      };

      alertingService.addAlertRule(rule);
      const removed = alertingService.removeAlertRule('cpu-high');

      expect(removed).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Alert rule removed',
        { ruleId: 'cpu-high' }
      );
    });

    it('should return false for non-existent rule', () => {
      const removed = alertingService.removeAlertRule('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('evaluateMetrics', () => {
    it('should trigger alert when threshold exceeded', async () => {
      const rule: AlertRule = {
        id: 'cpu-high',
        name: 'High CPU Usage',
        description: 'CPU usage is too high',
        enabled: true,
        type: 'system_resource',
        severity: 'warning',
        condition: {
          metric: 'system.cpu.usage',
          operator: 'gt',
          threshold: 40,
        }, // Lower than current 50%
        cooldownPeriod: 0, // No cooldown for testing
        notificationChannels: ['email'],
      };

      alertingService.addAlertRule(rule);

      await alertingService.evaluateMetrics(
        mockSystemMetrics,
        mockAppMetrics,
        mockHealthStatus
      );

      const activeAlerts = alertingService.getActiveAlerts();
      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].type).toBe('system_resource');
      expect(activeAlerts[0].severity).toBe('warning');
      expect(activeAlerts[0].title).toBe('High CPU Usage');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Alert triggered',
        expect.objectContaining({
          type: 'system_resource',
          severity: 'warning',
          title: 'High CPU Usage',
        })
      );
    });

    it('should not trigger alert when threshold not exceeded', async () => {
      const rule: AlertRule = {
        id: 'cpu-high',
        name: 'High CPU Usage',
        description: 'CPU usage is too high',
        enabled: true,
        type: 'system_resource',
        severity: 'warning',
        condition: {
          metric: 'system.cpu.usage',
          operator: 'gt',
          threshold: 80,
        }, // Higher than current 50%
        cooldownPeriod: 0,
        notificationChannels: ['email'],
      };

      alertingService.addAlertRule(rule);

      await alertingService.evaluateMetrics(
        mockSystemMetrics,
        mockAppMetrics,
        mockHealthStatus
      );

      const activeAlerts = alertingService.getActiveAlerts();
      expect(activeAlerts).toHaveLength(0);
    });

    it('should not trigger alert when rule is disabled', async () => {
      const rule: AlertRule = {
        id: 'cpu-high',
        name: 'High CPU Usage',
        description: 'CPU usage is too high',
        enabled: false, // Disabled
        type: 'system_resource',
        severity: 'warning',
        condition: {
          metric: 'system.cpu.usage',
          operator: 'gt',
          threshold: 40,
        },
        cooldownPeriod: 0,
        notificationChannels: ['email'],
      };

      alertingService.addAlertRule(rule);

      await alertingService.evaluateMetrics(
        mockSystemMetrics,
        mockAppMetrics,
        mockHealthStatus
      );

      const activeAlerts = alertingService.getActiveAlerts();
      expect(activeAlerts).toHaveLength(0);
    });

    it('should respect cooldown period', async () => {
      const rule: AlertRule = {
        id: 'cpu-high',
        name: 'High CPU Usage',
        description: 'CPU usage is too high',
        enabled: true,
        type: 'system_resource',
        severity: 'warning',
        condition: {
          metric: 'system.cpu.usage',
          operator: 'gt',
          threshold: 40,
        },
        cooldownPeriod: 60000, // 1 minute cooldown
        notificationChannels: ['email'],
      };

      alertingService.addAlertRule(rule);

      // First evaluation should trigger alert
      await alertingService.evaluateMetrics(
        mockSystemMetrics,
        mockAppMetrics,
        mockHealthStatus
      );
      expect(alertingService.getActiveAlerts()).toHaveLength(1);

      // Second evaluation immediately after should not trigger another alert
      await alertingService.evaluateMetrics(
        mockSystemMetrics,
        mockAppMetrics,
        mockHealthStatus
      );
      expect(alertingService.getActiveAlerts()).toHaveLength(1); // Still only one alert
    });
  });

  describe('triggerManualAlert', () => {
    it('should create manual alert successfully', async () => {
      const alert = await alertingService.triggerManualAlert(
        'security_incident',
        'critical',
        'Security Breach Detected',
        'Unauthorized access attempt detected',
        'security_system',
        { ip: '192.168.1.100', attempts: 5 }
      );

      expect(alert.type).toBe('security_incident');
      expect(alert.severity).toBe('critical');
      expect(alert.title).toBe('Security Breach Detected');
      expect(alert.status).toBe('active');

      const activeAlerts = alertingService.getActiveAlerts();
      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].id).toBe(alert.id);
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge existing alert', async () => {
      const alert = await alertingService.triggerManualAlert(
        'system_resource',
        'warning',
        'Test Alert',
        'Test message',
        'test'
      );

      const acknowledged = await alertingService.acknowledgeAlert(
        alert.id,
        'admin'
      );

      expect(acknowledged).toBe(true);
      expect(alert.status).toBe('acknowledged');
      expect(alert.acknowledgedBy).toBe('admin');
      expect(alert.acknowledgedAt).toBeInstanceOf(Date);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Alert acknowledged',
        expect.objectContaining({
          alertId: alert.id,
          acknowledgedBy: 'admin',
          title: 'Test Alert',
        })
      );
    });

    it('should return false for non-existent alert', async () => {
      const acknowledged = await alertingService.acknowledgeAlert(
        'non-existent',
        'admin'
      );
      expect(acknowledged).toBe(false);
    });
  });

  describe('resolveAlert', () => {
    it('should resolve existing alert', async () => {
      const alert = await alertingService.triggerManualAlert(
        'system_resource',
        'warning',
        'Test Alert',
        'Test message',
        'test'
      );

      const resolved = await alertingService.resolveAlert(alert.id);

      expect(resolved).toBe(true);
      expect(alert.status).toBe('resolved');
      expect(alert.resolvedAt).toBeInstanceOf(Date);

      // Alert should be moved from active to history
      expect(alertingService.getActiveAlerts()).toHaveLength(0);
      expect(alertingService.getAlertHistory()).toHaveLength(1);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Alert resolved',
        expect.objectContaining({
          alertId: alert.id,
          title: 'Test Alert',
          duration: expect.any(Number),
        })
      );
    });

    it('should return false for non-existent alert', async () => {
      const resolved = await alertingService.resolveAlert(
        'non-existent'
      );
      expect(resolved).toBe(false);
    });
  });

  describe('getAlertStatistics', () => {
    it('should return correct alert statistics', async () => {
      // Create some test alerts
      await alertingService.triggerManualAlert(
        'system_resource',
        'warning',
        'Alert 1',
        'Message 1',
        'test'
      );
      await alertingService.triggerManualAlert(
        'application_performance',
        'error',
        'Alert 2',
        'Message 2',
        'test'
      );
      await alertingService.triggerManualAlert(
        'security_incident',
        'critical',
        'Alert 3',
        'Message 3',
        'test'
      );

      // Resolve one alert
      const activeAlerts = alertingService.getActiveAlerts();
      await alertingService.resolveAlert(activeAlerts[0].id);

      const stats = alertingService.getAlertStatistics();

      expect(stats.total).toBe(1); // Only resolved alerts count in history
      expect(stats.activeCount).toBe(2); // Two alerts still active
      expect(stats.bySeverity).toBeDefined();
      expect(stats.byType).toBeDefined();
      expect(stats.averageResolutionTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('condition evaluation', () => {
    it('should evaluate greater than condition correctly', async () => {
      const rule: AlertRule = {
        id: 'memory-high',
        name: 'High Memory Usage',
        description: 'Memory usage is too high',
        enabled: true,
        type: 'system_resource',
        severity: 'warning',
        condition: {
          metric: 'system.memory.usage',
          operator: 'gt',
          threshold: 40,
        },
        cooldownPeriod: 0,
        notificationChannels: [],
      };

      alertingService.addAlertRule(rule);
      await alertingService.evaluateMetrics(
        mockSystemMetrics,
        mockAppMetrics,
        mockHealthStatus
      );

      expect(alertingService.getActiveAlerts()).toHaveLength(1);
    });

    it('should evaluate less than condition correctly', async () => {
      const rule: AlertRule = {
        id: 'requests-low',
        name: 'Low Request Rate',
        description: 'Request rate is too low',
        enabled: true,
        type: 'application_performance',
        severity: 'warning',
        condition: {
          metric: 'app.requests.requestsPerSecond',
          operator: 'lt',
          threshold: 20,
        },
        cooldownPeriod: 0,
        notificationChannels: [],
      };

      alertingService.addAlertRule(rule);
      await alertingService.evaluateMetrics(
        mockSystemMetrics,
        mockAppMetrics,
        mockHealthStatus
      );

      expect(alertingService.getActiveAlerts()).toHaveLength(1);
    });

    it('should handle invalid metric paths gracefully', async () => {
      const rule: AlertRule = {
        id: 'invalid-metric',
        name: 'Invalid Metric Rule',
        description: 'Rule with invalid metric',
        enabled: true,
        type: 'system_resource',
        severity: 'warning',
        condition: {
          metric: 'invalid.metric.path',
          operator: 'gt',
          threshold: 50,
        },
        cooldownPeriod: 0,
        notificationChannels: [],
      };

      alertingService.addAlertRule(rule);
      await alertingService.evaluateMetrics(
        mockSystemMetrics,
        mockAppMetrics,
        mockHealthStatus
      );

      // Should not trigger alert for invalid metric
      expect(alertingService.getActiveAlerts()).toHaveLength(0);
    });
  });
});
