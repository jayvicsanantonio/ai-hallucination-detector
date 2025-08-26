import { TrainingData } from './MLModelTrainer';
import { FeedbackData } from '../../models/audit/FeedbackData';
import { Domain } from '../../models/core/ContentTypes';
export interface DatasetVersion {
    id: string;
    name: string;
    domain: Domain;
    version: string;
    description?: string;
    size: number;
    createdAt: Date;
    createdBy: string;
    tags: string[];
    metadata: {
        qualityScore: number;
        balanceScore: number;
        diversityScore: number;
        completenessScore: number;
    };
    splits: {
        training: number;
        validation: number;
        test: number;
    };
    dataPath: string;
    checksums: {
        training: string;
        validation: string;
        test: string;
    };
}
export interface DataQualityReport {
    datasetVersionId: string;
    overallScore: number;
    issues: DataQualityIssue[];
    recommendations: string[];
    metrics: {
        duplicateRate: number;
        missingValueRate: number;
        outlierRate: number;
        labelDistribution: Record<string, number>;
        averageTextLength: number;
        vocabularySize: number;
    };
    generatedAt: Date;
}
export interface DataQualityIssue {
    type: 'duplicate' | 'missing_value' | 'outlier' | 'imbalanced' | 'inconsistent';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedSamples: number;
    suggestedAction: string;
}
export interface DataAugmentationConfig {
    enabled: boolean;
    techniques: {
        synonymReplacement?: {
            probability: number;
            maxReplacements: number;
        };
        randomInsertion?: {
            probability: number;
            maxInsertions: number;
        };
        randomSwap?: {
            probability: number;
            maxSwaps: number;
        };
        randomDeletion?: {
            probability: number;
        };
        backTranslation?: {
            enabled: boolean;
            languages: string[];
        };
        paraphrasing?: {
            enabled: boolean;
            model: string;
        };
    };
    targetMultiplier: number;
}
export interface DataPreprocessingConfig {
    textNormalization: {
        lowercase: boolean;
        removeSpecialChars: boolean;
        removeStopwords: boolean;
        stemming: boolean;
        lemmatization: boolean;
    };
    tokenization: {
        maxLength: number;
        padding: 'max_length' | 'longest' | 'do_not_pad';
        truncation: boolean;
    };
    encoding: {
        method: 'bert' | 'word2vec' | 'tfidf' | 'one_hot';
        modelName?: string;
        dimensions?: number;
    };
}
export declare class TrainingDataManager {
    private logger;
    private datasetVersions;
    private qualityReports;
    private cachedDatasets;
    constructor();
    /**
     * Create a new dataset version from feedback data
     */
    createDatasetVersion(name: string, domain: Domain, feedbackData: FeedbackData[], options: {
        description?: string;
        tags?: string[];
        createdBy: string;
        splits?: {
            training: number;
            validation: number;
            test: number;
        };
        preprocessingConfig?: DataPreprocessingConfig;
        augmentationConfig?: DataAugmentationConfig;
    }): Promise<DatasetVersion>;
    /**
     * Get dataset version by ID
     */
    getDatasetVersion(versionId: string): Promise<DatasetVersion | null>;
    /**
     * Get training data for a dataset version and split
     */
    getTrainingData(versionId: string, split: 'training' | 'validation' | 'test'): Promise<TrainingData[]>;
    /**
     * List dataset versions
     */
    listDatasetVersions(options?: {
        domain?: Domain;
        tags?: string[];
        minQualityScore?: number;
        limit?: number;
    }): Promise<DatasetVersion[]>;
    /**
     * Generate data quality report
     */
    generateQualityReport(datasetVersionId: string, trainingData: TrainingData[]): Promise<DataQualityReport>;
    /**
     * Get quality report for a dataset version
     */
    getQualityReport(datasetVersionId: string): Promise<DataQualityReport | null>;
    /**
     * Validate dataset for training
     */
    validateDataset(datasetVersionId: string, requirements: {
        minSize: number;
        minQualityScore: number;
        maxImbalanceRatio: number;
        requiredFields: string[];
    }): Promise<{
        isValid: boolean;
        issues: string[];
    }>;
    /**
     * Convert feedback data to training data format
     */
    private convertFeedbackToTrainingData;
    /**
     * Preprocess training data
     */
    private preprocessData;
    /**
     * Augment training data
     */
    private augmentData;
    /**
     * Split data into training, validation, and test sets
     */
    private splitData;
    /**
     * Calculate quality metrics for the dataset
     */
    private calculateQualityMetrics;
    /**
     * Helper methods for quality assessment
     */
    private findDuplicates;
    private findMissingValues;
    private calculateLabelDistribution;
    private checkLabelBalance;
    private calculateOutlierRate;
    private calculateAverageTextLength;
    private calculateVocabularySize;
    private calculateBalanceScore;
    private calculateDiversityScore;
    private calculateCompletenessScore;
    private calculateOverallQualityScore;
    private calculateChecksum;
    private preprocessText;
    private augmentSample;
}
//# sourceMappingURL=TrainingDataManager.d.ts.map