import {
  TrainingDataManager,
  DatasetVersion,
  DataQualityReport,
  DataAugmentationConfig,
  DataPreprocessingConfig,
} from '../../../../src/services/learning/TrainingDataManager';
import { FeedbackData } from '../../../../src/models/audit/FeedbackData';

// Mock dependencies
jest.mock('../../../../src/utils/Logger');

describe('TrainingDataManager', () => {
  let dataManager: TrainingDataManager;

  beforeEach(() => {
    dataManager = new TrainingDataManager();
  });

  describe('createDatasetVersion', () => {
    const mockFeedbackData: FeedbackData[] = [
      {
        verificationId: 'test-1',
        userFeedback: 'correct',
        userId: 'user-1',
        timestamp: new Date(),
        originalContent: 'This is a legal document about contracts.',
      },
      {
        verificationId: 'test-2',
        userFeedback: 'incorrect',
        corrections: 'This should be about compliance.',
        userId: 'user-2',
        timestamp: new Date(),
        originalContent: 'This is a legal document about compliance.',
      },
      {
        verificationId: 'test-3',
        userFeedback: 'correct',
        userId: 'user-3',
        timestamp: new Date(),
        originalContent: 'Legal analysis of contract terms.',
      },
    ];

    it('should create dataset version successfully', async () => {
      // Act
      const dataset = await dataManager.createDatasetVersion(
        'Legal Training Dataset',
        'legal',
        mockFeedbackData,
        {
          description: 'Dataset for legal document classification',
          tags: ['legal', 'contracts'],
          createdBy: 'data-scientist-1',
        }
      );

      // Assert
      expect(dataset).toEqual(
        expect.objectContaining({
          id: expect.stringMatching(/^dataset_/),
          name: 'Legal Training Dataset',
          domain: 'legal',
          version: expect.stringMatching(/^v\d+$/),
          description: 'Dataset for legal document classification',
          size: 3,
          tags: ['legal', 'contracts'],
          createdBy: 'data-scientist-1',
          createdAt: expect.any(Date),
          metadata: expect.objectContaining({
            qualityScore: expect.any(Number),
            balanceScore: expect.any(Number),
            diversityScore: expect.any(Number),
            completenessScore: expect.any(Number),
          }),
          splits: expect.objectContaining({
            training: expect.any(Number),
            validation: expect.any(Number),
            test: expect.any(Number),
          }),
          dataPath: expect.stringContaining('/datasets/legal/'),
          checksums: expect.objectContaining({
            training: expect.any(String),
            validation: expect.any(String),
            test: expect.any(String),
          }),
        })
      );
    });

    it('should create dataset with custom splits', async () => {
      // Arrange
      const customSplits = {
        training: 0.8,
        validation: 0.1,
        test: 0.1,
      };

      // Act
      const dataset = await dataManager.createDatasetVersion(
        'Custom Split Dataset',
        'financial',
        mockFeedbackData,
        {
          createdBy: 'data-scientist-1',
          splits: customSplits,
        }
      );

      // Assert
      expect(dataset.splits).toEqual(customSplits);
    });

    it('should create dataset with preprocessing config', async () => {
      // Arrange
      const preprocessingConfig: DataPreprocessingConfig = {
        textNormalization: {
          lowercase: true,
          removeSpecialChars: true,
          removeStopwords: false,
          stemming: false,
          lemmatization: true,
        },
        tokenization: {
          maxLength: 512,
          padding: 'max_length',
          truncation: true,
        },
        encoding: {
          method: 'bert',
          modelName: 'bert-base-uncased',
          dimensions: 768,
        },
      };

      // Act
      const dataset = await dataManager.createDatasetVersion(
        'Preprocessed Dataset',
        'healthcare',
        mockFeedbackData,
        {
          createdBy: 'data-scientist-1',
          preprocessingConfig,
        }
      );

      // Assert
      expect(dataset.size).toBe(3); // Should still have same number of samples
    });

    it('should create dataset with data augmentation', async () => {
      // Arrange
      const augmentationConfig: DataAugmentationConfig = {
        enabled: true,
        techniques: {
          synonymReplacement: {
            probability: 0.1,
            maxReplacements: 2,
          },
          randomInsertion: { probability: 0.05, maxInsertions: 1 },
        },
        targetMultiplier: 2,
      };

      // Act
      const dataset = await dataManager.createDatasetVersion(
        'Augmented Dataset',
        'legal',
        mockFeedbackData,
        {
          createdBy: 'data-scientist-1',
          augmentationConfig,
        }
      );

      // Assert
      expect(dataset.size).toBeGreaterThan(3); // Should have more samples due to augmentation
    });
  });

  describe('getDatasetVersion', () => {
    let datasetId: string;

    beforeEach(async () => {
      const dataset = await dataManager.createDatasetVersion(
        'Test Dataset',
        'legal',
        [
          {
            verificationId: 'test-1',
            userFeedback: 'correct',
            userId: 'user-1',
            timestamp: new Date(),
            originalContent: 'Test content',
          },
        ] as FeedbackData[],
        { createdBy: 'test-user' }
      );
      datasetId = dataset.id;
    });

    it('should return dataset version if exists', async () => {
      // Act
      const dataset = await dataManager.getDatasetVersion(datasetId);

      // Assert
      expect(dataset).toBeTruthy();
      expect(dataset?.id).toBe(datasetId);
      expect(dataset?.name).toBe('Test Dataset');
    });

    it('should return null for non-existent dataset', async () => {
      // Act
      const dataset = await dataManager.getDatasetVersion(
        'non-existent-id'
      );

      // Assert
      expect(dataset).toBeNull();
    });
  });

  describe('getTrainingData', () => {
    let datasetId: string;

    beforeEach(async () => {
      const mockFeedbackData: FeedbackData[] = [
        {
          verificationId: 'test-1',
          userFeedback: 'correct',
          userId: 'user-1',
          timestamp: new Date(),
          originalContent: 'Content 1',
        },
        {
          verificationId: 'test-2',
          userFeedback: 'incorrect',
          corrections: 'Corrected content',
          userId: 'user-2',
          timestamp: new Date(),
          originalContent: 'Content 2',
        },
      ];

      const dataset = await dataManager.createDatasetVersion(
        'Test Dataset',
        'legal',
        mockFeedbackData,
        { createdBy: 'test-user' }
      );
      datasetId = dataset.id;
    });

    it('should return training data for valid dataset and split', async () => {
      // Act
      const trainingData = await dataManager.getTrainingData(
        datasetId,
        'training'
      );

      // Assert
      expect(Array.isArray(trainingData)).toBe(true);
      expect(trainingData.length).toBeGreaterThan(0);
      expect(trainingData[0]).toEqual(
        expect.objectContaining({
          input: expect.any(String),
          expectedOutput: expect.any(String),
          feedback: expect.any(Object),
          domain: 'legal',
          timestamp: expect.any(Date),
        })
      );
    });

    it('should return validation data', async () => {
      // Act
      const validationData = await dataManager.getTrainingData(
        datasetId,
        'validation'
      );

      // Assert
      expect(Array.isArray(validationData)).toBe(true);
    });

    it('should return test data', async () => {
      // Act
      const testData = await dataManager.getTrainingData(
        datasetId,
        'test'
      );

      // Assert
      expect(Array.isArray(testData)).toBe(true);
    });

    it('should throw error for non-existent dataset', async () => {
      // Act & Assert
      await expect(
        dataManager.getTrainingData('non-existent-id', 'training')
      ).rejects.toThrow(
        'Training data not found for dataset non-existent-id, split training'
      );
    });
  });

  describe('listDatasetVersions', () => {
    beforeEach(async () => {
      // Create multiple datasets for testing
      const datasets = [
        {
          name: 'Legal Dataset 1',
          domain: 'legal' as const,
          tags: ['legal', 'contracts'],
        },
        {
          name: 'Financial Dataset 1',
          domain: 'financial' as const,
          tags: ['financial', 'risk'],
        },
        {
          name: 'Legal Dataset 2',
          domain: 'legal' as const,
          tags: ['legal', 'compliance'],
        },
      ];

      const mockFeedbackData: FeedbackData[] = [
        {
          verificationId: 'test-1',
          userFeedback: 'correct',
          userId: 'user-1',
          timestamp: new Date(),
          originalContent: 'Test content',
        },
      ];

      for (const dataset of datasets) {
        await dataManager.createDatasetVersion(
          dataset.name,
          dataset.domain,
          mockFeedbackData,
          {
            createdBy: 'test-user',
            tags: dataset.tags,
          }
        );
      }
    });

    it('should return all datasets when no filters applied', async () => {
      // Act
      const datasets = await dataManager.listDatasetVersions();

      // Assert
      expect(datasets).toHaveLength(3);
    });

    it('should filter by domain', async () => {
      // Act
      const legalDatasets = await dataManager.listDatasetVersions({
        domain: 'legal',
      });

      // Assert
      expect(legalDatasets).toHaveLength(2);
      expect(legalDatasets.every((d) => d.domain === 'legal')).toBe(
        true
      );
    });

    it('should filter by tags', async () => {
      // Act
      const contractDatasets = await dataManager.listDatasetVersions({
        tags: ['contracts'],
      });

      // Assert
      expect(contractDatasets).toHaveLength(1);
      expect(contractDatasets[0].name).toBe('Legal Dataset 1');
    });

    it('should filter by minimum quality score', async () => {
      // Act
      const highQualityDatasets =
        await dataManager.listDatasetVersions({
          minQualityScore: 0.8,
        });

      // Assert
      expect(Array.isArray(highQualityDatasets)).toBe(true);
      expect(
        highQualityDatasets.every(
          (d) => d.metadata.qualityScore >= 0.8
        )
      ).toBe(true);
    });

    it('should limit number of results', async () => {
      // Act
      const limitedDatasets = await dataManager.listDatasetVersions({
        limit: 2,
      });

      // Assert
      expect(limitedDatasets).toHaveLength(2);
    });

    it('should sort by creation date (newest first)', async () => {
      // Act
      const datasets = await dataManager.listDatasetVersions();

      // Assert
      expect(datasets).toHaveLength(3);
      for (let i = 0; i < datasets.length - 1; i++) {
        expect(
          datasets[i].createdAt.getTime()
        ).toBeGreaterThanOrEqual(datasets[i + 1].createdAt.getTime());
      }
    });
  });

  describe('generateQualityReport', () => {
    it('should generate quality report with no issues for good data', async () => {
      // Arrange
      const goodFeedbackData: FeedbackData[] = [
        {
          verificationId: 'test-1',
          userFeedback: 'correct',
          userId: 'user-1',
          timestamp: new Date(),
          originalContent:
            'High quality legal document about contracts.',
        },
        {
          verificationId: 'test-2',
          userFeedback: 'incorrect',
          corrections: 'Should be about compliance instead.',
          userId: 'user-2',
          timestamp: new Date(),
          originalContent:
            'High quality legal document about compliance.',
        },
      ];

      const dataset = await dataManager.createDatasetVersion(
        'Good Dataset',
        'legal',
        goodFeedbackData,
        { createdBy: 'test-user' }
      );

      // Act
      const report = await dataManager.getQualityReport(dataset.id);

      // Assert
      expect(report).toBeTruthy();
      expect(report?.datasetVersionId).toBe(dataset.id);
      expect(report?.overallScore).toBeGreaterThan(0);
      expect(report?.metrics).toEqual(
        expect.objectContaining({
          duplicateRate: expect.any(Number),
          missingValueRate: expect.any(Number),
          outlierRate: expect.any(Number),
          labelDistribution: expect.any(Object),
          averageTextLength: expect.any(Number),
          vocabularySize: expect.any(Number),
        })
      );
      expect(Array.isArray(report?.issues)).toBe(true);
      expect(Array.isArray(report?.recommendations)).toBe(true);
    });

    it('should detect duplicate samples', async () => {
      // Arrange - Create data with duplicates
      const duplicateFeedbackData: FeedbackData[] = [
        {
          verificationId: 'test-1',
          userFeedback: 'correct',
          userId: 'user-1',
          timestamp: new Date(),
          originalContent: 'Duplicate content',
        },
        {
          verificationId: 'test-2',
          userFeedback: 'correct',
          userId: 'user-2',
          timestamp: new Date(),
          originalContent: 'Duplicate content', // Same content
        },
        {
          verificationId: 'test-3',
          userFeedback: 'incorrect',
          userId: 'user-3',
          timestamp: new Date(),
          originalContent: 'Unique content',
        },
      ];

      const dataset = await dataManager.createDatasetVersion(
        'Duplicate Dataset',
        'legal',
        duplicateFeedbackData,
        { createdBy: 'test-user' }
      );

      // Act
      const report = await dataManager.getQualityReport(dataset.id);

      // Assert
      expect(
        report?.issues.some((issue) => issue.type === 'duplicate')
      ).toBe(true);
      expect(report?.metrics.duplicateRate).toBeGreaterThan(0);
    });

    it('should detect missing values', async () => {
      // Arrange - Create data with missing values
      const missingValueFeedbackData: FeedbackData[] = [
        {
          verificationId: 'test-1',
          userFeedback: 'correct',
          userId: 'user-1',
          timestamp: new Date(),
          originalContent: '', // Missing content
        },
        {
          verificationId: 'test-2',
          userFeedback: 'incorrect',
          userId: 'user-2',
          timestamp: new Date(),
          originalContent: 'Valid content',
        },
      ];

      const dataset = await dataManager.createDatasetVersion(
        'Missing Values Dataset',
        'legal',
        missingValueFeedbackData,
        { createdBy: 'test-user' }
      );

      // Act
      const report = await dataManager.getQualityReport(dataset.id);

      // Assert
      expect(
        report?.issues.some((issue) => issue.type === 'missing_value')
      ).toBe(true);
      expect(report?.metrics.missingValueRate).toBeGreaterThan(0);
    });

    it('should detect imbalanced labels', async () => {
      // Arrange - Create highly imbalanced data
      const imbalancedFeedbackData: FeedbackData[] = [
        ...Array(9)
          .fill(null)
          .map((_, i) => ({
            verificationId: `correct-${i}`,
            userFeedback: 'correct',
            userId: `user-${i}`,
            timestamp: new Date(),
            originalContent: `Correct content ${i}`,
          })),
        {
          verificationId: 'incorrect-1',
          userFeedback: 'incorrect',
          userId: 'user-incorrect',
          timestamp: new Date(),
          originalContent: 'Incorrect content',
        },
      ] as FeedbackData[];

      const dataset = await dataManager.createDatasetVersion(
        'Imbalanced Dataset',
        'legal',
        imbalancedFeedbackData,
        { createdBy: 'test-user' }
      );

      // Act
      const report = await dataManager.getQualityReport(dataset.id);

      // Assert
      expect(
        report?.issues.some((issue) => issue.type === 'imbalanced')
      ).toBe(true);
    });
  });

  describe('validateDataset', () => {
    let datasetId: string;

    beforeEach(async () => {
      const mockFeedbackData: FeedbackData[] = Array(100)
        .fill(null)
        .map((_, i) => ({
          verificationId: `test-${i}`,
          userFeedback:
            i % 3 === 0
              ? 'correct'
              : i % 3 === 1
              ? 'incorrect'
              : 'partial',
          corrections: i % 3 === 1 ? `Correction ${i}` : undefined,
          userId: `user-${i}`,
          timestamp: new Date(),
          originalContent: `Content ${i}`,
        })) as FeedbackData[];

      const dataset = await dataManager.createDatasetVersion(
        'Validation Test Dataset',
        'legal',
        mockFeedbackData,
        { createdBy: 'test-user' }
      );
      datasetId = dataset.id;
    });

    it('should validate dataset that meets all requirements', async () => {
      // Arrange
      const requirements = {
        minSize: 50,
        minQualityScore: 0.5,
        maxImbalanceRatio: 50, // Higher ratio to account for individual corrections
        requiredFields: ['input', 'expectedOutput'],
      };

      // Act
      const validation = await dataManager.validateDataset(
        datasetId,
        requirements
      );

      // Assert
      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should fail validation for insufficient size', async () => {
      // Arrange
      const requirements = {
        minSize: 200, // More than our dataset has
        minQualityScore: 0.5,
        maxImbalanceRatio: 5,
        requiredFields: ['input', 'expectedOutput'],
      };

      // Act
      const validation = await dataManager.validateDataset(
        datasetId,
        requirements
      );

      // Assert
      expect(validation.isValid).toBe(false);
      expect(
        validation.issues.some((issue) => issue.includes('size'))
      ).toBe(true);
    });

    it('should fail validation for low quality score', async () => {
      // Arrange
      const requirements = {
        minSize: 50,
        minQualityScore: 0.95, // Very high requirement
        maxImbalanceRatio: 5,
        requiredFields: ['input', 'expectedOutput'],
      };

      // Act
      const validation = await dataManager.validateDataset(
        datasetId,
        requirements
      );

      // Assert
      expect(validation.isValid).toBe(false);
      expect(
        validation.issues.some((issue) =>
          issue.includes('Quality score')
        )
      ).toBe(true);
    });

    it('should return error for non-existent dataset', async () => {
      // Arrange
      const requirements = {
        minSize: 50,
        minQualityScore: 0.5,
        maxImbalanceRatio: 5,
        requiredFields: ['input', 'expectedOutput'],
      };

      // Act
      const validation = await dataManager.validateDataset(
        'non-existent-id',
        requirements
      );

      // Assert
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Dataset not found');
    });
  });

  describe('data preprocessing and augmentation', () => {
    const mockFeedbackData: FeedbackData[] = [
      {
        verificationId: 'test-1',
        userFeedback: 'correct',
        userId: 'user-1',
        timestamp: new Date(),
        originalContent: 'This Is A Test Document With Mixed Case!',
      },
      {
        verificationId: 'test-2',
        userFeedback: 'incorrect',
        corrections: 'corrected version',
        userId: 'user-2',
        timestamp: new Date(),
        originalContent: 'Another Test Document.',
      },
    ];

    it('should apply text normalization preprocessing', async () => {
      // Arrange
      const preprocessingConfig: DataPreprocessingConfig = {
        textNormalization: {
          lowercase: true,
          removeSpecialChars: true,
          removeStopwords: false,
          stemming: false,
          lemmatization: false,
        },
        tokenization: {
          maxLength: 512,
          padding: 'max_length',
          truncation: true,
        },
        encoding: {
          method: 'tfidf',
        },
      };

      // Act
      const dataset = await dataManager.createDatasetVersion(
        'Preprocessed Dataset',
        'legal',
        mockFeedbackData,
        {
          createdBy: 'test-user',
          preprocessingConfig,
        }
      );

      // Assert
      expect(dataset.size).toBe(2);

      // Get training data to verify preprocessing was applied
      const trainingData = await dataManager.getTrainingData(
        dataset.id,
        'training'
      );
      expect(trainingData.length).toBeGreaterThan(0);
    });

    it('should apply data augmentation', async () => {
      // Arrange
      const augmentationConfig: DataAugmentationConfig = {
        enabled: true,
        techniques: {
          synonymReplacement: {
            probability: 0.2,
            maxReplacements: 1,
          },
        },
        targetMultiplier: 3, // Triple the dataset size
      };

      // Act
      const dataset = await dataManager.createDatasetVersion(
        'Augmented Dataset',
        'legal',
        mockFeedbackData,
        {
          createdBy: 'test-user',
          augmentationConfig,
        }
      );

      // Assert
      expect(dataset.size).toBeGreaterThan(2); // Should have more samples
      expect(dataset.size).toBeLessThanOrEqual(6); // But not more than 3x original
    });
  });
});
