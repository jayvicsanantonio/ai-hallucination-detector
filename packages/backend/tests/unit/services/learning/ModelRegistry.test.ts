import {
  ModelRegistry,
  ModelArtifact,
  ModelMetadata,
  ModelLineage,
  ModelSearchCriteria,
} from '../../../../src/services/learning/ModelRegistry';
import { ModelVersion } from '../../../../src/services/learning/MLModelTrainer';

// Mock dependencies
jest.mock('../../../../src/utils/Logger');

describe('ModelRegistry', () => {
  let registry: ModelRegistry;

  beforeEach(() => {
    registry = new ModelRegistry();
  });

  describe('registerModel', () => {
    const mockModelVersion: ModelVersion = {
      id: 'model-v1',
      version: 'v1.0',
      domain: 'legal',
      accuracy: 0.85,
      trainingDataSize: 1000,
      createdAt: new Date(),
      isActive: false,
      modelPath: '/models/legal/v1',
      metadata: {
        hyperparameters: { learningRate: 0.001 },
        trainingMetrics: { accuracy: 0.85 },
        validationMetrics: { accuracy: 0.83 },
      },
    };

    const mockMetadata = {
      domain: 'legal' as const,
      framework: 'tensorflow',
      modelType: 'classification',
      inputSchema: { text: 'string' },
      outputSchema: { prediction: 'string', confidence: 'number' },
      dependencies: ['tensorflow==2.8.0', 'numpy==1.21.0'],
      environment: { python: '3.9', cuda: '11.2' },
      tags: ['legal', 'contract-analysis'],
      description: 'Legal document classification model',
    };

    const mockLineage = {
      parentVersionId: 'model-v0',
      trainingDataSources: ['dataset-v1', 'dataset-v2'],
      trainingPipelineId: 'pipeline-1',
      experimentId: 'exp-123',
      gitCommit: 'abc123def',
      createdBy: 'data-scientist-1',
    };

    it('should register model successfully', async () => {
      // Act
      await registry.registerModel(
        mockModelVersion,
        mockMetadata,
        mockLineage
      );

      // Assert
      const retrievedModel = await registry.getModelVersion(
        'model-v1'
      );
      expect(retrievedModel).toEqual(mockModelVersion);

      const retrievedMetadata = await registry.getModelMetadata(
        'model-v1'
      );
      expect(retrievedMetadata).toEqual(
        expect.objectContaining({
          modelVersionId: 'model-v1',
          framework: 'tensorflow',
          modelType: 'classification',
          tags: ['legal', 'contract-analysis'],
        })
      );

      const retrievedLineage = await registry.getModelLineage(
        'model-v1'
      );
      expect(retrievedLineage).toEqual(
        expect.objectContaining({
          modelVersionId: 'model-v1',
          parentVersionId: 'model-v0',
          createdBy: 'data-scientist-1',
        })
      );
    });

    it('should initialize empty artifacts array', async () => {
      // Act
      await registry.registerModel(
        mockModelVersion,
        mockMetadata,
        mockLineage
      );

      // Assert
      const artifacts = await registry.getModelArtifacts('model-v1');
      expect(artifacts).toEqual([]);
    });
  });

  describe('uploadArtifact', () => {
    beforeEach(async () => {
      const mockModelVersion: ModelVersion = {
        id: 'model-v1',
        version: 'v1.0',
        domain: 'legal',
        accuracy: 0.85,
        trainingDataSize: 1000,
        createdAt: new Date(),
        isActive: false,
        modelPath: '/models/legal/v1',
        metadata: {
          hyperparameters: {},
          trainingMetrics: {},
          validationMetrics: {},
        },
      };

      await registry.registerModel(
        mockModelVersion,
        {
          domain: 'legal',
          framework: 'tensorflow',
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
    });

    it('should upload artifact successfully', async () => {
      // Arrange
      const artifactData = {
        modelVersionId: 'model-v1',
        artifactType: 'model_file' as const,
        fileName: 'model.pkl',
        filePath: '/artifacts/model-v1/model.pkl',
        fileSize: 1024000,
        checksum: 'abc123def456',
        metadata: { compression: 'gzip' },
      };

      // Act
      const artifact = await registry.uploadArtifact(
        'model-v1',
        artifactData
      );

      // Assert
      expect(artifact).toEqual(
        expect.objectContaining({
          id: expect.stringMatching(/^artifact_/),
          modelVersionId: 'model-v1',
          artifactType: 'model_file',
          fileName: 'model.pkl',
          uploadedAt: expect.any(Date),
        })
      );

      const artifacts = await registry.getModelArtifacts('model-v1');
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0]).toEqual(artifact);
    });

    it('should upload multiple artifacts for same model', async () => {
      // Arrange
      const artifacts = [
        {
          modelVersionId: 'model-v1',
          artifactType: 'model_file' as const,
          fileName: 'model.pkl',
          filePath: '/artifacts/model-v1/model.pkl',
          fileSize: 1024000,
          checksum: 'abc123',
        },
        {
          modelVersionId: 'model-v1',
          artifactType: 'config' as const,
          fileName: 'config.json',
          filePath: '/artifacts/model-v1/config.json',
          fileSize: 2048,
          checksum: 'def456',
        },
      ];

      // Act
      for (const artifactData of artifacts) {
        await registry.uploadArtifact('model-v1', artifactData);
      }

      // Assert
      const allArtifacts = await registry.getModelArtifacts(
        'model-v1'
      );
      expect(allArtifacts).toHaveLength(2);

      const modelFiles = await registry.getModelArtifacts(
        'model-v1',
        'model_file'
      );
      expect(modelFiles).toHaveLength(1);
      expect(modelFiles[0].fileName).toBe('model.pkl');

      const configFiles = await registry.getModelArtifacts(
        'model-v1',
        'config'
      );
      expect(configFiles).toHaveLength(1);
      expect(configFiles[0].fileName).toBe('config.json');
    });
  });

  describe('searchModels', () => {
    beforeEach(async () => {
      // Register multiple models for testing
      const models = [
        {
          version: {
            id: 'legal-model-v1',
            version: 'v1.0',
            domain: 'legal' as const,
            accuracy: 0.85,
            trainingDataSize: 1000,
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            isActive: true,
            modelPath: '/models/legal/v1',
            metadata: {
              hyperparameters: {},
              trainingMetrics: {},
              validationMetrics: {},
            },
          },
          metadata: {
            domain: 'legal' as const,
            framework: 'tensorflow',
            modelType: 'classification',
            inputSchema: {},
            outputSchema: {},
            dependencies: [],
            environment: {},
            tags: ['legal', 'contracts'],
          },
        },
        {
          version: {
            id: 'financial-model-v1',
            version: 'v1.0',
            domain: 'financial' as const,
            accuracy: 0.92,
            trainingDataSize: 2000,
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
            isActive: false,
            modelPath: '/models/financial/v1',
            metadata: {
              hyperparameters: {},
              trainingMetrics: {},
              validationMetrics: {},
            },
          },
          metadata: {
            domain: 'financial' as const,
            framework: 'pytorch',
            modelType: 'regression',
            inputSchema: {},
            outputSchema: {},
            dependencies: [],
            environment: {},
            tags: ['financial', 'risk-assessment'],
          },
        },
        {
          version: {
            id: 'legal-model-v2',
            version: 'v2.0',
            domain: 'legal' as const,
            accuracy: 0.88,
            trainingDataSize: 1500,
            createdAt: new Date(), // Today
            isActive: false,
            modelPath: '/models/legal/v2',
            metadata: {
              hyperparameters: {},
              trainingMetrics: {},
              validationMetrics: {},
            },
          },
          metadata: {
            domain: 'legal' as const,
            framework: 'tensorflow',
            modelType: 'classification',
            inputSchema: {},
            outputSchema: {},
            dependencies: [],
            environment: {},
            tags: ['legal', 'compliance'],
          },
        },
      ];

      for (const model of models) {
        await registry.registerModel(model.version, model.metadata, {
          trainingDataSources: [],
          createdBy: 'test-user',
        });
      }
    });

    it('should return all models when no criteria specified', async () => {
      // Act
      const results = await registry.searchModels({});

      // Assert
      expect(results).toHaveLength(3);
    });

    it('should filter by domain', async () => {
      // Act
      const legalModels = await registry.searchModels({
        domain: 'legal',
      });

      // Assert
      expect(legalModels).toHaveLength(2);
      expect(legalModels.every((m) => m.domain === 'legal')).toBe(
        true
      );
    });

    it('should filter by framework', async () => {
      // Act
      const tensorflowModels = await registry.searchModels({
        framework: 'tensorflow',
      });

      // Assert
      expect(tensorflowModels).toHaveLength(2);
    });

    it('should filter by model type', async () => {
      // Act
      const classificationModels = await registry.searchModels({
        modelType: 'classification',
      });

      // Assert
      expect(classificationModels).toHaveLength(2);
    });

    it('should filter by tags', async () => {
      // Act
      const contractModels = await registry.searchModels({
        tags: ['contracts'],
      });

      // Assert
      expect(contractModels).toHaveLength(1);
      expect(contractModels[0].id).toBe('legal-model-v1');
    });

    it('should filter by minimum accuracy', async () => {
      // Act
      const highAccuracyModels = await registry.searchModels({
        minAccuracy: 0.9,
      });

      // Assert
      expect(highAccuracyModels).toHaveLength(1);
      expect(highAccuracyModels[0].accuracy).toBeGreaterThanOrEqual(
        0.9
      );
    });

    it('should filter by maximum age', async () => {
      // Act
      const recentModels = await registry.searchModels({ maxAge: 3 }); // Last 3 days

      // Assert
      expect(recentModels).toHaveLength(2); // financial-model-v1 and legal-model-v2
    });

    it('should filter by active status', async () => {
      // Act
      const activeModels = await registry.searchModels({
        isActive: true,
      });

      // Assert
      expect(activeModels).toHaveLength(1);
      expect(activeModels[0].isActive).toBe(true);
    });

    it('should combine multiple filters', async () => {
      // Act
      const results = await registry.searchModels({
        domain: 'legal',
        framework: 'tensorflow',
        minAccuracy: 0.87,
      });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('legal-model-v2');
    });

    it('should sort results by accuracy and creation date', async () => {
      // Act
      const results = await registry.searchModels({
        domain: 'legal',
      });

      // Assert
      expect(results).toHaveLength(2);
      // Should be sorted by accuracy (descending), then by creation date (newest first)
      expect(results[0].accuracy).toBeGreaterThanOrEqual(
        results[1].accuracy
      );
    });
  });

  describe('updateModelMetadata', () => {
    beforeEach(async () => {
      const mockModelVersion: ModelVersion = {
        id: 'model-v1',
        version: 'v1.0',
        domain: 'legal',
        accuracy: 0.85,
        trainingDataSize: 1000,
        createdAt: new Date(),
        isActive: false,
        modelPath: '/models/legal/v1',
        metadata: {
          hyperparameters: {},
          trainingMetrics: {},
          validationMetrics: {},
        },
      };

      await registry.registerModel(
        mockModelVersion,
        {
          domain: 'legal',
          framework: 'tensorflow',
          modelType: 'classification',
          inputSchema: {},
          outputSchema: {},
          dependencies: [],
          environment: {},
          tags: ['legal'],
          description: 'Original description',
        },
        { trainingDataSources: [], createdBy: 'test-user' }
      );
    });

    it('should update metadata successfully', async () => {
      // Arrange
      const updates = {
        description: 'Updated description',
        tags: ['legal', 'updated'],
        framework: 'pytorch',
      };

      // Act
      const updatedMetadata = await registry.updateModelMetadata(
        'model-v1',
        updates
      );

      // Assert
      expect(updatedMetadata).toEqual(
        expect.objectContaining({
          modelVersionId: 'model-v1',
          description: 'Updated description',
          tags: ['legal', 'updated'],
          framework: 'pytorch',
          updatedAt: expect.any(Date),
        })
      );
    });

    it('should throw error for non-existent model', async () => {
      // Act & Assert
      await expect(
        registry.updateModelMetadata('non-existent-model', {
          description: 'test',
        })
      ).rejects.toThrow(
        'Model metadata not found for version non-existent-model'
      );
    });
  });

  describe('deleteModel', () => {
    beforeEach(async () => {
      const mockModelVersion: ModelVersion = {
        id: 'model-v1',
        version: 'v1.0',
        domain: 'legal',
        accuracy: 0.85,
        trainingDataSize: 1000,
        createdAt: new Date(),
        isActive: false,
        modelPath: '/models/legal/v1',
        metadata: {
          hyperparameters: {},
          trainingMetrics: {},
          validationMetrics: {},
        },
      };

      await registry.registerModel(
        mockModelVersion,
        {
          domain: 'legal',
          framework: 'tensorflow',
          modelType: 'classification',
          inputSchema: {},
          outputSchema: {},
          dependencies: [],
          environment: {},
          tags: [],
        },
        { trainingDataSources: [], createdBy: 'test-user' }
      );

      // Upload an artifact
      await registry.uploadArtifact('model-v1', {
        modelVersionId: 'model-v1',
        artifactType: 'model_file',
        fileName: 'model.pkl',
        filePath: '/artifacts/model.pkl',
        fileSize: 1024,
        checksum: 'abc123',
      });
    });

    it('should delete inactive model successfully', async () => {
      // Act
      await registry.deleteModel('model-v1');

      // Assert
      const model = await registry.getModelVersion('model-v1');
      expect(model).toBeNull();

      const metadata = await registry.getModelMetadata('model-v1');
      expect(metadata).toBeNull();

      const lineage = await registry.getModelLineage('model-v1');
      expect(lineage).toBeNull();

      const artifacts = await registry.getModelArtifacts('model-v1');
      expect(artifacts).toEqual([]);
    });

    it('should throw error when trying to delete active model', async () => {
      // Arrange - Make model active
      const model = await registry.getModelVersion('model-v1');
      if (model) {
        model.isActive = true;
      }

      // Act & Assert
      await expect(registry.deleteModel('model-v1')).rejects.toThrow(
        'Cannot delete active model version model-v1'
      );
    });

    it('should throw error for non-existent model', async () => {
      // Act & Assert
      await expect(
        registry.deleteModel('non-existent-model')
      ).rejects.toThrow('Model version non-existent-model not found');
    });
  });

  describe('compareModels', () => {
    beforeEach(async () => {
      const models = [
        {
          version: {
            id: 'model-v1',
            version: 'v1.0',
            domain: 'legal' as const,
            accuracy: 0.85,
            trainingDataSize: 1000,
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            isActive: false,
            modelPath: '/models/legal/v1',
            metadata: {
              hyperparameters: {},
              trainingMetrics: {},
              validationMetrics: {},
            },
          },
          metadata: {
            domain: 'legal' as const,
            framework: 'tensorflow',
            modelType: 'classification',
            inputSchema: {},
            outputSchema: {},
            dependencies: [],
            environment: {},
            tags: [],
          },
        },
        {
          version: {
            id: 'model-v2',
            version: 'v2.0',
            domain: 'legal' as const,
            accuracy: 0.92,
            trainingDataSize: 1500,
            createdAt: new Date(),
            isActive: true,
            modelPath: '/models/legal/v2',
            metadata: {
              hyperparameters: {},
              trainingMetrics: {},
              validationMetrics: {},
            },
          },
          metadata: {
            domain: 'legal' as const,
            framework: 'pytorch',
            modelType: 'classification',
            inputSchema: {},
            outputSchema: {},
            dependencies: [],
            environment: {},
            tags: [],
          },
        },
      ];

      for (const model of models) {
        await registry.registerModel(model.version, model.metadata, {
          trainingDataSources: [],
          createdBy: 'test-user',
        });
      }
    });

    it('should compare models successfully', async () => {
      // Act
      const comparison = await registry.compareModels([
        'model-v1',
        'model-v2',
      ]);

      // Assert
      expect(comparison.models).toHaveLength(2);
      expect(comparison.metadata).toHaveLength(2);

      expect(comparison.comparison.accuracyComparison).toEqual({
        'model-v1': 0.85,
        'model-v2': 0.92,
      });

      expect(comparison.comparison.sizeComparison).toEqual({
        'model-v1': 1000,
        'model-v2': 1500,
      });

      expect(comparison.comparison.frameworkComparison).toEqual({
        'model-v1': 'tensorflow',
        'model-v2': 'pytorch',
      });

      expect(
        comparison.comparison.ageComparison['model-v1']
      ).toBeGreaterThan(
        comparison.comparison.ageComparison['model-v2']
      );
    });

    it('should handle non-existent models in comparison', async () => {
      // Act
      const comparison = await registry.compareModels([
        'model-v1',
        'non-existent',
      ]);

      // Assert
      expect(comparison.models).toHaveLength(1);
      expect(comparison.metadata).toHaveLength(1);
    });
  });

  describe('getModelStats', () => {
    beforeEach(async () => {
      const mockModelVersion: ModelVersion = {
        id: 'model-v1',
        version: 'v1.0',
        domain: 'legal',
        accuracy: 0.85,
        trainingDataSize: 1000,
        createdAt: new Date(),
        isActive: false,
        modelPath: '/models/legal/v1',
        metadata: {
          hyperparameters: {},
          trainingMetrics: {},
          validationMetrics: {},
        },
      };

      await registry.registerModel(
        mockModelVersion,
        {
          domain: 'legal',
          framework: 'tensorflow',
          modelType: 'classification',
          inputSchema: {},
          outputSchema: {},
          dependencies: [],
          environment: {},
          tags: [],
        },
        { trainingDataSources: [], createdBy: 'test-user' }
      );
    });

    it('should return model statistics', async () => {
      // Act
      const stats = await registry.getModelStats('model-v1');

      // Assert
      expect(stats).toEqual(
        expect.objectContaining({
          totalPredictions: expect.any(Number),
          averageResponseTime: expect.any(Number),
          errorRate: expect.any(Number),
          lastUsed: expect.any(Date),
          popularityScore: expect.any(Number),
        })
      );

      expect(stats.totalPredictions).toBeGreaterThan(0);
      expect(stats.averageResponseTime).toBeGreaterThan(0);
      expect(stats.errorRate).toBeGreaterThanOrEqual(0);
      expect(stats.popularityScore).toBeGreaterThanOrEqual(0);
    });

    it('should throw error for non-existent model', async () => {
      // Act & Assert
      await expect(
        registry.getModelStats('non-existent-model')
      ).rejects.toThrow('Model version non-existent-model not found');
    });
  });

  describe('getModelFamilyTree', () => {
    beforeEach(async () => {
      // Create a family tree: root -> v1 -> v2 -> v3
      const models = [
        {
          id: 'model-root',
          parentId: undefined,
        },
        {
          id: 'model-v1',
          parentId: 'model-root',
        },
        {
          id: 'model-v2',
          parentId: 'model-v1',
        },
        {
          id: 'model-v3',
          parentId: 'model-v2',
        },
      ];

      for (const model of models) {
        const mockModelVersion: ModelVersion = {
          id: model.id,
          version: 'v1.0',
          domain: 'legal',
          accuracy: 0.85,
          trainingDataSize: 1000,
          createdAt: new Date(),
          isActive: false,
          modelPath: `/models/legal/${model.id}`,
          metadata: {
            hyperparameters: {},
            trainingMetrics: {},
            validationMetrics: {},
          },
        };

        await registry.registerModel(
          mockModelVersion,
          {
            domain: 'legal',
            framework: 'tensorflow',
            modelType: 'classification',
            inputSchema: {},
            outputSchema: {},
            dependencies: [],
            environment: {},
            tags: [],
          },
          {
            parentVersionId: model.parentId,
            trainingDataSources: [],
            createdBy: 'test-user',
          }
        );
      }
    });

    it('should return family tree for middle node', async () => {
      // Act
      const familyTree = await registry.getModelFamilyTree(
        'model-v2'
      );

      // Assert
      expect(familyTree.ancestors).toHaveLength(2); // model-v1 and model-root
      expect(familyTree.descendants).toHaveLength(1); // model-v3
      expect(familyTree.root?.id).toBe('model-root');
    });

    it('should return family tree for root node', async () => {
      // Act
      const familyTree = await registry.getModelFamilyTree(
        'model-root'
      );

      // Assert
      expect(familyTree.ancestors).toHaveLength(0);
      expect(familyTree.descendants).toHaveLength(3); // v1, v2, v3
      expect(familyTree.root?.id).toBe('model-root');
    });

    it('should return family tree for leaf node', async () => {
      // Act
      const familyTree = await registry.getModelFamilyTree(
        'model-v3'
      );

      // Assert
      expect(familyTree.ancestors).toHaveLength(3); // v2, v1, root
      expect(familyTree.descendants).toHaveLength(0);
      expect(familyTree.root?.id).toBe('model-root');
    });
  });
});
