"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelRegistry = void 0;
const Logger_1 = require("../../utils/Logger");
class ModelRegistry {
    constructor() {
        this.modelVersions = new Map();
        this.modelArtifacts = new Map();
        this.modelMetadata = new Map();
        this.modelLineage = new Map();
        this.logger = new Logger_1.Logger('ModelRegistry');
    }
    /**
     * Register a new model version
     */
    async registerModel(modelVersion, metadata, lineage) {
        try {
            // Store model version
            this.modelVersions.set(modelVersion.id, modelVersion);
            // Store metadata
            const modelMetadata = {
                ...metadata,
                id: `metadata_${modelVersion.id}`,
                modelVersionId: modelVersion.id,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            this.modelMetadata.set(modelVersion.id, modelMetadata);
            // Store lineage
            const modelLineage = {
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
        }
        catch (error) {
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
    async uploadArtifact(modelVersionId, artifactData) {
        try {
            const artifactId = `artifact_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 9)}`;
            const artifact = {
                ...artifactData,
                id: artifactId,
                uploadedAt: new Date(),
            };
            const existingArtifacts = this.modelArtifacts.get(modelVersionId) || [];
            existingArtifacts.push(artifact);
            this.modelArtifacts.set(modelVersionId, existingArtifacts);
            this.logger.info('Artifact uploaded', {
                artifactId,
                modelVersionId,
                artifactType: artifact.artifactType,
                fileName: artifact.fileName,
            });
            return artifact;
        }
        catch (error) {
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
    async getModelVersion(modelVersionId) {
        return this.modelVersions.get(modelVersionId) || null;
    }
    /**
     * Get model metadata
     */
    async getModelMetadata(modelVersionId) {
        return this.modelMetadata.get(modelVersionId) || null;
    }
    /**
     * Get model lineage
     */
    async getModelLineage(modelVersionId) {
        return this.modelLineage.get(modelVersionId) || null;
    }
    /**
     * Get model artifacts
     */
    async getModelArtifacts(modelVersionId, artifactType) {
        const artifacts = this.modelArtifacts.get(modelVersionId) || [];
        if (artifactType) {
            return artifacts.filter((a) => a.artifactType === artifactType);
        }
        return artifacts;
    }
    /**
     * Search models by criteria
     */
    async searchModels(criteria) {
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
                    return metadata?.tags.some((tag) => criteria.tags.includes(tag));
                });
            }
            // Filter by minimum accuracy
            if (criteria.minAccuracy !== undefined) {
                models = models.filter((m) => m.accuracy >= criteria.minAccuracy);
            }
            // Filter by age
            if (criteria.maxAge !== undefined) {
                const maxAgeMs = criteria.maxAge * 24 * 60 * 60 * 1000;
                const cutoffDate = new Date(Date.now() - maxAgeMs);
                models = models.filter((m) => m.createdAt >= cutoffDate);
            }
            // Filter by active status
            if (criteria.isActive !== undefined) {
                models = models.filter((m) => m.isActive === criteria.isActive);
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
        }
        catch (error) {
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
    async updateModelMetadata(modelVersionId, updates) {
        try {
            const existingMetadata = this.modelMetadata.get(modelVersionId);
            if (!existingMetadata) {
                throw new Error(`Model metadata not found for version ${modelVersionId}`);
            }
            const updatedMetadata = {
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
        }
        catch (error) {
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
    async deleteModel(modelVersionId) {
        try {
            const modelVersion = this.modelVersions.get(modelVersionId);
            if (!modelVersion) {
                throw new Error(`Model version ${modelVersionId} not found`);
            }
            if (modelVersion.isActive) {
                throw new Error(`Cannot delete active model version ${modelVersionId}`);
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
        }
        catch (error) {
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
    async compareModels(modelVersionIds) {
        try {
            const models = [];
            const metadata = [];
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
                }, {}),
                sizeComparison: models.reduce((acc, model) => {
                    acc[model.id] = model.trainingDataSize;
                    return acc;
                }, {}),
                ageComparison: models.reduce((acc, model) => {
                    const ageInDays = (Date.now() - model.createdAt.getTime()) /
                        (24 * 60 * 60 * 1000);
                    acc[model.id] = Math.round(ageInDays);
                    return acc;
                }, {}),
                frameworkComparison: metadata.reduce((acc, meta) => {
                    acc[meta.modelVersionId] = meta.framework;
                    return acc;
                }, {}),
            };
            this.logger.info('Model comparison generated', {
                modelCount: models.length,
                modelVersionIds,
            });
            return { models, metadata, comparison };
        }
        catch (error) {
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
    async getModelStats(modelVersionId) {
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
                lastUsed: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
                popularityScore: Math.random() * 100,
            };
            this.logger.info('Model stats retrieved', {
                modelVersionId,
                totalPredictions: stats.totalPredictions,
            });
            return stats;
        }
        catch (error) {
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
    async listModelsByDomain(domain) {
        const models = Array.from(this.modelVersions.values())
            .filter((m) => m.domain === domain)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return models;
    }
    /**
     * Get model family tree (lineage chain)
     */
    async getModelFamilyTree(modelVersionId) {
        try {
            const ancestors = [];
            const descendants = [];
            let root = null;
            // Find ancestors
            let currentId = modelVersionId;
            while (currentId) {
                const lineage = this.modelLineage.get(currentId);
                if (lineage?.parentVersionId) {
                    const parentModel = this.modelVersions.get(lineage.parentVersionId);
                    if (parentModel) {
                        ancestors.push(parentModel);
                        currentId = lineage.parentVersionId;
                    }
                    else {
                        break;
                    }
                }
                else {
                    const currentModel = this.modelVersions.get(currentId);
                    if (currentModel) {
                        root = currentModel;
                    }
                    break;
                }
            }
            // Find descendants
            const allLineages = Array.from(this.modelLineage.values());
            const findDescendants = (parentId) => {
                const children = allLineages.filter((l) => l.parentVersionId === parentId);
                for (const child of children) {
                    const childModel = this.modelVersions.get(child.modelVersionId);
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
        }
        catch (error) {
            this.logger.error('Error getting model family tree', {
                error: error instanceof Error ? error.message : String(error),
                modelVersionId,
            });
            throw error;
        }
    }
}
exports.ModelRegistry = ModelRegistry;
//# sourceMappingURL=ModelRegistry.js.map