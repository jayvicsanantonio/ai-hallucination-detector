"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrainingPipelineOrchestrator = void 0;
const Logger_1 = require("../../utils/Logger");
class TrainingPipelineOrchestrator {
    constructor(mlTrainer, versionManager, performanceMonitor, feedbackService) {
        this.pipelineConfigs = new Map();
        this.pipelineRuns = new Map();
        this.scheduledPipelines = new Map();
        this.logger = new Logger_1.Logger('TrainingPipelineOrchestrator');
        this.mlTrainer = mlTrainer;
        this.versionManager = versionManager;
        this.performanceMonitor = performanceMonitor;
        this.feedbackService = feedbackService;
    }
    /**
     * Create a new training pipeline configuration
     */
    async createPipelineConfig(config) {
        try {
            const pipelineId = `pipeline_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 9)}`;
            const pipelineConfig = {
                ...config,
                id: pipelineId,
            };
            this.pipelineConfigs.set(pipelineId, pipelineConfig);
            // Schedule pipeline if not manual
            if (config.schedule !== 'manual') {
                this.schedulePipeline(pipelineConfig);
            }
            this.logger.info('Pipeline configuration created', {
                pipelineId,
                domain: config.domain,
                schedule: config.schedule,
            });
            return pipelineConfig;
        }
        catch (error) {
            this.logger.error('Error creating pipeline config', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Execute a training pipeline
     */
    async executePipeline(pipelineConfigId) {
        try {
            const config = this.pipelineConfigs.get(pipelineConfigId);
            if (!config) {
                throw new Error(`Pipeline configuration ${pipelineConfigId} not found`);
            }
            const runId = `run_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 9)}`;
            const pipelineRun = {
                id: runId,
                pipelineConfigId,
                status: 'pending',
                startedAt: new Date(),
                stages: {
                    dataPreparation: {
                        name: 'Data Preparation',
                        status: 'pending',
                    },
                    training: { name: 'Model Training', status: 'pending' },
                    validation: { name: 'Model Validation', status: 'pending' },
                    deployment: { name: 'Model Deployment', status: 'pending' },
                },
            };
            if (config.abTestConfig?.enabled) {
                pipelineRun.stages.abTesting = {
                    name: 'A/B Testing',
                    status: 'pending',
                };
            }
            this.pipelineRuns.set(runId, pipelineRun);
            this.logger.info('Starting pipeline execution', {
                runId,
                pipelineConfigId,
                domain: config.domain,
            });
            // Execute pipeline asynchronously with a small delay
            setTimeout(() => {
                this.executePipelineStages(runId, config).catch((error) => {
                    this.logger.error('Pipeline execution failed', {
                        runId,
                        error: error instanceof Error ? error.message : String(error),
                    });
                    const run = this.pipelineRuns.get(runId);
                    if (run) {
                        run.status = 'failed';
                        run.error =
                            error instanceof Error ? error.message : String(error);
                        run.completedAt = new Date();
                    }
                });
            }, 10); // Small delay to allow test to check initial status
            return pipelineRun;
        }
        catch (error) {
            this.logger.error('Error executing pipeline', {
                error: error instanceof Error ? error.message : String(error),
                pipelineConfigId,
            });
            throw error;
        }
    }
    /**
     * Get pipeline run status
     */
    async getPipelineRun(runId) {
        return this.pipelineRuns.get(runId) || null;
    }
    /**
     * List pipeline configurations
     */
    async listPipelineConfigs(domain) {
        const configs = Array.from(this.pipelineConfigs.values());
        return domain
            ? configs.filter((c) => c.domain === domain)
            : configs;
    }
    /**
     * List pipeline runs
     */
    async listPipelineRuns(options) {
        let runs = Array.from(this.pipelineRuns.values());
        if (options?.pipelineConfigId) {
            runs = runs.filter((r) => r.pipelineConfigId === options.pipelineConfigId);
        }
        if (options?.status) {
            runs = runs.filter((r) => r.status === options.status);
        }
        // Sort by start time (newest first)
        runs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
        if (options?.limit) {
            runs = runs.slice(0, options.limit);
        }
        return runs;
    }
    /**
     * Cancel a running pipeline
     */
    async cancelPipeline(runId) {
        try {
            const run = this.pipelineRuns.get(runId);
            if (!run) {
                throw new Error(`Pipeline run ${runId} not found`);
            }
            if (run.status !== 'running') {
                throw new Error(`Pipeline run ${runId} is not running`);
            }
            run.status = 'cancelled';
            run.completedAt = new Date();
            this.logger.info('Pipeline cancelled', { runId });
        }
        catch (error) {
            this.logger.error('Error cancelling pipeline', {
                error: error instanceof Error ? error.message : String(error),
                runId,
            });
            throw error;
        }
    }
    /**
     * Update pipeline configuration
     */
    async updatePipelineConfig(pipelineId, updates) {
        try {
            const config = this.pipelineConfigs.get(pipelineId);
            if (!config) {
                throw new Error(`Pipeline configuration ${pipelineId} not found`);
            }
            const updatedConfig = { ...config, ...updates };
            this.pipelineConfigs.set(pipelineId, updatedConfig);
            // Reschedule if schedule changed
            if (updates.schedule && updates.schedule !== config.schedule) {
                this.unschedulePipeline(pipelineId);
                if (updates.schedule !== 'manual') {
                    this.schedulePipeline(updatedConfig);
                }
            }
            this.logger.info('Pipeline configuration updated', {
                pipelineId,
                updates: Object.keys(updates),
            });
            return updatedConfig;
        }
        catch (error) {
            this.logger.error('Error updating pipeline config', {
                error: error instanceof Error ? error.message : String(error),
                pipelineId,
            });
            throw error;
        }
    }
    /**
     * Execute pipeline stages sequentially
     */
    async executePipelineStages(runId, config) {
        const run = this.pipelineRuns.get(runId);
        if (!run)
            return;
        try {
            run.status = 'running';
            // Stage 1: Data Preparation
            await this.executeDataPreparation(run, config);
            // Stage 2: Training
            const trainingResult = await this.executeTraining(run, config);
            // Stage 3: Validation
            const validationResult = await this.executeValidation(run, config, trainingResult);
            // Stage 4: Deployment (if auto-deployment enabled and validation passed)
            let deploymentResult;
            if (config.autoDeployment && validationResult.passed) {
                deploymentResult = await this.executeDeployment(run, config, trainingResult);
            }
            else {
                run.stages.deployment.status = 'skipped';
            }
            // Stage 5: A/B Testing (if enabled and deployment successful)
            if (config.abTestConfig?.enabled && deploymentResult) {
                await this.executeABTesting(run, config, trainingResult, deploymentResult);
            }
            run.status = 'completed';
            run.completedAt = new Date();
            run.results = {
                trainingJobId: trainingResult.trainingJob.id,
                modelVersionId: trainingResult.modelVersion.id,
                deploymentId: deploymentResult?.deploymentId,
                abTestId: run.stages.abTesting?.metadata?.abTestId,
                metrics: validationResult.metrics,
            };
            this.logger.info('Pipeline execution completed', {
                runId,
                modelVersionId: trainingResult.modelVersion.id,
            });
        }
        catch (error) {
            run.status = 'failed';
            run.error =
                error instanceof Error ? error.message : String(error);
            run.completedAt = new Date();
            throw error;
        }
    }
    /**
     * Execute data preparation stage
     */
    async executeDataPreparation(run, config) {
        const stage = run.stages.dataPreparation;
        stage.status = 'running';
        stage.startedAt = new Date();
        try {
            // Get feedback data for training
            const feedbackData = await this.feedbackService.getFeedbackByDomain(config.domain);
            if (feedbackData.length < config.trainingDataMinSize) {
                throw new Error(`Insufficient training data: ${feedbackData.length} < ${config.trainingDataMinSize}`);
            }
            stage.metadata = {
                trainingDataSize: feedbackData.length,
                dataQualityScore: this.calculateDataQualityScore(feedbackData),
            };
            stage.status = 'completed';
            stage.completedAt = new Date();
            stage.duration =
                stage.completedAt.getTime() - stage.startedAt.getTime();
            this.logger.info('Data preparation completed', {
                runId: run.id,
                trainingDataSize: feedbackData.length,
            });
        }
        catch (error) {
            stage.status = 'failed';
            stage.error =
                error instanceof Error ? error.message : String(error);
            stage.completedAt = new Date();
            throw error;
        }
    }
    /**
     * Execute training stage
     */
    async executeTraining(run, config) {
        const stage = run.stages.training;
        stage.status = 'running';
        stage.startedAt = new Date();
        try {
            // Prepare training data
            const feedbackData = await this.feedbackService.getFeedbackByDomain(config.domain);
            const trainingData = feedbackData.map((feedback) => ({
                input: feedback.originalContent || '',
                expectedOutput: feedback.corrections || feedback.userFeedback,
                feedback,
                domain: config.domain,
                timestamp: feedback.timestamp,
            }));
            // Start training
            const trainingJob = await this.mlTrainer.startTraining({
                domain: config.domain,
                trainingData,
                hyperparameters: config.hyperparameters,
                validationSplit: config.validationSplit,
            });
            // Wait for training to complete
            let completedJob = null;
            const maxWaitTime = 30 * 60 * 1000; // 30 minutes
            const startTime = Date.now();
            while (Date.now() - startTime < maxWaitTime) {
                completedJob = await this.mlTrainer.getTrainingJob(trainingJob.id);
                if (completedJob &&
                    (completedJob.status === 'completed' ||
                        completedJob.status === 'failed')) {
                    break;
                }
                await new Promise((resolve) => setTimeout(resolve, 5000)); // Check every 5 seconds
            }
            if (!completedJob || completedJob.status !== 'completed') {
                throw new Error('Training job failed or timed out');
            }
            if (!completedJob.modelVersion) {
                throw new Error('Training completed but no model version created');
            }
            stage.metadata = {
                trainingJobId: completedJob.id,
                modelVersionId: completedJob.modelVersion.id,
                trainingMetrics: completedJob.modelVersion.metadata.trainingMetrics,
            };
            stage.status = 'completed';
            stage.completedAt = new Date();
            stage.duration =
                stage.completedAt.getTime() - stage.startedAt.getTime();
            this.logger.info('Training completed', {
                runId: run.id,
                trainingJobId: completedJob.id,
                modelVersionId: completedJob.modelVersion.id,
            });
            return {
                trainingJob: completedJob,
                modelVersion: completedJob.modelVersion,
            };
        }
        catch (error) {
            stage.status = 'failed';
            stage.error =
                error instanceof Error ? error.message : String(error);
            stage.completedAt = new Date();
            throw error;
        }
    }
    /**
     * Execute validation stage
     */
    async executeValidation(run, config, trainingResult) {
        const stage = run.stages.validation;
        stage.status = 'running';
        stage.startedAt = new Date();
        try {
            const modelVersion = trainingResult.modelVersion;
            const validationMetrics = modelVersion.metadata.validationMetrics;
            // Check if model meets performance thresholds
            const passed = validationMetrics.accuracy >=
                config.performanceThreshold.accuracy &&
                validationMetrics.precision >=
                    config.performanceThreshold.precision &&
                validationMetrics.recall >=
                    config.performanceThreshold.recall;
            stage.metadata = {
                validationMetrics,
                thresholds: config.performanceThreshold,
                passed,
            };
            stage.status = 'completed';
            stage.completedAt = new Date();
            stage.duration =
                stage.completedAt.getTime() - stage.startedAt.getTime();
            this.logger.info('Validation completed', {
                runId: run.id,
                passed,
                accuracy: validationMetrics.accuracy,
            });
            return { passed, metrics: validationMetrics };
        }
        catch (error) {
            stage.status = 'failed';
            stage.error =
                error instanceof Error ? error.message : String(error);
            stage.completedAt = new Date();
            throw error;
        }
    }
    /**
     * Execute deployment stage
     */
    async executeDeployment(run, config, trainingResult) {
        const stage = run.stages.deployment;
        stage.status = 'running';
        stage.startedAt = new Date();
        try {
            const deploymentConfig = {
                modelVersionId: trainingResult.modelVersion.id,
                environment: 'staging', // Start with staging
                rolloutStrategy: 'immediate',
            };
            const deployment = await this.versionManager.deployModel(deploymentConfig);
            // Wait for deployment to complete
            let completedDeployment = null;
            const maxWaitTime = 10 * 60 * 1000; // 10 minutes
            const startTime = Date.now();
            while (Date.now() - startTime < maxWaitTime) {
                completedDeployment =
                    await this.versionManager.getDeploymentStatus(deployment.id);
                if (completedDeployment &&
                    (completedDeployment.status === 'deployed' ||
                        completedDeployment.status === 'failed')) {
                    break;
                }
                await new Promise((resolve) => setTimeout(resolve, 2000)); // Check every 2 seconds
            }
            if (!completedDeployment ||
                completedDeployment.status !== 'deployed') {
                throw new Error('Deployment failed or timed out');
            }
            stage.metadata = {
                deploymentId: deployment.id,
                environment: deploymentConfig.environment,
            };
            stage.status = 'completed';
            stage.completedAt = new Date();
            stage.duration =
                stage.completedAt.getTime() - stage.startedAt.getTime();
            this.logger.info('Deployment completed', {
                runId: run.id,
                deploymentId: deployment.id,
            });
            return { deploymentId: deployment.id };
        }
        catch (error) {
            stage.status = 'failed';
            stage.error =
                error instanceof Error ? error.message : String(error);
            stage.completedAt = new Date();
            throw error;
        }
    }
    /**
     * Execute A/B testing stage
     */
    async executeABTesting(run, config, trainingResult, deploymentResult) {
        const stage = run.stages.abTesting;
        stage.status = 'running';
        stage.startedAt = new Date();
        try {
            // Get current active model version for comparison
            const currentActiveVersion = await this.mlTrainer.getActiveModelVersion(config.domain);
            if (!currentActiveVersion) {
                // No existing model to compare against, skip A/B testing
                stage.status = 'skipped';
                stage.metadata = {
                    reason: 'No existing model for comparison',
                };
                return;
            }
            // Create A/B test
            const abTest = await this.mlTrainer.createABTest({
                name: `Pipeline A/B Test - ${run.id}`,
                description: `Comparing new model ${trainingResult.modelVersion.id} against current ${currentActiveVersion.id}`,
                modelVersionA: currentActiveVersion.id,
                modelVersionB: trainingResult.modelVersion.id,
                trafficSplit: config.abTestConfig.trafficSplit,
                startDate: new Date(),
                isActive: true,
            });
            stage.metadata = {
                abTestId: abTest.id,
                modelVersionA: currentActiveVersion.id,
                modelVersionB: trainingResult.modelVersion.id,
                duration: config.abTestConfig.duration,
            };
            stage.status = 'completed';
            stage.completedAt = new Date();
            stage.duration =
                stage.completedAt.getTime() - stage.startedAt.getTime();
            this.logger.info('A/B testing initiated', {
                runId: run.id,
                abTestId: abTest.id,
            });
        }
        catch (error) {
            stage.status = 'failed';
            stage.error =
                error instanceof Error ? error.message : String(error);
            stage.completedAt = new Date();
            throw error;
        }
    }
    /**
     * Schedule pipeline execution
     */
    schedulePipeline(config) {
        let interval;
        switch (config.schedule) {
            case 'daily':
                interval = 24 * 60 * 60 * 1000; // 24 hours
                break;
            case 'weekly':
                interval = 7 * 24 * 60 * 60 * 1000; // 7 days
                break;
            case 'monthly':
                interval = 30 * 24 * 60 * 60 * 1000; // 30 days
                break;
            default:
                return;
        }
        const timeout = setInterval(() => {
            this.executePipeline(config.id).catch((error) => {
                this.logger.error('Scheduled pipeline execution failed', {
                    pipelineId: config.id,
                    error: error instanceof Error ? error.message : String(error),
                });
            });
        }, interval);
        this.scheduledPipelines.set(config.id, timeout);
        this.logger.info('Pipeline scheduled', {
            pipelineId: config.id,
            schedule: config.schedule,
            interval,
        });
    }
    /**
     * Unschedule pipeline execution
     */
    unschedulePipeline(pipelineId) {
        const timeout = this.scheduledPipelines.get(pipelineId);
        if (timeout) {
            clearInterval(timeout);
            this.scheduledPipelines.delete(pipelineId);
            this.logger.info('Pipeline unscheduled', { pipelineId });
        }
    }
    /**
     * Clean up all scheduled pipelines (for testing cleanup)
     */
    cleanup() {
        for (const [pipelineId] of this.scheduledPipelines) {
            this.unschedulePipeline(pipelineId);
        }
    }
    /**
     * Calculate data quality score
     */
    calculateDataQualityScore(feedbackData) {
        if (feedbackData.length === 0)
            return 0;
        let qualityScore = 0;
        let totalWeight = 0;
        for (const feedback of feedbackData) {
            let itemScore = 0;
            let itemWeight = 1;
            // Check if feedback has corrections (higher quality)
            if (feedback.corrections &&
                feedback.corrections.trim().length > 0) {
                itemScore += 0.4;
            }
            // Check if feedback has expert notes (higher quality)
            if (feedback.expertNotes &&
                feedback.expertNotes.trim().length > 0) {
                itemScore += 0.3;
            }
            // Check feedback type (correct feedback is valuable)
            if (feedback.userFeedback === 'correct') {
                itemScore += 0.2;
            }
            else if (feedback.userFeedback === 'incorrect') {
                itemScore += 0.3; // Incorrect feedback with corrections is more valuable
            }
            // Recent feedback is more valuable
            const age = Date.now() - new Date(feedback.timestamp).getTime();
            const ageInDays = age / (24 * 60 * 60 * 1000);
            if (ageInDays < 7) {
                itemWeight = 1.2;
            }
            else if (ageInDays < 30) {
                itemWeight = 1.0;
            }
            else {
                itemWeight = 0.8;
            }
            qualityScore += itemScore * itemWeight;
            totalWeight += itemWeight;
        }
        return totalWeight > 0
            ? Math.min(qualityScore / totalWeight, 1.0)
            : 0;
    }
}
exports.TrainingPipelineOrchestrator = TrainingPipelineOrchestrator;
//# sourceMappingURL=TrainingPipelineOrchestrator.js.map