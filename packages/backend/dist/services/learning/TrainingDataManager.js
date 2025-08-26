"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrainingDataManager = void 0;
const Logger_1 = require("../../utils/Logger");
class TrainingDataManager {
    constructor() {
        this.datasetVersions = new Map();
        this.qualityReports = new Map();
        this.cachedDatasets = new Map();
        this.logger = new Logger_1.Logger('TrainingDataManager');
    }
    /**
     * Create a new dataset version from feedback data
     */
    async createDatasetVersion(name, domain, feedbackData, options) {
        try {
            const versionId = `dataset_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 9)}`;
            const version = `v${Date.now()}`;
            // Convert feedback data to training data
            let trainingData = this.convertFeedbackToTrainingData(feedbackData, domain);
            // Apply preprocessing if configured
            if (options.preprocessingConfig) {
                trainingData = await this.preprocessData(trainingData, options.preprocessingConfig);
            }
            // Apply data augmentation if configured
            if (options.augmentationConfig?.enabled) {
                trainingData = await this.augmentData(trainingData, options.augmentationConfig);
            }
            // Split data
            const splits = options.splits || {
                training: 0.7,
                validation: 0.15,
                test: 0.15,
            };
            const { trainingSplit, validationSplit, testSplit } = this.splitData(trainingData, splits);
            // Calculate quality metrics
            const qualityMetrics = await this.calculateQualityMetrics(trainingData);
            // Create dataset version
            const datasetVersion = {
                id: versionId,
                name,
                domain,
                version,
                description: options.description,
                size: trainingData.length,
                createdAt: new Date(),
                createdBy: options.createdBy,
                tags: options.tags || [],
                metadata: qualityMetrics,
                splits,
                dataPath: `/datasets/${domain}/${versionId}`,
                checksums: {
                    training: this.calculateChecksum(trainingSplit),
                    validation: this.calculateChecksum(validationSplit),
                    test: this.calculateChecksum(testSplit),
                },
            };
            // Store dataset version
            this.datasetVersions.set(versionId, datasetVersion);
            // Cache the processed data
            this.cachedDatasets.set(`${versionId}_training`, trainingSplit);
            this.cachedDatasets.set(`${versionId}_validation`, validationSplit);
            this.cachedDatasets.set(`${versionId}_test`, testSplit);
            // Generate quality report
            await this.generateQualityReport(versionId, trainingData);
            this.logger.info('Dataset version created', {
                versionId,
                name,
                domain,
                size: trainingData.length,
                qualityScore: qualityMetrics.qualityScore,
            });
            return datasetVersion;
        }
        catch (error) {
            this.logger.error('Error creating dataset version', {
                error: error instanceof Error ? error.message : String(error),
                name,
                domain,
            });
            throw error;
        }
    }
    /**
     * Get dataset version by ID
     */
    async getDatasetVersion(versionId) {
        return this.datasetVersions.get(versionId) || null;
    }
    /**
     * Get training data for a dataset version and split
     */
    async getTrainingData(versionId, split) {
        const cacheKey = `${versionId}_${split}`;
        const cachedData = this.cachedDatasets.get(cacheKey);
        if (cachedData) {
            return cachedData;
        }
        // In production, this would load from persistent storage
        throw new Error(`Training data not found for dataset ${versionId}, split ${split}`);
    }
    /**
     * List dataset versions
     */
    async listDatasetVersions(options) {
        let versions = Array.from(this.datasetVersions.values());
        // Apply filters
        if (options?.domain) {
            versions = versions.filter((v) => v.domain === options.domain);
        }
        if (options?.tags && options.tags.length > 0) {
            versions = versions.filter((v) => options.tags.some((tag) => v.tags.includes(tag)));
        }
        if (options?.minQualityScore !== undefined) {
            versions = versions.filter((v) => v.metadata.qualityScore >= options.minQualityScore);
        }
        // Sort by creation date (newest first)
        versions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        // Apply limit
        if (options?.limit) {
            versions = versions.slice(0, options.limit);
        }
        return versions;
    }
    /**
     * Generate data quality report
     */
    async generateQualityReport(datasetVersionId, trainingData) {
        try {
            const issues = [];
            const recommendations = [];
            // Check for duplicates
            const duplicates = this.findDuplicates(trainingData);
            if (duplicates.length > 0) {
                issues.push({
                    type: 'duplicate',
                    severity: duplicates.length > trainingData.length * 0.1
                        ? 'high'
                        : 'medium',
                    description: `Found ${duplicates.length} duplicate samples`,
                    affectedSamples: duplicates.length,
                    suggestedAction: 'Remove duplicate samples to improve model generalization',
                });
                recommendations.push('Remove duplicate samples before training');
            }
            // Check for missing values
            const missingValues = this.findMissingValues(trainingData);
            if (missingValues > 0) {
                issues.push({
                    type: 'missing_value',
                    severity: missingValues > trainingData.length * 0.05
                        ? 'high'
                        : 'low',
                    description: `Found ${missingValues} samples with missing values`,
                    affectedSamples: missingValues,
                    suggestedAction: 'Impute or remove samples with missing values',
                });
            }
            // Check label distribution
            const labelDistribution = this.calculateLabelDistribution(trainingData);
            const isImbalanced = this.checkLabelBalance(labelDistribution);
            if (isImbalanced) {
                issues.push({
                    type: 'imbalanced',
                    severity: 'medium',
                    description: 'Dataset has imbalanced label distribution',
                    affectedSamples: trainingData.length,
                    suggestedAction: 'Consider data augmentation or resampling techniques',
                });
                recommendations.push('Apply data balancing techniques');
            }
            // Calculate metrics
            const metrics = {
                duplicateRate: duplicates.length / trainingData.length,
                missingValueRate: missingValues / trainingData.length,
                outlierRate: this.calculateOutlierRate(trainingData),
                labelDistribution,
                averageTextLength: this.calculateAverageTextLength(trainingData),
                vocabularySize: this.calculateVocabularySize(trainingData),
            };
            // Calculate overall score
            const overallScore = this.calculateOverallQualityScore(issues, metrics);
            const qualityReport = {
                datasetVersionId,
                overallScore,
                issues,
                recommendations,
                metrics,
                generatedAt: new Date(),
            };
            this.qualityReports.set(datasetVersionId, qualityReport);
            this.logger.info('Quality report generated', {
                datasetVersionId,
                overallScore,
                issuesCount: issues.length,
            });
            return qualityReport;
        }
        catch (error) {
            this.logger.error('Error generating quality report', {
                error: error instanceof Error ? error.message : String(error),
                datasetVersionId,
            });
            throw error;
        }
    }
    /**
     * Get quality report for a dataset version
     */
    async getQualityReport(datasetVersionId) {
        return this.qualityReports.get(datasetVersionId) || null;
    }
    /**
     * Validate dataset for training
     */
    async validateDataset(datasetVersionId, requirements) {
        try {
            const dataset = this.datasetVersions.get(datasetVersionId);
            const qualityReport = this.qualityReports.get(datasetVersionId);
            const issues = [];
            if (!dataset) {
                return { isValid: false, issues: ['Dataset not found'] };
            }
            if (!qualityReport) {
                return {
                    isValid: false,
                    issues: ['Quality report not available'],
                };
            }
            // Check minimum size
            if (dataset.size < requirements.minSize) {
                issues.push(`Dataset size (${dataset.size}) is below minimum requirement (${requirements.minSize})`);
            }
            // Check quality score
            if (dataset.metadata.qualityScore < requirements.minQualityScore) {
                issues.push(`Quality score (${dataset.metadata.qualityScore}) is below minimum requirement (${requirements.minQualityScore})`);
            }
            // Check label balance
            const maxRatio = Math.max(...Object.values(qualityReport.metrics.labelDistribution));
            const minRatio = Math.min(...Object.values(qualityReport.metrics.labelDistribution));
            const imbalanceRatio = maxRatio / minRatio;
            if (imbalanceRatio > requirements.maxImbalanceRatio) {
                issues.push(`Label imbalance ratio (${imbalanceRatio.toFixed(2)}) exceeds maximum allowed (${requirements.maxImbalanceRatio})`);
            }
            // Check for critical issues
            const criticalIssues = qualityReport.issues.filter((issue) => issue.severity === 'critical');
            if (criticalIssues.length > 0) {
                issues.push(`Dataset has ${criticalIssues.length} critical quality issues`);
            }
            const isValid = issues.length === 0;
            this.logger.info('Dataset validation completed', {
                datasetVersionId,
                isValid,
                issuesCount: issues.length,
            });
            return { isValid, issues };
        }
        catch (error) {
            this.logger.error('Error validating dataset', {
                error: error instanceof Error ? error.message : String(error),
                datasetVersionId,
            });
            throw error;
        }
    }
    /**
     * Convert feedback data to training data format
     */
    convertFeedbackToTrainingData(feedbackData, domain) {
        return feedbackData.map((feedback) => ({
            input: feedback.originalContent || '',
            expectedOutput: feedback.corrections || feedback.userFeedback,
            feedback,
            domain,
            timestamp: feedback.timestamp,
        }));
    }
    /**
     * Preprocess training data
     */
    async preprocessData(data, config) {
        // Mock preprocessing implementation
        // In production, this would apply actual text preprocessing
        return data.map((item) => ({
            ...item,
            input: this.preprocessText(item.input, config.textNormalization),
        }));
    }
    /**
     * Augment training data
     */
    async augmentData(data, config) {
        const augmentedData = [...data];
        const targetSize = Math.floor(data.length * config.targetMultiplier);
        while (augmentedData.length < targetSize) {
            const originalItem = data[Math.floor(Math.random() * data.length)];
            const augmentedItem = await this.augmentSample(originalItem, config);
            augmentedData.push(augmentedItem);
        }
        return augmentedData;
    }
    /**
     * Split data into training, validation, and test sets
     */
    splitData(data, splits) {
        // Shuffle data
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        const trainingSize = Math.floor(shuffled.length * splits.training);
        const validationSize = Math.floor(shuffled.length * splits.validation);
        return {
            trainingSplit: shuffled.slice(0, trainingSize),
            validationSplit: shuffled.slice(trainingSize, trainingSize + validationSize),
            testSplit: shuffled.slice(trainingSize + validationSize),
        };
    }
    /**
     * Calculate quality metrics for the dataset
     */
    async calculateQualityMetrics(data) {
        const labelDistribution = this.calculateLabelDistribution(data);
        const balanceScore = this.calculateBalanceScore(labelDistribution);
        const diversityScore = this.calculateDiversityScore(data);
        const completenessScore = this.calculateCompletenessScore(data);
        // Overall quality score is weighted average
        const qualityScore = balanceScore * 0.3 +
            diversityScore * 0.3 +
            completenessScore * 0.4;
        return {
            qualityScore,
            balanceScore,
            diversityScore,
            completenessScore,
        };
    }
    /**
     * Helper methods for quality assessment
     */
    findDuplicates(data) {
        const seen = new Set();
        const duplicates = [];
        for (const item of data) {
            const key = `${item.input}_${JSON.stringify(item.expectedOutput)}`;
            if (seen.has(key)) {
                duplicates.push(item);
            }
            else {
                seen.add(key);
            }
        }
        return duplicates;
    }
    findMissingValues(data) {
        return data.filter((item) => !item.input ||
            item.input.trim().length === 0 ||
            !item.expectedOutput).length;
    }
    calculateLabelDistribution(data) {
        const distribution = {};
        for (const item of data) {
            const label = String(item.expectedOutput);
            distribution[label] = (distribution[label] || 0) + 1;
        }
        // Convert to percentages
        const total = data.length;
        for (const label in distribution) {
            distribution[label] = distribution[label] / total;
        }
        return distribution;
    }
    checkLabelBalance(distribution) {
        const values = Object.values(distribution);
        const max = Math.max(...values);
        const min = Math.min(...values);
        return max / min > 3; // Consider imbalanced if ratio > 3:1
    }
    calculateOutlierRate(data) {
        // Simple outlier detection based on text length
        const lengths = data.map((item) => item.input.length);
        const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
        const std = Math.sqrt(lengths.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
            lengths.length);
        const outliers = lengths.filter((length) => Math.abs(length - mean) > 2 * std);
        return outliers.length / lengths.length;
    }
    calculateAverageTextLength(data) {
        const totalLength = data.reduce((sum, item) => sum + item.input.length, 0);
        return totalLength / data.length;
    }
    calculateVocabularySize(data) {
        const vocabulary = new Set();
        for (const item of data) {
            const words = item.input.toLowerCase().split(/\s+/);
            words.forEach((word) => vocabulary.add(word));
        }
        return vocabulary.size;
    }
    calculateBalanceScore(distribution) {
        const values = Object.values(distribution);
        if (values.length <= 1)
            return 1.0;
        const max = Math.max(...values);
        const min = Math.min(...values);
        return Math.max(0, 1 - (max - min));
    }
    calculateDiversityScore(data) {
        const vocabularySize = this.calculateVocabularySize(data);
        const averageLength = this.calculateAverageTextLength(data);
        // Normalize based on dataset size and average text length
        const diversityScore = Math.min(1.0, vocabularySize / (data.length * averageLength * 0.1));
        return diversityScore;
    }
    calculateCompletenessScore(data) {
        const missingValues = this.findMissingValues(data);
        return Math.max(0, 1 - missingValues / data.length);
    }
    calculateOverallQualityScore(issues, metrics) {
        let score = 1.0;
        // Deduct points for issues
        for (const issue of issues) {
            switch (issue.severity) {
                case 'critical':
                    score -= 0.3;
                    break;
                case 'high':
                    score -= 0.2;
                    break;
                case 'medium':
                    score -= 0.1;
                    break;
                case 'low':
                    score -= 0.05;
                    break;
            }
        }
        // Adjust based on metrics
        score -= metrics.duplicateRate * 0.2;
        score -= metrics.missingValueRate * 0.3;
        score -= metrics.outlierRate * 0.1;
        return Math.max(0, Math.min(1, score));
    }
    calculateChecksum(data) {
        // Simple checksum calculation
        const content = JSON.stringify(data.map((item) => ({
            input: item.input,
            output: item.expectedOutput,
        })));
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }
    preprocessText(text, config) {
        let processed = text;
        if (config.lowercase) {
            processed = processed.toLowerCase();
        }
        if (config.removeSpecialChars) {
            processed = processed.replace(/[^\w\s]/g, '');
        }
        // Additional preprocessing would be implemented here
        return processed;
    }
    async augmentSample(sample, config) {
        // Mock augmentation - in production this would use actual NLP techniques
        let augmentedInput = sample.input;
        if (config.techniques.synonymReplacement) {
            // Simple word replacement simulation
            const words = augmentedInput.split(' ');
            const numReplacements = Math.min(config.techniques.synonymReplacement.maxReplacements, Math.floor(words.length *
                config.techniques.synonymReplacement.probability));
            for (let i = 0; i < numReplacements; i++) {
                const randomIndex = Math.floor(Math.random() * words.length);
                words[randomIndex] = words[randomIndex] + '_syn'; // Mock synonym
            }
            augmentedInput = words.join(' ');
        }
        return {
            ...sample,
            input: augmentedInput,
        };
    }
}
exports.TrainingDataManager = TrainingDataManager;
//# sourceMappingURL=TrainingDataManager.js.map