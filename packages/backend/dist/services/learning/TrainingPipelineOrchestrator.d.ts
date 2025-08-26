import { MLModelTrainer } from './MLModelTrainer';
import { ModelVersionManager } from './ModelVersionManager';
import { ModelPerformanceMonitor } from './ModelPerformanceMonitor';
import { FeedbackService } from './FeedbackService';
import { Domain } from '../../models/core/ContentTypes';
export interface PipelineConfig {
    id: string;
    name: string;
    domain: Domain;
    schedule: 'manual' | 'daily' | 'weekly' | 'monthly';
    autoDeployment: boolean;
    trainingDataMinSize: number;
    performanceThreshold: {
        accuracy: number;
        precision: number;
        recall: number;
    };
    hyperparameters: Record<string, any>;
    validationSplit: number;
    abTestConfig?: {
        enabled: boolean;
        trafficSplit: number;
        duration: number;
    };
}
export interface PipelineRun {
    id: string;
    pipelineConfigId: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    startedAt: Date;
    completedAt?: Date;
    stages: {
        dataPreparation: PipelineStage;
        training: PipelineStage;
        validation: PipelineStage;
        deployment: PipelineStage;
        abTesting?: PipelineStage;
    };
    results?: {
        trainingJobId: string;
        modelVersionId: string;
        deploymentId?: string;
        abTestId?: string;
        metrics: Record<string, number>;
    };
    error?: string;
}
export interface PipelineStage {
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    startedAt?: Date;
    completedAt?: Date;
    duration?: number;
    error?: string;
    metadata?: Record<string, unknown>;
}
export declare class TrainingPipelineOrchestrator {
    private logger;
    private mlTrainer;
    private versionManager;
    private performanceMonitor;
    private feedbackService;
    private pipelineConfigs;
    private pipelineRuns;
    private scheduledPipelines;
    constructor(mlTrainer: MLModelTrainer, versionManager: ModelVersionManager, performanceMonitor: ModelPerformanceMonitor, feedbackService: FeedbackService);
    /**
     * Create a new training pipeline configuration
     */
    createPipelineConfig(config: Omit<PipelineConfig, 'id'>): Promise<PipelineConfig>;
    /**
     * Execute a training pipeline
     */
    executePipeline(pipelineConfigId: string): Promise<PipelineRun>;
    /**
     * Get pipeline run status
     */
    getPipelineRun(runId: string): Promise<PipelineRun | null>;
    /**
     * List pipeline configurations
     */
    listPipelineConfigs(domain?: Domain): Promise<PipelineConfig[]>;
    /**
     * List pipeline runs
     */
    listPipelineRuns(options?: {
        pipelineConfigId?: string;
        status?: string;
        limit?: number;
    }): Promise<PipelineRun[]>;
    /**
     * Cancel a running pipeline
     */
    cancelPipeline(runId: string): Promise<void>;
    /**
     * Update pipeline configuration
     */
    updatePipelineConfig(pipelineId: string, updates: Partial<Omit<PipelineConfig, 'id'>>): Promise<PipelineConfig>;
    /**
     * Execute pipeline stages sequentially
     */
    private executePipelineStages;
    /**
     * Execute data preparation stage
     */
    private executeDataPreparation;
    /**
     * Execute training stage
     */
    private executeTraining;
    /**
     * Execute validation stage
     */
    private executeValidation;
    /**
     * Execute deployment stage
     */
    private executeDeployment;
    /**
     * Execute A/B testing stage
     */
    private executeABTesting;
    /**
     * Schedule pipeline execution
     */
    private schedulePipeline;
    /**
     * Unschedule pipeline execution
     */
    private unschedulePipeline;
    /**
     * Clean up all scheduled pipelines (for testing cleanup)
     */
    cleanup(): void;
    /**
     * Calculate data quality score
     */
    private calculateDataQualityScore;
}
//# sourceMappingURL=TrainingPipelineOrchestrator.d.ts.map