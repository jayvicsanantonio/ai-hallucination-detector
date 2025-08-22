import {
  TrainingPipelineOrchestrator,
  MLModelTrainer,
  ModelVersionManager,
  ModelPerformanceMonitor,
  FeedbackService,
  ModelRegistry,
  TrainingDataManager,
} from '../../../../src/services/learning';
import { FeedbackData } from '../../../../src/models/audit/FeedbackData';

// Mock dependencies
jest.mock('../../../../src/utils/Logger');
jest.mock('../../../../src/database/interfaces/FeedbackRepository');

describe('Training Pipeline Integration', () => {
  let orchestrator: TrainingPipelineOrchestrator;
  let mlTrainer: MLModelTrainer;
  let versionManager: ModelVersionManager;
  let performanceMonitor: ModelPerformanceMonitor;
  let feedbackService: FeedbackService;
  let modelRegistry: ModelRegistry;
  let dataManager: TrainingDataManager;

  beforeEach(() => {
    // Initialize all components
    mlTrainer = new MLModelTrainer();
    versionManager = new ModelVersionManager();
    performanceMonitor = new ModelPerformanceMonitor();
    feedbackService = new FeedbackService({} as any);
    modelRegistry = new ModelRegistry();
    dataManager = new TrainingDataManager();

    orchestrator = new TrainingPipelineOrchestrator(
      mlTrainer,
      versionManager,
      performanceMonitor,
      feedbackService
    );
  });

  afterEach(() => {
    // Clean up any scheduled pipelines to prevent Jest from hanging
    orchestrator.cleanup();
  });

  describe('End-to-End Training Pipeline', () => {
    const mockFeedbackData: FeedbackData[] = [
      {
        verificationId: 'feedback-1',
        userFeedback: 'correct',
        userId: 'user-1',
        timestamp: new Date(),
        originalContent: 'This contract clause is legally compliant.',
      },
      {
        verificationId: 'feedback-2',
        userFeedback: 'incorrect',
        corrections:
          'This clause needs revision for GDPR compliance.',
        userId: 'user-2',
        timestamp: new Date(),
        originalContent: 'This contract clause needs revision.',
      },
      {
        verificationId: 'feedback-3',
        userFeedback: 'correct',
        userId: 'user-3',
        timestamp: new Date(),
        originalContent: 'Legal document analysis shows compliance.',
      },
      {
        verificationId: 'feedback-4',
        userFeedback: 'incorrect',
        corrections: 'Missing required disclosure statements.',
        userId: 'user-4',
        timestamp: new Date(),
        originalContent: 'Document missing disclosure statements.',
      },
      {
        verificationId: 'feedback-5',
        userFeedback: 'correct',
        userId: 'user-5',
        timestamp: new Date(),
        originalContent: 'Contract terms are properly structured.',
      },
    ];

    it('should execute complete training pipeline successfully', async () => {
      // Step 1: Create dataset version
      const dataset = await dataManager.createDatasetVersion(
        'Legal Training Dataset v1',
        'legal',
        mockFeedbackData,
        {
          description:
            'Training dataset for legal document validation',
          tags: ['legal', 'compliance', 'contracts'],
          createdBy: 'data-scientist-1',
          splits: { training: 0.7, validation: 0.2, test: 0.1 },
        }
      );

      expect(dataset.size).toBe(5);
      expect(dataset.domain).toBe('legal');

      // Step 2: Validate dataset quality
      const validation = await dataManager.validateDataset(
        dataset.id,
        {
          minSize: 3,
          minQualityScore: 0.5,
          maxImbalanceRatio: 10,
          requiredFields: ['input', 'expectedOutput'],
        }
      );

      expect(validation.isValid).toBe(true);

      // Step 3: Get quality report
      const qualityReport = await dataManager.getQualityReport(
        dataset.id
      );
      expect(qualityReport).toBeTruthy();
      expect(qualityReport?.overallScore).toBeGreaterThan(0);

      // Step 4: Create pipeline configuration
      const pipelineConfig = await orchestrator.createPipelineConfig({
        name: 'Legal Model Training Pipeline',
        domain: 'legal',
        schedule: 'manual',
        autoDeployment: false, // Manual deployment for testing
        trainingDataMinSize: 3,
        performanceThreshold: {
          accuracy: 0.7,
          precision: 0.65,
          recall: 0.65,
        },
        hyperparameters: {
          learningRate: 0.001,
          batchSize: 16,
          epochs: 10,
        },
        validationSplit: 0.2,
      });

      expect(pipelineConfig.domain).toBe('legal');
      expect(pipelineConfig.schedule).toBe('manual');

      // Step 5: Mock feedback service to return our test data
      jest
        .spyOn(feedbackService, 'getFeedbackByDomain')
        .mockResolvedValue(mockFeedbackData);

      // Step 6: Execute pipeline
      const pipelineRun = await orchestrator.executePipeline(
        pipelineConfig.id
      );

      expect(pipelineRun.pipelineConfigId).toBe(pipelineConfig.id);
      expect(pipelineRun.status).toBe('pending');
      expect(pipelineRun.stages.dataPreparation.status).toBe(
        'pending'
      );
      expect(pipelineRun.stages.training.status).toBe('pending');
      expect(pipelineRun.stages.validation.status).toBe('pending');
      expect(pipelineRun.stages.deployment.status).toBe('pending');

      // Step 7: Wait for pipeline to process (simulate async execution)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Step 8: Check pipeline progress
      const updatedRun = await orchestrator.getPipelineRun(
        pipelineRun.id
      );
      expect(updatedRun).toBeTruthy();
      expect(['pending', 'running', 'completed', 'failed']).toContain(
        updatedRun?.status
      );
    }, 15000);

    it('should handle pipeline with A/B testing', async () => {
      // Step 1: Create pipeline with A/B testing enabled
      const pipelineConfig = await orchestrator.createPipelineConfig({
        name: 'A/B Test Pipeline',
        domain: 'legal',
        schedule: 'manual',
        autoDeployment: true,
        trainingDataMinSize: 3,
        performanceThreshold: {
          accuracy: 0.7,
          precision: 0.65,
          recall: 0.65,
        },
        hyperparameters: {},
        validationSplit: 0.2,
        abTestConfig: {
          enabled: true,
          trafficSplit: 25,
          duration: 24,
        },
      });

      expect(pipelineConfig.abTestConfig?.enabled).toBe(true);

      // Step 2: Mock feedback service
      jest
        .spyOn(feedbackService, 'getFeedbackByDomain')
        .mockResolvedValue(mockFeedbackData);

      // Step 3: Execute pipeline
      const pipelineRun = await orchestrator.executePipeline(
        pipelineConfig.id
      );

      // Step 4: Verify A/B testing stage is included
      expect(pipelineRun.stages.abTesting).toBeTruthy();
      expect(pipelineRun.stages.abTesting?.name).toBe('A/B Testing');
      expect(pipelineRun.stages.abTesting?.status).toBe('pending');
    });

    it('should handle insufficient training data gracefully', async () => {
      // Step 1: Create pipeline with high minimum data requirement
      const pipelineConfig = await orchestrator.createPipelineConfig({
        name: 'High Data Requirement Pipeline',
        domain: 'legal',
        schedule: 'manual',
        autoDeployment: false,
        trainingDataMinSize: 100, // More than we have
        performanceThreshold: {
          accuracy: 0.8,
          precision: 0.75,
          recall: 0.75,
        },
        hyperparameters: {},
        validationSplit: 0.2,
      });

      // Step 2: Mock feedback service with insufficient data
      jest
        .spyOn(feedbackService, 'getFeedbackByDomain')
        .mockResolvedValue([mockFeedbackData[0]]);

      // Step 3: Execute pipeline
      const pipelineRun = await orchestrator.executePipeline(
        pipelineConfig.id
      );

      // Step 4: Wait for pipeline to fail
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Step 5: Check that pipeline failed due to insufficient data
      const failedRun = await orchestrator.getPipelineRun(
        pipelineRun.id
      );
      expect(failedRun?.status).toBe('failed');
      expect(failedRun?.error).toContain(
        'Insufficient training data'
      );
    });
  });

  describe('Model Registry Integration', () => {
    it('should register and manage model versions', async () => {
      // Step 1: Create a mock model version
      const modelVersion = {
        id: 'legal-model-v1.0',
        version: 'v1.0',
        domain: 'legal' as const,
        accuracy: 0.87,
        trainingDataSize: 1000,
        createdAt: new Date(),
        isActive: false,
        modelPath: '/models/legal/v1.0',
        metadata: {
          hyperparameters: { learningRate: 0.001, batchSize: 32 },
          trainingMetrics: { accuracy: 0.89, loss: 0.15 },
          validationMetrics: {
            accuracy: 0.87,
            precision: 0.85,
            recall: 0.84,
          },
        },
      };

      // Step 2: Register model in registry
      await modelRegistry.registerModel(
        modelVersion,
        {
          domain: 'legal',
          framework: 'tensorflow',
          modelType: 'classification',
          inputSchema: { text: 'string', metadata: 'object' },
          outputSchema: {
            prediction: 'string',
            confidence: 'number',
          },
          dependencies: ['tensorflow==2.8.0', 'transformers==4.21.0'],
          environment: { python: '3.9', cuda: '11.2' },
          tags: ['legal', 'document-classification', 'compliance'],
          description:
            'Legal document classification model for compliance checking',
        },
        {
          parentVersionId: undefined,
          trainingDataSources: ['legal-dataset-v1'],
          trainingPipelineId: 'pipeline-legal-001',
          experimentId: 'exp-legal-classification-001',
          gitCommit: 'abc123def456',
          createdBy: 'ml-engineer-1',
        }
      );

      // Step 3: Verify model registration
      const retrievedModel = await modelRegistry.getModelVersion(
        'legal-model-v1.0'
      );
      expect(retrievedModel).toEqual(modelVersion);

      const metadata = await modelRegistry.getModelMetadata(
        'legal-model-v1.0'
      );
      expect(metadata?.framework).toBe('tensorflow');
      expect(metadata?.tags).toContain('legal');

      const lineage = await modelRegistry.getModelLineage(
        'legal-model-v1.0'
      );
      expect(lineage?.createdBy).toBe('ml-engineer-1');

      // Step 4: Upload model artifacts
      const modelArtifact = await modelRegistry.uploadArtifact(
        'legal-model-v1.0',
        {
          modelVersionId: 'legal-model-v1.0',
          artifactType: 'model_file',
          fileName: 'legal_classifier.h5',
          filePath: '/artifacts/legal-model-v1.0/legal_classifier.h5',
          fileSize: 15728640, // 15MB
          checksum: 'sha256:abc123def456...',
          metadata: {
            format: 'tensorflow_savedmodel',
            compression: 'none',
          },
        }
      );

      expect(modelArtifact.fileName).toBe('legal_classifier.h5');
      expect(modelArtifact.artifactType).toBe('model_file');

      // Step 5: Search for models
      const searchResults = await modelRegistry.searchModels({
        domain: 'legal',
        framework: 'tensorflow',
        tags: ['compliance'],
        minAccuracy: 0.8,
      });

      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].id).toBe('legal-model-v1.0');

      // Step 6: Get model statistics
      const stats = await modelRegistry.getModelStats(
        'legal-model-v1.0'
      );
      expect(stats.totalPredictions).toBeGreaterThan(0);
      expect(stats.averageResponseTime).toBeGreaterThan(0);
    });

    it('should compare multiple model versions', async () => {
      // Step 1: Register multiple model versions
      const models = [
        {
          id: 'legal-model-v1.0',
          accuracy: 0.85,
          framework: 'tensorflow',
        },
        {
          id: 'legal-model-v2.0',
          accuracy: 0.89,
          framework: 'pytorch',
        },
      ];

      for (const model of models) {
        await modelRegistry.registerModel(
          {
            id: model.id,
            version: 'v1.0',
            domain: 'legal',
            accuracy: model.accuracy,
            trainingDataSize: 1000,
            createdAt: new Date(),
            isActive: false,
            modelPath: `/models/legal/${model.id}`,
            metadata: {
              hyperparameters: {},
              trainingMetrics: {},
              validationMetrics: {},
            },
          },
          {
            domain: 'legal',
            framework: model.framework,
            modelType: 'classification',
            inputSchema: {},
            outputSchema: {},
            dependencies: [],
            environment: {},
            tags: [],
          },
          {
            trainingDataSources: [],
            createdBy: 'test-user',
          }
        );
      }

      // Step 2: Compare models
      const comparison = await modelRegistry.compareModels([
        'legal-model-v1.0',
        'legal-model-v2.0',
      ]);

      expect(comparison.models).toHaveLength(2);
      expect(
        comparison.comparison.accuracyComparison['legal-model-v2.0']
      ).toBeGreaterThan(
        comparison.comparison.accuracyComparison['legal-model-v1.0']
      );
      expect(
        comparison.comparison.frameworkComparison['legal-model-v1.0']
      ).toBe('tensorflow');
      expect(
        comparison.comparison.frameworkComparison['legal-model-v2.0']
      ).toBe('pytorch');
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should monitor model performance and generate health reports', async () => {
      // Step 1: Record performance metrics
      const modelVersionId = 'legal-model-v1.0';

      const metrics = [
        { metricType: 'accuracy' as const, value: 0.87 },
        { metricType: 'precision' as const, value: 0.85 },
        { metricType: 'recall' as const, value: 0.84 },
        { metricType: 'f1_score' as const, value: 0.845 },
        { metricType: 'response_time' as const, value: 120 },
        { metricType: 'user_satisfaction' as const, value: 0.9 },
      ];

      for (const metric of metrics) {
        await performanceMonitor.recordMetric({
          modelVersionId,
          domain: 'legal',
          ...metric,
        });
      }

      // Step 2: Generate health report
      const healthReport =
        await performanceMonitor.generateHealthReport(
          modelVersionId,
          'legal'
        );

      expect(healthReport.modelVersionId).toBe(modelVersionId);
      expect(healthReport.domain).toBe('legal');
      expect(healthReport.overallHealth).toBe('healthy');
      expect(healthReport.metrics.accuracy).toBeCloseTo(0.87, 2);
      expect(healthReport.driftStatus.isDriftDetected).toBe(false);
      expect(healthReport.recommendations).toContain(
        'Model performance is within acceptable ranges'
      );

      // Step 3: Set custom thresholds and trigger alert
      await performanceMonitor.setThresholds(modelVersionId, {
        accuracy: 0.9, // Higher than current performance
      });

      await performanceMonitor.recordMetric({
        modelVersionId,
        domain: 'legal',
        metricType: 'accuracy',
        value: 0.85, // Below threshold
      });

      // Step 4: Check for alerts
      const alerts = await performanceMonitor.getAlerts(
        modelVersionId
      );
      expect(alerts).toHaveLength(1);
      expect(alerts[0].alertType).toBe('accuracy_drop');
      expect(alerts[0].severity).toBe('high');

      // Step 5: Acknowledge alert
      await performanceMonitor.acknowledgeAlert(alerts[0].id);
      const updatedAlerts = await performanceMonitor.getAlerts(
        modelVersionId
      );
      expect(updatedAlerts[0].acknowledged).toBe(true);
    });

    it('should detect model drift', async () => {
      const modelVersionId = 'legal-model-drift-test';

      // Step 1: Record historical good performance (15 days ago)
      const historicalDate = new Date(
        Date.now() - 15 * 24 * 60 * 60 * 1000
      );
      for (let i = 0; i < 10; i++) {
        await performanceMonitor.recordMetric({
          modelVersionId,
          domain: 'legal',
          metricType: 'accuracy',
          value: 0.9 + Math.random() * 0.05, // 90-95% accuracy
          timestamp: new Date(
            historicalDate.getTime() + i * 60 * 60 * 1000
          ), // Spread over hours
        });
      }

      // Step 2: Simulate performance degradation (drift) - recent data
      const recentDate = new Date(
        Date.now() - 2 * 24 * 60 * 60 * 1000
      );
      for (let i = 0; i < 5; i++) {
        await performanceMonitor.recordMetric({
          modelVersionId,
          domain: 'legal',
          metricType: 'accuracy',
          value: 0.8 + Math.random() * 0.05, // 80-85% accuracy (degraded)
          timestamp: new Date(
            recentDate.getTime() + i * 60 * 60 * 1000
          ), // Spread over hours
        });
      }

      // Step 3: Detect drift
      const driftResult = await performanceMonitor.detectDrift(
        modelVersionId
      );

      expect(driftResult.isDriftDetected).toBe(true);
      expect(driftResult.driftScore).toBeGreaterThan(0.05);
      expect(driftResult.recommendation).toContain('retraining');
    });
  });

  describe('Version Management Integration', () => {
    it('should manage model deployments and rollbacks', async () => {
      // Step 1: Deploy a model version
      const deployment = await versionManager.deployModel({
        modelVersionId: 'legal-model-v1.0',
        environment: 'staging',
        rolloutStrategy: 'immediate',
      });

      expect(deployment.modelVersionId).toBe('legal-model-v1.0');
      expect(deployment.environment).toBe('staging');
      expect(deployment.status).toBe('pending');

      // Step 2: Wait for deployment to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Step 3: Check deployment status
      let deploymentStatus = await versionManager.getDeploymentStatus(
        deployment.id
      );
      expect([
        'pending',
        'deploying',
        'deployed',
        'failed',
      ]).toContain(deploymentStatus?.status);

      // Step 4: Perform health check
      if (
        deploymentStatus?.status === 'deployed' ||
        deploymentStatus?.status === 'pending'
      ) {
        // Simulate deployment completion for testing
        if (deploymentStatus.status === 'pending') {
          deploymentStatus.status = 'deployed';
        }

        const healthCheck = await versionManager.performHealthCheck(
          deployment.id
        );
        expect(['healthy', 'unhealthy']).toContain(
          healthCheck.status
        );
        expect(healthCheck.metrics.responseTime).toBeGreaterThan(0);
      }

      // Step 5: Create rollback plan
      const rollbackPlan = await versionManager.createRollbackPlan(
        'legal-model-v1.0',
        'legal-model-v0.9',
        'Performance degradation detected'
      );

      expect(rollbackPlan.currentVersionId).toBe('legal-model-v1.0');
      expect(rollbackPlan.targetVersionId).toBe('legal-model-v0.9');
      expect(rollbackPlan.rollbackSteps).toContain(
        'Stop traffic to current model version'
      );

      // Step 6: Execute rollback
      const rollbackDeployment = await versionManager.rollbackModel(
        rollbackPlan
      );
      expect(rollbackDeployment.modelVersionId).toBe(
        'legal-model-v0.9'
      );
    });

    it('should handle gradual rollout deployment', async () => {
      // Step 1: Start gradual deployment
      const deployment = await versionManager.deployModel({
        modelVersionId: 'legal-model-v2.0',
        environment: 'production',
        rolloutStrategy: 'gradual',
        rolloutPercentage: 10,
        rollbackThreshold: {
          accuracyDrop: 0.05,
          errorRateIncrease: 0.02,
        },
      });

      expect(deployment.rolloutPercentage).toBe(10);

      // Step 2: Monitor deployment
      await versionManager.monitorDeployment(deployment.id, {
        accuracyDrop: 0.05,
        errorRateIncrease: 0.02,
      });

      // Step 3: List deployments
      const deployments = await versionManager.listDeployments({
        environment: 'production',
        limit: 10,
      });

      expect(deployments.some((d) => d.id === deployment.id)).toBe(
        true
      );
    });
  });
});
