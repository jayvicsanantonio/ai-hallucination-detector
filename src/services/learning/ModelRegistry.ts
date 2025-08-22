import { ModelVersion } from './MLModelTrainer';
import { Domain } from '../../models/core/ContentTypes';
import { Logger } from '../../utils/Logger';

export interface ModelArtifact {
  id: string;
  modelVersionId: string;
  artifactType:
    | 'model_file'
    | 'weights'
    | 'config'
    | 'metadata'
    | 'training_data';
  fileName: string;
  filePath: string;
  fileSize: number;
  checksum: string;
  uploadedAt: Date;
  metadata?: Record<string, any>;
}

export interface ModelMetadata {
  id: string;
  modelVersionId: string;
  domain: Domain;
  framework: string; // 'tensorflow', 'pytorch', 'scikit-learn', etc.
  modelType: string; // 'classification', 'regression', 'nlp', etc.
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  dependencies: string[];
  environment: Record<string, string>;
  tags: string[];
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModelLineage {
  modelVersionId: string;
  parentVersionId?: string;
  trainingDataSources: string[];
  trainingPipelineId?: string;
  experimentId?: string;
  gitCommit?: string;
  createdBy: string;
  createdAt: Date;
}

export interface ModelSearchCriteria {
  domain?: Domain;
  framework?: string;
  modelType?: string;
  tags?: string[];
  minAccuracy?: number;
  maxAge?: number; // in days
  isActive?: boolean;
}

export class ModelRegistry {
  private logger: Logger;
  private modelVersions: Map<string, ModelVersion> = new Map();
  private modelArtifacts: Map<string, ModelArtifact[]> = new Map();
  private modelMetadata: Map<string, ModelMetadata> = new Map();
  private modelLineage: Map<string, ModelLineage> = new Map();

  constructor() {
    this.logger = new Logger('ModelRegistry');
  }

  /**
   * Register a new model version
   */
  async registerModel(
    modelVersion: ModelVersion,
    metadata: Omit<
      ModelMetadata,
      'id' | 'modelVersionId' | 'createdAt' | 'updatedAt'
    >,
    lineage: Omit<ModelLineage, 'modelVersionId' | 'createdAt'>
  ): Promise<void> {
    try {
      // Store model version
      this.modelVersions.set(modelVersion.id, modelVersion);

      // Store metadata
      const modelMetadata: ModelMetadata = {
        ...metadata,
        id: `metadata_${modelVersion.id}`,
        modelVersionId: modelVersion.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.modelMetadata.set(modelVersion.id, modelMetadata);

      // Store lineage
      const modelLineage: ModelLineage = {
        ...lineage,
        modelVersionId: modelVersion.id,
        createdAt: new Date(),
      };
      this.modelLineage.set(modelVersion.id, modelLineage);

      // Initialize artifacts array
      this.modelArtifacts.set(modelVersion.id, []);

      this.logger.info('Model registered', {
        modelVersionId: modelVersion.id,
        domain: modelVersion.domain,
        framework: metadata.framework,
      });
    } catch (error) {
      this.logger.error('Error registering model', {
        error: error instanceof Error ? error.message : String(error),
        modelVersionId: modelVersion.id,
      });
      throw error;
    }
  }

  /**
   * Upload model artifact
   */
  async uploadArtifact(
    modelVersionId: string,
    artifactData: Omit<ModelArtifact, 'id' | 'uploadedAt'>
  ): Promise<ModelArtifact> {
    try {
      const artifactId = `artifact_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const artifact: ModelArtifact = {
        ...artifactData,
        id: artifactId,
        uploadedAt: new Date(),
      };

      const existingArtifacts =
        this.modelArtifacts.get(modelVersionId) || [];
      existingArtifacts.push(artifact);
      this.modelArtifacts.set(modelVersionId, existingArtifacts);

      this.logger.info('Artifact uploaded', {
        artifactId,
        modelVersionId,
        artifactType: artifact.artifactType,
        fileName: artifact.fileName,
      });

      return artifact;
    } catch (error) {
      this.logger.error('Error uploading artifact', {
        error: error instanceof Error ? error.message : String(error),
        modelVersionId,
      });
      throw error;
    }
  }

  /**
   * Get model version by ID
   */
  async getModelVersion(
    modelVersionId: string
  ): Promise<ModelVersion | null> {
    return this.modelVersions.get(modelVersionId) || null;
  }

  /**
   * Get model metadata
   */
  async getModelMetadata(
    modelVersionId: string
  ): Promise<ModelMetadata | null> {
    return this.modelMetadata.get(modelVersionId) || null;
  }

  /**
   * Get model lineage
   */
  async getModelLineage(
    modelVersionId: string
  ): Promise<ModelLineage | null> {
    return this.modelLineage.get(modelVersionId) || null;
  }

  /**
   * Get model artifacts
   */
  async getModelArtifacts(
    modelVersionId: string,
    artifactType?: ModelArtifact['artifactType']
  ): Promise<ModelArtifact[]> {
    const artifacts = this.modelArtifacts.get(modelVersionId) || [];

    if (artifactType) {
      return artifacts.filter((a) => a.artifactType === artifactType);
    }

    return artifacts;
  }

  /**
   * Search models by criteria
   */
  async searchModels(
    criteria: ModelSearchCriteria
  ): Promise<ModelVersion[]> {
    try {
      let models = Array.from(this.modelVersions.values());

      // Filter by domain
      if (criteria.domain) {
        models = models.filter((m) => m.domain === criteria.domain);
      }

      // Filter by framework
      if (criteria.framework) {
        models = models.filter((m) => {
          const metadata = this.modelMetadata.get(m.id);
          return metadata?.framework === criteria.framework;
        });
      }

      // Filter by model type
      if (criteria.modelType) {
        models = models.filter((m) => {
          const metadata = this.modelMetadata.get(m.id);
          return metadata?.modelType === criteria.modelType;
        });
      }

      // Filter by tags
      if (criteria.tags && criteria.tags.length > 0) {
        models = models.filter((m) => {
          const metadata = this.modelMetadata.get(m.id);
          return metadata?.tags.some((tag) =>
            criteria.tags!.includes(tag)
          );
        });
      }

      // Filter by minimum accuracy
      if (criteria.minAccuracy !== undefined) {
        models = models.filter(
          (m) => m.accuracy >= criteria.minAccuracy!
        );
      }

      // Filter by age
      if (criteria.maxAge !== undefined) {
        const maxAgeMs = criteria.maxAge * 24 * 60 * 60 * 1000;
        const cutoffDate = new Date(Date.now() - maxAgeMs);
        models = models.filter((m) => m.createdAt >= cutoffDate);
      }

      // Filter by active status
      if (criteria.isActive !== undefined) {
        models = models.filter(
          (m) => m.isActive === criteria.isActive
        );
      }

      // Sort by accuracy (descending) and creation date (newest first)
      models.sort((a, b) => {
        if (a.accuracy !== b.accuracy) {
          return b.accuracy - a.accuracy;
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      this.logger.info('Model search completed', {
        criteria,
        resultsCount: models.length,
      });

      return models;
    } catch (error) {
      this.logger.error('Error searching models', {
        error: error instanceof Error ? error.message : String(error),
        criteria,
      });
      throw error;
    }
  }

  /**
   * Update model metadata
   */
  async updateModelMetadata(
    modelVersionId: string,
    updates: Partial<
      Omit<ModelMetadata, 'id' | 'modelVersionId' | 'createdAt'>
    >
  ): Promise<ModelMetadata> {
    try {
      const existingMetadata = this.modelMetadata.get(modelVersionId);
      if (!existingMetadata) {
        throw new Error(
          `Model metadata not found for version ${modelVersionId}`
        );
      }

      const updatedMetadata: ModelMetadata = {
        ...existingMetadata,
        ...updates,
        updatedAt: new Date(),
      };

      this.modelMetadata.set(modelVersionId, updatedMetadata);

      this.logger.info('Model metadata updated', {
        modelVersionId,
        updates: Object.keys(updates),
      });

      return updatedMetadata;
    } catch (error) {
      this.logger.error('Error updating model metadata', {
        error: error instanceof Error ? error.message : String(error),
        modelVersionId,
      });
      throw error;
    }
  }

  /**
   * Delete model version and all associated data
   */
  async deleteModel(modelVersionId: string): Promise<void> {
    try {
      const modelVersion = this.modelVersions.get(modelVersionId);
      if (!modelVersion) {
        throw new Error(`Model version ${modelVersionId} not found`);
      }

      if (modelVersion.isActive) {
        throw new Error(
          `Cannot delete active model version ${modelVersionId}`
        );
      }

      // Remove all associated data
      this.modelVersions.delete(modelVersionId);
      this.modelMetadata.delete(modelVersionId);
      this.modelLineage.delete(modelVersionId);
      this.modelArtifacts.delete(modelVersionId);

      this.logger.info('Model deleted', {
        modelVersionId,
        domain: modelVersion.domain,
      });
    } catch (error) {
      this.logger.error('Error deleting model', {
        error: error instanceof Error ? error.message : String(error),
        modelVersionId,
      });
      throw error;
    }
  }

  /**
   * Get model comparison data
   */
  async compareModels(modelVersionIds: string[]): Promise<{
    models: ModelVersion[];
    metadata: ModelMetadata[];
    comparison: {
      accuracyComparison: Record<string, number>;
      sizeComparison: Record<string, number>;
      ageComparison: Record<string, number>;
      frameworkComparison: Record<string, string>;
    };
  }> {
    try {
      const models: ModelVersion[] = [];
      const metadata: ModelMetadata[] = [];

      for (const versionId of modelVersionIds) {
        const model = this.modelVersions.get(versionId);
        const meta = this.modelMetadata.get(versionId);

        if (model && meta) {
          models.push(model);
          metadata.push(meta);
        }
      }

      const comparison = {
        accuracyComparison: models.reduce((acc, model) => {
          acc[model.id] = model.accuracy;
          return acc;
        }, {} as Record<string, number>),

        sizeComparison: models.reduce((acc, model) => {
          acc[model.id] = model.trainingDataSize;
          return acc;
        }, {} as Record<string, number>),

        ageComparison: models.reduce((acc, model) => {
          const ageInDays =
            (Date.now() - model.createdAt.getTime()) /
            (24 * 60 * 60 * 1000);
          acc[model.id] = Math.round(ageInDays);
          return acc;
        }, {} as Record<string, number>),

        frameworkComparison: metadata.reduce((acc, meta) => {
          acc[meta.modelVersionId] = meta.framework;
          return acc;
        }, {} as Record<string, string>),
      };

      this.logger.info('Model comparison generated', {
        modelCount: models.length,
        modelVersionIds,
      });

      return { models, metadata, comparison };
    } catch (error) {
      this.logger.error('Error comparing models', {
        error: error instanceof Error ? error.message : String(error),
        modelVersionIds,
      });
      throw error;
    }
  }

  /**
   * Get model usage statistics
   */
  async getModelStats(modelVersionId: string): Promise<{
    totalPredictions: number;
    averageResponseTime: number;
    errorRate: number;
    lastUsed: Date;
    popularityScore: number;
  }> {
    try {
      // Mock implementation - in production this would query actual usage data
      const model = this.modelVersions.get(modelVersionId);
      if (!model) {
        throw new Error(`Model version ${modelVersionId} not found`);
      }

      const stats = {
        totalPredictions: Math.floor(Math.random() * 10000) + 1000,
        averageResponseTime: Math.floor(Math.random() * 200) + 50,
        errorRate: Math.random() * 0.05,
        lastUsed: new Date(
          Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
        ),
        popularityScore: Math.random() * 100,
      };

      this.logger.info('Model stats retrieved', {
        modelVersionId,
        totalPredictions: stats.totalPredictions,
      });

      return stats;
    } catch (error) {
      this.logger.error('Error getting model stats', {
        error: error instanceof Error ? error.message : String(error),
        modelVersionId,
      });
      throw error;
    }
  }

  /**
   * List all model versions for a domain
   */
  async listModelsByDomain(domain: Domain): Promise<ModelVersion[]> {
    const models = Array.from(this.modelVersions.values())
      .filter((m) => m.domain === domain)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return models;
  }

  /**
   * Get model family tree (lineage chain)
   */
  async getModelFamilyTree(modelVersionId: string): Promise<{
    ancestors: ModelVersion[];
    descendants: ModelVersion[];
    root: ModelVersion | null;
  }> {
    try {
      const ancestors: ModelVersion[] = [];
      const descendants: ModelVersion[] = [];
      let root: ModelVersion | null = null;

      // Find ancestors
      let currentId = modelVersionId;
      while (currentId) {
        const lineage = this.modelLineage.get(currentId);
        if (lineage?.parentVersionId) {
          const parentModel = this.modelVersions.get(
            lineage.parentVersionId
          );
          if (parentModel) {
            ancestors.push(parentModel);
            currentId = lineage.parentVersionId;
          } else {
            break;
          }
        } else {
          const currentModel = this.modelVersions.get(currentId);
          if (currentModel) {
            root = currentModel;
          }
          break;
        }
      }

      // Find descendants
      const allLineages = Array.from(this.modelLineage.values());
      const findDescendants = (parentId: string) => {
        const children = allLineages.filter(
          (l) => l.parentVersionId === parentId
        );
        for (const child of children) {
          const childModel = this.modelVersions.get(
            child.modelVersionId
          );
          if (childModel) {
            descendants.push(childModel);
            findDescendants(child.modelVersionId);
          }
        }
      };

      findDescendants(modelVersionId);

      this.logger.info('Model family tree retrieved', {
        modelVersionId,
        ancestorsCount: ancestors.length,
        descendantsCount: descendants.length,
      });

      return { ancestors, descendants, root };
    } catch (error) {
      this.logger.error('Error getting model family tree', {
        error: error instanceof Error ? error.message : String(error),
        modelVersionId,
      });
      throw error;
    }
  }
}
