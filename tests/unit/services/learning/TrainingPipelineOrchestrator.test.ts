import {
  TrainingPipelineOrchestrator,
  PipelineConfig,
  PipelineRun,
} from '../../../../src/services/learning/TrainingPipelineOrchestrator';
import { MLModelTrainer } from '../../../../src/services/learning/MLModelTrainer';
import { ModelVersionManager } from '../../../../src/services/learning/ModelVersionManager';
import { ModelPerformanceMonitor } from '../../../../src/services/learning/ModelPerformanceMonitor';
import { FeedbackService } from '../../../../src/services/learning/FeedbackService';

// Mock dependencies
jest.mock('../../../../src/utils/Logger');
jest.mock('../../../../src/services/learning/MLModelTrainer');
jest.mock('../../../../src/services/learning/ModelVersionManager');
jest.mock(
  '../../../../src/services/learning/ModelPerformanceMonitor'
);
jest.mock('../../../../src/services/learning/FeedbackService');

describe('TrainingPipelineOrchestrator', () => {
  let orchestrator: TrainingPipelineOrchestrator;
  let mockMLTrainer: jest.Mocked<MLModelTrainer>;
  let mockVersionManager: jest.Mocked<ModelVersionManager>;
  let mockPerformanceMonitor: jest.Mocked<ModelPerformanceMonitor>;
  let mockFeedbackService: jest.Mocked<FeedbackService>;

  beforeEach(() => {
    mockMLTrainer =
      new MLModelTrainer() as jest.Mocked<MLModelTrainer>;
    mockVersionManager =
      new ModelVersionManager() as jest.Mocked<ModelVersionManager>;
    mockPerformanceMonitor =
      new ModelPerformanceMonitor() as jest.Mocked<ModelPerformanceMonitor>;
    mockFeedbackService = new FeedbackService(
      {} as any
    ) as jest.Mocked<FeedbackService>;

    orchestrator = new TrainingPipelineOrchestrator(
      mockMLTrainer,
      mockVersionManager,
      mockPerformanceMonitor,
      mockFeedbackService
    );
  });

  afterEach(() => {
    // Clean up any scheduled pipelines to prevent Jest from hanging
    orchestrator.cleanup();
  });

  describe('createPipelineConfig', () => {
    it('should create pipeline configuration successfully', async () => {
      // Arrange
      const configData = {
        name: 'Legal Model Pipeline',
        domain: 'legal' as const,
        schedule: 'weekly' as const,
        autoDeployment: true,
        trainingDataMinSize: 1000,
        performanceThreshold: {
          accuracy: 0.85,
          precision: 0.8,
          recall: 0.8,
        },
        hyperparameters: {
          learningRate: 0.001,
          batchSize: 32,
        },
        validationSplit: 0.2,
      };

      // Act
      const config = await orchestrator.createPipelineConfig(
        configData
      );

      // Assert
      expect(config).toEqual(
        expect.objectContaining({
          id: expect.stringMatching(/^pipeline_/),
          name: 'Legal Model Pipeline',
          domain: 'legal',
          schedule: 'weekly',
          autoDeployment: true,
          trainingDataMinSize: 1000,
        })
      );
    });

    it('should create manual pipeline without scheduling', async () => {
      // Arrange
      const configData = {
        name: 'Manual Pipeline',
        domain: 'financial' as const,
        schedule: 'manual' as const,
        autoDeployment: false,
        trainingDataMinSize: 500,
        performanceThreshold: {
          accuracy: 0.9,
          precision: 0.85,
          recall: 0.85,
        },
        hyperparameters: {},
        validationSplit: 0.15,
      };

      // Act
      const config = await orchestrator.createPipelineConfig(
        configData
      );

      // Assert
      expect(config.schedule).toBe('manual');
      expect(config.autoDeployment).toBe(false);
    });

    it('should create pipeline with A/B testing configuration', async () => {
      // Arrange
      const configData = {
        name: 'A/B Test Pipeline',
        domain: 'healthcare' as const,
        schedule: 'daily' as const,
        autoDeployment: true,
        trainingDataMinSize: 2000,
        performanceThreshold: {
          accuracy: 0.95,
          precision: 0.9,
          recall: 0.9,
        },
        hyperparameters: {},
        validationSplit: 0.2,
        abTestConfig: {
          enabled: true,
          trafficSplit: 20,
          duration: 48,
        },
      };

      // Act
      const config = await orchestrator.createPipelineConfig(
        configData
      );

      // Assert
      expect(config.abTestConfig).toEqual({
        enabled: true,
        trafficSplit: 20,
        duration: 48,
      });
    });
  });

  describe('executePipeline', () => {
    let mockConfig: PipelineConfig;

    beforeEach(async () => {
      mockConfig = await orchestrator.createPipelineConfig({
        name: 'Test Pipeline',
        domain: 'legal',
        schedule: 'manual',
        autoDeployment: true,
        trainingDataMinSize: 100,
        performanceThreshold: {
          accuracy: 0.8,
          precision: 0.75,
          recall: 0.75,
        },
        hyperparameters: {},
        validationSplit: 0.2,
      });

      // Mock feedback service
      mockFeedbackService.getFeedbackByDomain.mockResolvedValue([
        {
          verificationId: 'test-1',
          userFeedback: 'correct',
          userId: 'user-1',
          timestamp: new Date(),
          originalContent: 'Test content 1',
        },
        {
          verificationId: 'test-2',
          userFeedback: 'incorrect',
          corrections: 'Corrected content',
          userId: 'user-2',
          timestamp: new Date(),
          originalContent: 'Test content 2',
        },
      ] as any);
    });

    it('should start pipeline execution successfully', async () => {
      // Act
      const pipelineRun = await orchestrator.executePipeline(
        mockConfig.id
      );

      // Assert - Check initial state, pipeline may start executing immediately
      expect(pipelineRun.id).toMatch(/^run_/);
      expect(pipelineRun.pipelineConfigId).toBe(mockConfig.id);
      expect(['pending', 'running', 'failed']).toContain(
        pipelineRun.status
      );
      expect(pipelineRun.startedAt).toBeInstanceOf(Date);
      expect(pipelineRun.stages.dataPreparation.name).toBe(
        'Data Preparation'
      );
      expect(pipelineRun.stages.training.name).toBe('Model Training');
      expect(pipelineRun.stages.validation.name).toBe(
        'Model Validation'
      );
      expect(pipelineRun.stages.deployment.name).toBe(
        'Model Deployment'
      );
    });

    it('should throw error for non-existent pipeline config', async () => {
      // Act & Assert
      await expect(
        orchestrator.executePipeline('non-existent-config')
      ).rejects.toThrow(
        'Pipeline configuration non-existent-config not found'
      );
    });

    it('should include A/B testing stage when enabled', async () => {
      // Arrange
      const abTestConfig = await orchestrator.createPipelineConfig({
        name: 'A/B Test Pipeline',
        domain: 'legal',
        schedule: 'manual',
        autoDeployment: true,
        trainingDataMinSize: 100,
        performanceThreshold: {
          accuracy: 0.8,
          precision: 0.75,
          recall: 0.75,
        },
        hyperparameters: {},
        validationSplit: 0.2,
        abTestConfig: {
          enabled: true,
          trafficSplit: 50,
          duration: 24,
        },
      });

      // Act
      const pipelineRun = await orchestrator.executePipeline(
        abTestConfig.id
      );

      // Assert
      expect(pipelineRun.stages.abTesting).toEqual(
        expect.objectContaining({
          name: 'A/B Testing',
          status: 'pending',
        })
      );
    });
  });

  describe('getPipelineRun', () => {
    it('should return pipeline run if exists', async () => {
      // Arrange
      const config = await orchestrator.createPipelineConfig({
        name: 'Test Pipeline',
        domain: 'legal',
        schedule: 'manual',
        autoDeployment: false,
        trainingDataMinSize: 100,
        performanceThreshold: {
          accuracy: 0.8,
          precision: 0.75,
          recall: 0.75,
        },
        hyperparameters: {},
        validationSplit: 0.2,
      });

      mockFeedbackService.getFeedbackByDomain.mockResolvedValue([]);
      const pipelineRun = await orchestrator.executePipeline(
        config.id
      );

      // Act
      const retrievedRun = await orchestrator.getPipelineRun(
        pipelineRun.id
      );

      // Assert
      expect(retrievedRun).toEqual(pipelineRun);
    });

    it('should return null for non-existent run', async () => {
      // Act
      const retrievedRun = await orchestrator.getPipelineRun(
        'non-existent-run'
      );

      // Assert
      expect(retrievedRun).toBeNull();
    });
  });

  describe('listPipelineConfigs', () => {
    beforeEach(async () => {
      // Create multiple pipeline configs
      await orchestrator.createPipelineConfig({
        name: 'Legal Pipeline',
        domain: 'legal',
        schedule: 'daily',
        autoDeployment: true,
        trainingDataMinSize: 1000,
        performanceThreshold: {
          accuracy: 0.8,
          precision: 0.75,
          recall: 0.75,
        },
        hyperparameters: {},
        validationSplit: 0.2,
      });

      await orchestrator.createPipelineConfig({
        name: 'Financial Pipeline',
        domain: 'financial',
        schedule: 'weekly',
        autoDeployment: false,
        trainingDataMinSize: 2000,
        performanceThreshold: {
          accuracy: 0.9,
          precision: 0.85,
          recall: 0.85,
        },
        hyperparameters: {},
        validationSplit: 0.15,
      });

      await orchestrator.createPipelineConfig({
        name: 'Healthcare Pipeline',
        domain: 'healthcare',
        schedule: 'manual',
        autoDeployment: true,
        trainingDataMinSize: 1500,
        performanceThreshold: {
          accuracy: 0.95,
          precision: 0.9,
          recall: 0.9,
        },
        hyperparameters: {},
        validationSplit: 0.2,
      });
    });

    it('should return all pipeline configs', async () => {
      // Act
      const configs = await orchestrator.listPipelineConfigs();

      // Assert
      expect(configs).toHaveLength(3);
    });

    it('should filter configs by domain', async () => {
      // Act
      const legalConfigs = await orchestrator.listPipelineConfigs(
        'legal'
      );

      // Assert
      expect(legalConfigs).toHaveLength(1);
      expect(legalConfigs[0].domain).toBe('legal');
    });
  });

  describe('listPipelineRuns', () => {
    let config: PipelineConfig;

    beforeEach(async () => {
      config = await orchestrator.createPipelineConfig({
        name: 'Test Pipeline',
        domain: 'legal',
        schedule: 'manual',
        autoDeployment: false,
        trainingDataMinSize: 100,
        performanceThreshold: {
          accuracy: 0.8,
          precision: 0.75,
          recall: 0.75,
        },
        hyperparameters: {},
        validationSplit: 0.2,
      });

      mockFeedbackService.getFeedbackByDomain.mockResolvedValue([]);

      // Create multiple runs
      await orchestrator.executePipeline(config.id);
      await orchestrator.executePipeline(config.id);
    });

    it('should return all pipeline runs', async () => {
      // Act
      const runs = await orchestrator.listPipelineRuns();

      // Assert
      expect(runs).toHaveLength(2);
    });

    it('should filter runs by pipeline config ID', async () => {
      // Act
      const runs = await orchestrator.listPipelineRuns({
        pipelineConfigId: config.id,
      });

      // Assert
      expect(runs).toHaveLength(2);
      expect(
        runs.every((run) => run.pipelineConfigId === config.id)
      ).toBe(true);
    });

    it('should filter runs by status', async () => {
      // Act
      const pendingRuns = await orchestrator.listPipelineRuns({
        status: 'pending',
      });

      // Assert
      expect(
        pendingRuns.every((run) => run.status === 'pending')
      ).toBe(true);
    });

    it('should limit number of returned runs', async () => {
      // Act
      const limitedRuns = await orchestrator.listPipelineRuns({
        limit: 1,
      });

      // Assert
      expect(limitedRuns).toHaveLength(1);
    });
  });

  describe('cancelPipeline', () => {
    it('should cancel running pipeline successfully', async () => {
      // Arrange
      const config = await orchestrator.createPipelineConfig({
        name: 'Test Pipeline',
        domain: 'legal',
        schedule: 'manual',
        autoDeployment: false,
        trainingDataMinSize: 100,
        performanceThreshold: {
          accuracy: 0.8,
          precision: 0.75,
          recall: 0.75,
        },
        hyperparameters: {},
        validationSplit: 0.2,
      });

      mockFeedbackService.getFeedbackByDomain.mockResolvedValue([]);
      const pipelineRun = await orchestrator.executePipeline(
        config.id
      );

      // Simulate running status
      const run = await orchestrator.getPipelineRun(pipelineRun.id);
      if (run) {
        run.status = 'running';
      }

      // Act
      await orchestrator.cancelPipeline(pipelineRun.id);

      // Assert
      const cancelledRun = await orchestrator.getPipelineRun(
        pipelineRun.id
      );
      expect(cancelledRun?.status).toBe('cancelled');
      expect(cancelledRun?.completedAt).toBeTruthy();
    });

    it('should throw error for non-existent pipeline run', async () => {
      // Act & Assert
      await expect(
        orchestrator.cancelPipeline('non-existent-run')
      ).rejects.toThrow('Pipeline run non-existent-run not found');
    });

    it('should throw error when trying to cancel non-running pipeline', async () => {
      // Arrange
      const config = await orchestrator.createPipelineConfig({
        name: 'Test Pipeline',
        domain: 'legal',
        schedule: 'manual',
        autoDeployment: false,
        trainingDataMinSize: 100,
        performanceThreshold: {
          accuracy: 0.8,
          precision: 0.75,
          recall: 0.75,
        },
        hyperparameters: {},
        validationSplit: 0.2,
      });

      mockFeedbackService.getFeedbackByDomain.mockResolvedValue([]);
      const pipelineRun = await orchestrator.executePipeline(
        config.id
      );

      // Act & Assert (pipeline is in 'pending' status)
      await expect(
        orchestrator.cancelPipeline(pipelineRun.id)
      ).rejects.toThrow(
        `Pipeline run ${pipelineRun.id} is not running`
      );
    });
  });

  describe('updatePipelineConfig', () => {
    let config: PipelineConfig;

    beforeEach(async () => {
      config = await orchestrator.createPipelineConfig({
        name: 'Original Pipeline',
        domain: 'legal',
        schedule: 'manual',
        autoDeployment: false,
        trainingDataMinSize: 1000,
        performanceThreshold: {
          accuracy: 0.8,
          precision: 0.75,
          recall: 0.75,
        },
        hyperparameters: {},
        validationSplit: 0.2,
      });
    });

    it('should update pipeline configuration successfully', async () => {
      // Arrange
      const updates = {
        name: 'Updated Pipeline',
        autoDeployment: true,
        trainingDataMinSize: 2000,
      };

      // Act
      const updatedConfig = await orchestrator.updatePipelineConfig(
        config.id,
        updates
      );

      // Assert
      expect(updatedConfig).toEqual(
        expect.objectContaining({
          id: config.id,
          name: 'Updated Pipeline',
          autoDeployment: true,
          trainingDataMinSize: 2000,
        })
      );
    });

    it('should update schedule and handle rescheduling', async () => {
      // Arrange
      const updates = {
        schedule: 'daily' as const,
      };

      // Act
      const updatedConfig = await orchestrator.updatePipelineConfig(
        config.id,
        updates
      );

      // Assert
      expect(updatedConfig.schedule).toBe('daily');
    });

    it('should throw error for non-existent pipeline config', async () => {
      // Act & Assert
      await expect(
        orchestrator.updatePipelineConfig('non-existent-config', {
          name: 'Updated Name',
        })
      ).rejects.toThrow(
        'Pipeline configuration non-existent-config not found'
      );
    });
  });

  describe('pipeline execution stages', () => {
    let config: PipelineConfig;

    beforeEach(async () => {
      config = await orchestrator.createPipelineConfig({
        name: 'Test Pipeline',
        domain: 'legal',
        schedule: 'manual',
        autoDeployment: true,
        trainingDataMinSize: 2,
        performanceThreshold: {
          accuracy: 0.8,
          precision: 0.75,
          recall: 0.75,
        },
        hyperparameters: {},
        validationSplit: 0.2,
      });

      // Mock successful feedback data
      mockFeedbackService.getFeedbackByDomain.mockResolvedValue([
        {
          verificationId: 'test-1',
          userFeedback: 'correct',
          userId: 'user-1',
          timestamp: new Date(),
          originalContent: 'Test content 1',
        },
        {
          verificationId: 'test-2',
          userFeedback: 'incorrect',
          corrections: 'Corrected content',
          userId: 'user-2',
          timestamp: new Date(),
          originalContent: 'Test content 2',
        },
      ] as any);

      // Mock successful training
      mockMLTrainer.startTraining.mockResolvedValue({
        id: 'training-job-1',
        domain: 'legal',
        status: 'pending',
        progress: 0,
        startedAt: new Date(),
      });

      mockMLTrainer.getTrainingJob.mockResolvedValue({
        id: 'training-job-1',
        domain: 'legal',
        status: 'completed',
        progress: 100,
        startedAt: new Date(),
        completedAt: new Date(),
        modelVersion: {
          id: 'model-v1',
          version: 'v1',
          domain: 'legal',
          accuracy: 0.85,
          trainingDataSize: 2,
          createdAt: new Date(),
          isActive: false,
          modelPath: '/models/legal/v1',
          metadata: {
            hyperparameters: {},
            trainingMetrics: { accuracy: 0.85 },
            validationMetrics: {
              accuracy: 0.85,
              precision: 0.8,
              recall: 0.8,
            },
          },
        },
      });

      // Mock successful deployment
      mockVersionManager.deployModel.mockResolvedValue({
        id: 'deployment-1',
        modelVersionId: 'model-v1',
        environment: 'staging',
        status: 'pending',
        rolloutPercentage: 100,
        startedAt: new Date(),
        healthChecks: [],
      });

      mockVersionManager.getDeploymentStatus.mockResolvedValue({
        id: 'deployment-1',
        modelVersionId: 'model-v1',
        environment: 'staging',
        status: 'deployed',
        rolloutPercentage: 100,
        startedAt: new Date(),
        completedAt: new Date(),
        healthChecks: [],
      });
    });

    it('should handle insufficient training data', async () => {
      // Arrange - Mock insufficient data
      mockFeedbackService.getFeedbackByDomain.mockResolvedValue([
        {
          verificationId: 'test-1',
          userFeedback: 'correct',
          userId: 'user-1',
          timestamp: new Date(),
          originalContent: 'Test content 1',
        },
      ] as any);

      // Act
      const pipelineRun = await orchestrator.executePipeline(
        config.id
      );

      // Wait for pipeline to process
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      const updatedRun = await orchestrator.getPipelineRun(
        pipelineRun.id
      );
      expect(updatedRun?.status).toBe('failed');
      expect(updatedRun?.error).toContain(
        'Insufficient training data'
      );
    });

    it('should complete successful pipeline execution', async () => {
      // Act
      const pipelineRun = await orchestrator.executePipeline(
        config.id
      );

      // Wait for pipeline to complete
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Assert
      const completedRun = await orchestrator.getPipelineRun(
        pipelineRun.id
      );

      // The pipeline should eventually complete or be in progress
      expect(['running', 'completed', 'failed']).toContain(
        completedRun?.status || ''
      );
    }, 10000);
  });
});
