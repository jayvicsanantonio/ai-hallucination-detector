import { ModelVersion } from './MLModelTrainer';
import { Domain } from '../../models/core/ContentTypes';
export interface ModelArtifact {
    id: string;
    modelVersionId: string;
    artifactType: 'model_file' | 'weights' | 'config' | 'metadata' | 'training_data';
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
    framework: string;
    modelType: string;
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
    maxAge?: number;
    isActive?: boolean;
}
export declare class ModelRegistry {
    private logger;
    private modelVersions;
    private modelArtifacts;
    private modelMetadata;
    private modelLineage;
    constructor();
    /**
     * Register a new model version
     */
    registerModel(modelVersion: ModelVersion, metadata: Omit<ModelMetadata, 'id' | 'modelVersionId' | 'createdAt' | 'updatedAt'>, lineage: Omit<ModelLineage, 'modelVersionId' | 'createdAt'>): Promise<void>;
    /**
     * Upload model artifact
     */
    uploadArtifact(modelVersionId: string, artifactData: Omit<ModelArtifact, 'id' | 'uploadedAt'>): Promise<ModelArtifact>;
    /**
     * Get model version by ID
     */
    getModelVersion(modelVersionId: string): Promise<ModelVersion | null>;
    /**
     * Get model metadata
     */
    getModelMetadata(modelVersionId: string): Promise<ModelMetadata | null>;
    /**
     * Get model lineage
     */
    getModelLineage(modelVersionId: string): Promise<ModelLineage | null>;
    /**
     * Get model artifacts
     */
    getModelArtifacts(modelVersionId: string, artifactType?: ModelArtifact['artifactType']): Promise<ModelArtifact[]>;
    /**
     * Search models by criteria
     */
    searchModels(criteria: ModelSearchCriteria): Promise<ModelVersion[]>;
    /**
     * Update model metadata
     */
    updateModelMetadata(modelVersionId: string, updates: Partial<Omit<ModelMetadata, 'id' | 'modelVersionId' | 'createdAt'>>): Promise<ModelMetadata>;
    /**
     * Delete model version and all associated data
     */
    deleteModel(modelVersionId: string): Promise<void>;
    /**
     * Get model comparison data
     */
    compareModels(modelVersionIds: string[]): Promise<{
        models: ModelVersion[];
        metadata: ModelMetadata[];
        comparison: {
            accuracyComparison: Record<string, number>;
            sizeComparison: Record<string, number>;
            ageComparison: Record<string, number>;
            frameworkComparison: Record<string, string>;
        };
    }>;
    /**
     * Get model usage statistics
     */
    getModelStats(modelVersionId: string): Promise<{
        totalPredictions: number;
        averageResponseTime: number;
        errorRate: number;
        lastUsed: Date;
        popularityScore: number;
    }>;
    /**
     * List all model versions for a domain
     */
    listModelsByDomain(domain: Domain): Promise<ModelVersion[]>;
    /**
     * Get model family tree (lineage chain)
     */
    getModelFamilyTree(modelVersionId: string): Promise<{
        ancestors: ModelVersion[];
        descendants: ModelVersion[];
        root: ModelVersion | null;
    }>;
}
//# sourceMappingURL=ModelRegistry.d.ts.map