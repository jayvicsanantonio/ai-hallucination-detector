import { FeedbackData } from '../../models/audit/FeedbackData';
import { Domain } from '../../models/core/ContentTypes';
export interface TrainingData {
    input: string;
    expectedOutput: any;
    feedback: FeedbackData;
    domain: Domain;
    timestamp: Date;
}
export interface ModelVersion {
    id: string;
    version: string;
    domain: Domain;
    accuracy: number;
    trainingDataSize: number;
    createdAt: Date;
    isActive: boolean;
    modelPath: string;
    metadata: {
        hyperparameters: Record<string, any>;
        trainingMetrics: Record<string, number>;
        validationMetrics: Record<string, number>;
    };
}
export interface TrainingJob {
    id: string;
    domain: Domain;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
    modelVersion?: ModelVersion;
}
export interface ABTestConfig {
    id: string;
    name: string;
    description: string;
    modelVersionA: string;
    modelVersionB: string;
    trafficSplit: number;
    startDate: Date;
    endDate?: Date;
    isActive: boolean;
    metrics: {
        modelA: {
            accuracy: number;
            responseTime: number;
            userSatisfaction: number;
        };
        modelB: {
            accuracy: number;
            responseTime: number;
            userSatisfaction: number;
        };
    };
}
export declare class MLModelTrainer {
    private logger;
    private trainingJobs;
    private modelVersions;
    private abTests;
    constructor();
    /**
     * Start training a new model version using collected feedback
     */
    startTraining(options: {
        domain: Domain;
        trainingData: TrainingData[];
        hyperparameters?: Record<string, any>;
        validationSplit?: number;
    }): Promise<TrainingJob>;
    /**
     * Get training job status
     */
    getTrainingJob(jobId: string): Promise<TrainingJob | null>;
    /**
     * List all model versions for a domain
     */
    getModelVersions(domain?: Domain): Promise<ModelVersion[]>;
    /**
     * Get the active model version for a domain
     */
    getActiveModelVersion(domain: Domain): Promise<ModelVersion | null>;
    /**
     * Deploy a model version (make it active)
     */
    deployModelVersion(versionId: string): Promise<void>;
    /**
     * Create A/B test configuration
     */
    createABTest(config: Omit<ABTestConfig, 'id' | 'metrics'>): Promise<ABTestConfig>;
    /**
     * Get A/B test results
     */
    getABTestResults(testId: string): Promise<ABTestConfig | null>;
    /**
     * Update A/B test metrics
     */
    updateABTestMetrics(testId: string, modelVersion: 'A' | 'B', metrics: {
        accuracy?: number;
        responseTime?: number;
        userSatisfaction?: number;
    }): Promise<void>;
    /**
     * Execute the actual training process
     */
    private executeTraining;
    /**
     * Prepare training and validation datasets
     */
    private prepareTrainingData;
    /**
     * Initialize ML model (mock implementation)
     */
    private initializeModel;
    /**
     * Train the model (mock implementation)
     */
    private trainModel;
    /**
     * Validate the model (mock implementation)
     */
    private validateModel;
    /**
     * Save the trained model (mock implementation)
     */
    private saveModel;
}
//# sourceMappingURL=MLModelTrainer.d.ts.map