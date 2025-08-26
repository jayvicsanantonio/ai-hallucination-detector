import {
  ModelPerformanceMonitor,
  PerformanceMetric,
  PerformanceAlert,
  ModelHealthReport,
} from '../../../../src/services/learning/ModelPerformanceMonitor';

// Mock dependencies
jest.mock('../../../../src/utils/Logger');

describe('ModelPerformanceMonitor', () => {
  let monitor: ModelPerformanceMonitor;

  beforeEach(() => {
    monitor = new ModelPerformanceMonitor();
  });

  describe('recordMetric', () => {
    it('should record performance metric successfully', async () => {
      // Arrange
      const metric = {
        modelVersionId: 'model-v1',
        domain: 'legal' as const,
        metricType: 'accuracy' as const,
        value: 0.85,
        metadata: { source: 'validation' },
      };

      // Act
      await monitor.recordMetric(metric);

      // Assert
      const metrics = await monitor.getMetrics('model-v1');
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toEqual(
        expect.objectContaining({
          modelVersionId: 'model-v1',
          domain: 'legal',
          metricType: 'accuracy',
          value: 0.85,
          id: expect.any(String),
          timestamp: expect.any(Date),
        })
      );
    });

    it('should create alert when metric below threshold', async () => {
      // Arrange
      await monitor.setThresholds('model-v1', { accuracy: 0.8 });

      const metric = {
        modelVersionId: 'model-v1',
        domain: 'legal' as const,
        metricType: 'accuracy' as const,
        value: 0.75, // Below threshold
      };

      // Act
      await monitor.recordMetric(metric);

      // Assert
      const alerts = await monitor.getAlerts('model-v1');
      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toEqual(
        expect.objectContaining({
          modelVersionId: 'model-v1',
          alertType: 'accuracy_drop',
          severity: 'high',
          currentValue: 0.75,
          threshold: 0.8,
        })
      );
    });

    it('should create critical alert for severe performance drop', async () => {
      // Arrange
      await monitor.setThresholds('model-v1', { accuracy: 0.8 });

      const metric = {
        modelVersionId: 'model-v1',
        domain: 'legal' as const,
        metricType: 'accuracy' as const,
        value: 0.6, // Severely below threshold (< 80% of threshold)
      };

      // Act
      await monitor.recordMetric(metric);

      // Assert
      const alerts = await monitor.getAlerts('model-v1');
      expect(alerts[0].severity).toBe('critical');
    });

    it('should create alert for high response time', async () => {
      // Arrange
      await monitor.setThresholds('model-v1', {
        response_time: 1000,
      });

      const metric = {
        modelVersionId: 'model-v1',
        domain: 'legal' as const,
        metricType: 'response_time' as const,
        value: 1500, // Above threshold
      };

      // Act
      await monitor.recordMetric(metric);

      // Assert
      const alerts = await monitor.getAlerts('model-v1');
      expect(alerts).toHaveLength(1);
      expect(alerts[0].alertType).toBe('performance_degradation');
    });
  });

  describe('getMetrics', () => {
    beforeEach(async () => {
      // Add some test metrics
      const metrics = [
        {
          modelVersionId: 'model-v1',
          domain: 'legal' as const,
          metricType: 'accuracy' as const,
          value: 0.85,
        },
        {
          modelVersionId: 'model-v1',
          domain: 'legal' as const,
          metricType: 'precision' as const,
          value: 0.82,
        },
        {
          modelVersionId: 'model-v1',
          domain: 'legal' as const,
          metricType: 'accuracy' as const,
          value: 0.87,
        },
      ];

      for (const metric of metrics) {
        await monitor.recordMetric(metric);
      }
    });

    it('should return all metrics for a model', async () => {
      // Act
      const metrics = await monitor.getMetrics('model-v1');

      // Assert
      expect(metrics).toHaveLength(3);
    });

    it('should filter metrics by type', async () => {
      // Act
      const accuracyMetrics = await monitor.getMetrics('model-v1', {
        metricType: 'accuracy',
      });

      // Assert
      expect(accuracyMetrics).toHaveLength(2);
      expect(
        accuracyMetrics.every((m) => m.metricType === 'accuracy')
      ).toBe(true);
    });

    it('should limit number of returned metrics', async () => {
      // Act
      const limitedMetrics = await monitor.getMetrics('model-v1', {
        limit: 2,
      });

      // Assert
      expect(limitedMetrics).toHaveLength(2);
    });

    it('should return empty array for non-existent model', async () => {
      // Act
      const metrics = await monitor.getMetrics('non-existent-model');

      // Assert
      expect(metrics).toEqual([]);
    });
  });

  describe('generateHealthReport', () => {
    beforeEach(async () => {
      // Add comprehensive test metrics
      const metrics = [
        { metricType: 'accuracy' as const, value: 0.85 },
        { metricType: 'precision' as const, value: 0.82 },
        { metricType: 'recall' as const, value: 0.88 },
        { metricType: 'f1_score' as const, value: 0.85 },
        { metricType: 'response_time' as const, value: 150 },
        { metricType: 'user_satisfaction' as const, value: 0.9 },
      ];

      for (const metric of metrics) {
        await monitor.recordMetric({
          modelVersionId: 'model-v1',
          domain: 'legal',
          ...metric,
        });
      }
    });

    it('should generate comprehensive health report', async () => {
      // Act
      const report = await monitor.generateHealthReport(
        'model-v1',
        'legal'
      );

      // Assert
      expect(report).toEqual(
        expect.objectContaining({
          modelVersionId: 'model-v1',
          domain: 'legal',
          overallHealth: expect.any(String),
          metrics: {
            accuracy: expect.any(Number),
            precision: expect.any(Number),
            recall: expect.any(Number),
            f1Score: expect.any(Number),
            responseTime: expect.any(Number),
            userSatisfaction: expect.any(Number),
          },
          trends: {
            accuracyTrend: expect.any(String),
            performanceTrend: expect.any(String),
          },
          alerts: expect.any(Array),
          driftStatus: expect.objectContaining({
            isDriftDetected: expect.any(Boolean),
            driftScore: expect.any(Number),
            confidence: expect.any(Number),
            recommendation: expect.any(String),
          }),
          recommendations: expect.any(Array),
          lastUpdated: expect.any(Date),
        })
      );
    });

    it('should report healthy status for good metrics', async () => {
      // Act
      const report = await monitor.generateHealthReport(
        'model-v1',
        'legal'
      );

      // Assert
      expect(report.overallHealth).toBe('healthy');
    });

    it('should include recommendations', async () => {
      // Act
      const report = await monitor.generateHealthReport(
        'model-v1',
        'legal'
      );

      // Assert
      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('setThresholds', () => {
    it('should set custom thresholds for a model', async () => {
      // Arrange
      const customThresholds = {
        accuracy: 0.9,
        precision: 0.85,
        response_time: 500,
      };

      // Act
      await monitor.setThresholds('model-v1', customThresholds);

      // Test by recording a metric that should trigger an alert
      await monitor.recordMetric({
        modelVersionId: 'model-v1',
        domain: 'legal',
        metricType: 'accuracy',
        value: 0.85, // Below custom threshold of 0.9
      });

      // Assert
      const alerts = await monitor.getAlerts('model-v1');
      expect(alerts).toHaveLength(1);
      expect(alerts[0].threshold).toBe(0.9);
    });
  });

  describe('getAlerts', () => {
    beforeEach(async () => {
      // Create some alerts by recording metrics below thresholds
      await monitor.setThresholds('model-v1', { accuracy: 0.8 });
      await monitor.setThresholds('model-v2', { accuracy: 0.8 });

      await monitor.recordMetric({
        modelVersionId: 'model-v1',
        domain: 'legal',
        metricType: 'accuracy',
        value: 0.75,
      });

      await monitor.recordMetric({
        modelVersionId: 'model-v2',
        domain: 'financial',
        metricType: 'accuracy',
        value: 0.7,
      });
    });

    it('should return all alerts when no model specified', async () => {
      // Act
      const alerts = await monitor.getAlerts();

      // Assert
      expect(alerts).toHaveLength(2);
    });

    it('should filter alerts by model version', async () => {
      // Act
      const modelAlerts = await monitor.getAlerts('model-v1');

      // Assert
      expect(modelAlerts).toHaveLength(1);
      expect(modelAlerts[0].modelVersionId).toBe('model-v1');
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge an alert', async () => {
      // Arrange
      await monitor.setThresholds('model-v1', { accuracy: 0.8 });
      await monitor.recordMetric({
        modelVersionId: 'model-v1',
        domain: 'legal',
        metricType: 'accuracy',
        value: 0.75,
      });

      const alerts = await monitor.getAlerts('model-v1');
      const alertId = alerts[0].id;

      // Act
      await monitor.acknowledgeAlert(alertId);

      // Assert
      const updatedAlerts = await monitor.getAlerts('model-v1');
      expect(updatedAlerts[0].acknowledged).toBe(true);
    });
  });

  describe('detectDrift', () => {
    it('should detect no drift with stable metrics', async () => {
      // Arrange - Add stable metrics over time
      const stableAccuracy = 0.85;
      for (let i = 0; i < 10; i++) {
        await monitor.recordMetric({
          modelVersionId: 'model-v1',
          domain: 'legal',
          metricType: 'accuracy',
          value: stableAccuracy + (Math.random() - 0.5) * 0.02, // Small random variation
        });
      }

      // Act
      const driftResult = await monitor.detectDrift('model-v1');

      // Assert
      expect(driftResult.isDriftDetected).toBe(false);
      expect(driftResult.driftScore).toBeLessThan(0.05);
    });

    it('should provide drift recommendation', async () => {
      // Act
      const driftResult = await monitor.detectDrift('model-v1');

      // Assert
      expect(driftResult.recommendation).toBeDefined();
      expect(typeof driftResult.recommendation).toBe('string');
    });

    it('should handle insufficient data gracefully', async () => {
      // Act
      const driftResult = await monitor.detectDrift(
        'non-existent-model'
      );

      // Assert
      expect(driftResult.isDriftDetected).toBe(false);
      expect(driftResult.recommendation).toContain(
        'insufficient data'
      );
    });
  });
});
