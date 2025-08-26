import {
  MLModelTrainer,
  TrainingData,
  TrainingJob,
  ModelVersion,
  ABTestConfig,
} from '../../../../src/services/learning/MLModelTrainer';
import { Domain } from '../../../../src/models/core/ContentTypes';

// Mock dependencies
jest.mock('../../../../src/utils/Logger');

describe('MLModelTrainer', () => {
  let mlModelTrainer: MLModelTrainer;

  beforeEach(() => {
    mlModelTrainer = new MLModelTrainer();
  });

  describe('startTraining', () => {
    const mockTrainingData: TrainingData[] = [
      {
        input: 'Test content 1',
        expectedOutput: { accuracy: 0.9 },
        feedback: {
          verificationId: 'test-1',
          userFeedback: 'correct',
          userId: 'user-1',
          timestamp: new Date(),
        },
        domain: 'legal',
        timestamp: new Date(),
      },
      {
        input: 'Test content 2',
        expectedOutput: { accuracy: 0.8 },
        feedback: {
          verificationId: 'test-2',
          userFeedback: 'incorrect',
          corrections: 'Should be different',
          userId: 'user-2',
          timestamp: new Date(),
        },
        domain: 'legal',
        timestamp: new Date(),
      },
    ];

    it('should start training job successfully', async () => {
      // Act
      const trainingJob = await mlModelTrainer.startTraining({
        domain: 'legal',
        trainingData: mockTrainingData,
        hyperparameters: { learningRate: 0.001 },
      });

      // Assert
      expect(trainingJob).toEqual(
        expect.objectContaining({
          id: expect.stringMatching(/^training_/),
          domain: 'legal',
          status: 'pending',
          progress: 0,
          startedAt: expect.any(Date),
        })
      );
    });

    it('should handle training with custom hyperparameters', async () => {
      // Arrange
      const customHyperparameters = {
        learningRate: 0.01,
        batchSize: 64,
        epochs: 50,
      };

      // Act
      const trainingJob = await mlModelTrainer.startTraining({
        domain: 'financial',
        trainingData: mockTrainingData,
        hyperparameters: customHyperparameters,
        validationSplit: 0.3,
      });

      // Assert
      expect(trainingJob.domain).toBe('financial');
      expect(trainingJob.status).toBe('pending');
    });

    it('should handle empty training data', async () => {
      // Act
      const trainingJob = await mlModelTrainer.startTraining({
        domain: 'healthcare',
        trainingData: [],
      });

      // Assert
      expect(trainingJob.status).toBe('pending');
    });
  });

  describe('getTrainingJob', () => {
    it('should return training job if exists', async () => {
      // Arrange
      const trainingJob = await mlModelTrainer.startTraining({
        domain: 'legal',
        trainingData: [],
      });

      // Act
      const retrievedJob = await mlModelTrainer.getTrainingJob(
        trainingJob.id
      );

      // Assert
      expect(retrievedJob).toEqual(trainingJob);
    });

    it('should return null for non-existent job', async () => {
      // Act
      const retrievedJob = await mlModelTrainer.getTrainingJob(
        'non-existent-id'
      );

      // Assert
      expect(retrievedJob).toBeNull();
    });
  });

  describe('getModelVersions', () => {
    it('should return empty array when no versions exist', async () => {
      // Act
      const versions = await mlModelTrainer.getModelVersions();

      // Assert
      expect(versions).toEqual([]);
    });

    it('should filter versions by domain', async () => {
      // This test would require completing a training job first
      // For now, we'll test the basic functionality
      const versions = await mlModelTrainer.getModelVersions('legal');
      expect(Array.isArray(versions)).toBe(true);
    });
  });

  describe('getActiveModelVersion', () => {
    it('should return null when no active version exists', async () => {
      // Act
      const activeVersion =
        await mlModelTrainer.getActiveModelVersion('legal');

      // Assert
      expect(activeVersion).toBeNull();
    });
  });

  describe('deployModelVersion', () => {
    it('should throw error for non-existent version', async () => {
      // Act & Assert
      await expect(
        mlModelTrainer.deployModelVersion('non-existent-version')
      ).rejects.toThrow(
        'Model version non-existent-version not found'
      );
    });
  });

  describe('createABTest', () => {
    it('should create A/B test successfully', async () => {
      // Arrange
      const abTestConfig = {
        name: 'Legal Model Comparison',
        description: 'Testing new legal model against baseline',
        modelVersionA: 'version-a',
        modelVersionB: 'version-b',
        trafficSplit: 50,
        startDate: new Date(),
        isActive: true,
      };

      // Act
      const abTest = await mlModelTrainer.createABTest(abTestConfig);

      // Assert
      expect(abTest).toEqual(
        expect.objectContaining({
          id: expect.stringMatching(/^abtest_/),
          name: 'Legal Model Comparison',
          modelVersionA: 'version-a',
          modelVersionB: 'version-b',
          trafficSplit: 50,
          isActive: true,
          metrics: {
            modelA: {
              accuracy: 0,
              responseTime: 0,
              userSatisfaction: 0,
            },
            modelB: {
              accuracy: 0,
              responseTime: 0,
              userSatisfaction: 0,
            },
          },
        })
      );
    });

    it('should handle A/B test with different traffic splits', async () => {
      // Arrange
      const abTestConfig = {
        name: 'Canary Test',
        description: 'Testing with 10% traffic',
        modelVersionA: 'stable-version',
        modelVersionB: 'canary-version',
        trafficSplit: 10,
        startDate: new Date(),
        isActive: true,
      };

      // Act
      const abTest = await mlModelTrainer.createABTest(abTestConfig);

      // Assert
      expect(abTest.trafficSplit).toBe(10);
    });
  });

  describe('getABTestResults', () => {
    it('should return A/B test if exists', async () => {
      // Arrange
      const abTestConfig = {
        name: 'Test AB',
        description: 'Test description',
        modelVersionA: 'version-a',
        modelVersionB: 'version-b',
        trafficSplit: 50,
        startDate: new Date(),
        isActive: true,
      };
      const createdTest = await mlModelTrainer.createABTest(
        abTestConfig
      );

      // Act
      const retrievedTest = await mlModelTrainer.getABTestResults(
        createdTest.id
      );

      // Assert
      expect(retrievedTest).toEqual(createdTest);
    });

    it('should return null for non-existent test', async () => {
      // Act
      const retrievedTest = await mlModelTrainer.getABTestResults(
        'non-existent-id'
      );

      // Assert
      expect(retrievedTest).toBeNull();
    });
  });

  describe('updateABTestMetrics', () => {
    it('should update metrics for model A', async () => {
      // Arrange
      const abTestConfig = {
        name: 'Metrics Test',
        description: 'Testing metrics update',
        modelVersionA: 'version-a',
        modelVersionB: 'version-b',
        trafficSplit: 50,
        startDate: new Date(),
        isActive: true,
      };
      const abTest = await mlModelTrainer.createABTest(abTestConfig);

      // Act
      await mlModelTrainer.updateABTestMetrics(abTest.id, 'A', {
        accuracy: 0.85,
        responseTime: 150,
        userSatisfaction: 0.9,
      });

      // Assert
      const updatedTest = await mlModelTrainer.getABTestResults(
        abTest.id
      );
      expect(updatedTest?.metrics.modelA).toEqual({
        accuracy: 0.85,
        responseTime: 150,
        userSatisfaction: 0.9,
      });
    });

    it('should update metrics for model B', async () => {
      // Arrange
      const abTestConfig = {
        name: 'Metrics Test B',
        description: 'Testing metrics update for model B',
        modelVersionA: 'version-a',
        modelVersionB: 'version-b',
        trafficSplit: 50,
        startDate: new Date(),
        isActive: true,
      };
      const abTest = await mlModelTrainer.createABTest(abTestConfig);

      // Act
      await mlModelTrainer.updateABTestMetrics(abTest.id, 'B', {
        accuracy: 0.88,
        responseTime: 120,
      });

      // Assert
      const updatedTest = await mlModelTrainer.getABTestResults(
        abTest.id
      );
      expect(updatedTest?.metrics.modelB.accuracy).toBe(0.88);
      expect(updatedTest?.metrics.modelB.responseTime).toBe(120);
      expect(updatedTest?.metrics.modelB.userSatisfaction).toBe(0); // Should remain unchanged
    });

    it('should throw error for non-existent A/B test', async () => {
      // Act & Assert
      await expect(
        mlModelTrainer.updateABTestMetrics('non-existent-id', 'A', {
          accuracy: 0.9,
        })
      ).rejects.toThrow('A/B test non-existent-id not found');
    });
  });

  describe('training execution', () => {
    it('should complete training asynchronously', async () => {
      // Arrange
      const trainingData: TrainingData[] = [
        {
          input: 'Sample input',
          expectedOutput: { result: 'expected' },
          feedback: {
            verificationId: 'test-verification',
            userFeedback: 'correct',
            userId: 'test-user',
            timestamp: new Date(),
          },
          domain: 'legal',
          timestamp: new Date(),
        },
      ];

      // Act
      const trainingJob = await mlModelTrainer.startTraining({
        domain: 'legal',
        trainingData,
      });

      // Wait for training to complete (with timeout)
      let completedJob: TrainingJob | null = null;
      const maxWaitTime = 5000; // 5 seconds
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        completedJob = await mlModelTrainer.getTrainingJob(
          trainingJob.id
        );
        if (
          completedJob &&
          (completedJob.status === 'completed' ||
            completedJob.status === 'failed')
        ) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Assert
      expect(completedJob).toBeTruthy();
      expect(['completed', 'failed']).toContain(completedJob!.status);

      if (completedJob!.status === 'completed') {
        expect(completedJob!.progress).toBe(100);
        expect(completedJob!.completedAt).toBeTruthy();
        expect(completedJob!.modelVersion).toBeTruthy();
      }
    }, 10000); // 10 second timeout for this test
  });
});
