"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationEngine = void 0;
const uuid_1 = require("uuid");
const ResultsProcessor_1 = require("./ResultsProcessor");
const Logger_1 = require("@/utils/Logger");
class VerificationEngine {
    constructor(modules = [], options = {}) {
        this.logger = options.logger || new Logger_1.Logger('VerificationEngine');
        this.modules = new Map();
        this.activeVerifications = new Map();
        this.maxConcurrentVerifications =
            options.maxConcurrentVerifications || 100;
        this.defaultTimeout = options.defaultTimeout || 30000; // 30 seconds
        // Initialize results processor
        this.resultsProcessor = new ResultsProcessor_1.ResultsProcessor({
            enableCaching: options.enableCaching,
            cacheTtl: options.cacheTtl,
        });
        // Register modules
        modules.forEach((module) => {
            this.modules.set(module.domain, module);
            this.logger.info(`Registered module for domain: ${module.domain}`);
        });
    }
    async verifyContent(request) {
        const verificationId = (0, uuid_1.v4)();
        const startTime = Date.now();
        // Check concurrent verification limit
        if (this.activeVerifications.size >= this.maxConcurrentVerifications) {
            throw new Error('Maximum concurrent verifications reached. Please try again later.');
        }
        // Initialize verification status
        const status = {
            verificationId,
            status: 'processing',
            progress: 0,
            currentStep: 'Initializing verification',
        };
        this.activeVerifications.set(verificationId, status);
        const auditTrail = [];
        try {
            // Update status
            this.updateVerificationStatus(verificationId, {
                progress: 10,
                currentStep: 'Validating input',
            });
            // Validate input
            this.validateRequest(request);
            // Log verification start
            this.addAuditEntry(auditTrail, verificationId, 'verification_started', 'VerificationEngine', {
                domain: request.domain,
                urgency: request.urgency,
                contentId: request.content.id,
                userId: request.userId,
                organizationId: request.organizationId,
            }, request.userId);
            // Update status
            this.updateVerificationStatus(verificationId, {
                progress: 20,
                currentStep: 'Running verification modules',
            });
            // Run verification modules
            const moduleResults = await this.runVerificationModules(request, verificationId, auditTrail);
            // Update status
            this.updateVerificationStatus(verificationId, {
                progress: 80,
                currentStep: 'Aggregating results',
            });
            // Process and aggregate results
            const result = await this.resultsProcessor.processResults(verificationId, request, moduleResults, Date.now() - startTime);
            // Add audit trail to result
            result.auditTrail = auditTrail;
            // Update status
            this.updateVerificationStatus(verificationId, {
                status: 'completed',
                progress: 100,
                currentStep: 'Verification completed',
            });
            // Log completion
            this.addAuditEntry(auditTrail, verificationId, 'verification_completed', 'VerificationEngine', {
                overallConfidence: result.overallConfidence,
                riskLevel: result.riskLevel,
                issueCount: result.issues.length,
                processingTime: result.processingTime,
            }, request.userId);
            return result;
        }
        catch (error) {
            // Update status to failed
            this.updateVerificationStatus(verificationId, {
                status: 'failed',
                error: error instanceof Error
                    ? error.message
                    : 'Unknown error occurred',
            });
            // Log error
            this.addAuditEntry(auditTrail, verificationId, 'verification_failed', 'VerificationEngine', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
            }, request.userId);
            this.logger.error(`Verification failed for ${verificationId}:`, error);
            throw error;
        }
        finally {
            // Clean up active verification
            this.activeVerifications.delete(verificationId);
        }
    }
    async getVerificationStatus(verificationId) {
        const status = this.activeVerifications.get(verificationId);
        if (!status) {
            throw new Error(`Verification ${verificationId} not found or already completed`);
        }
        return { ...status };
    }
    async cancelVerification(verificationId) {
        const status = this.activeVerifications.get(verificationId);
        if (!status ||
            status.status === 'completed' ||
            status.status === 'failed') {
            return false;
        }
        this.updateVerificationStatus(verificationId, {
            status: 'cancelled',
        });
        this.logger.info(`Verification ${verificationId} cancelled`);
        return true;
    }
    validateRequest(request) {
        if (!request.content) {
            throw new Error('Content is required for verification');
        }
        if (!request.domain) {
            throw new Error('Domain is required for verification');
        }
        if (!request.urgency) {
            throw new Error('Urgency level is required for verification');
        }
        // Validate content structure
        if (!request.content.id || !request.content.extractedText) {
            throw new Error('Invalid content structure: missing id or extractedText');
        }
    }
    async runVerificationModules(request, verificationId, auditTrail) {
        const results = [];
        const options = request.options || {};
        // Get relevant modules for the domain
        const domainModule = this.modules.get(request.domain);
        const allModules = domainModule ? [domainModule] : [];
        // Add cross-domain modules if available
        // TODO: Add fact-checker, logic-analyzer, compliance-validator modules
        if (allModules.length === 0) {
            this.logger.warn(`No modules available for domain: ${request.domain}`);
            return results;
        }
        const modulePromises = allModules.map(async (module, index) => {
            const moduleStartTime = Date.now();
            try {
                this.addAuditEntry(auditTrail, verificationId, 'module_started', module.domain, {
                    moduleVersion: module.version,
                }, request.userId);
                // Update progress
                const progressStep = 60 / allModules.length;
                this.updateVerificationStatus(verificationId, {
                    progress: 20 + index * progressStep,
                    currentStep: `Running ${module.domain} module`,
                });
                const result = await this.runModuleWithTimeout(module, request.content, options.maxProcessingTime || this.defaultTimeout);
                const processingTime = Date.now() - moduleStartTime;
                this.addAuditEntry(auditTrail, verificationId, 'module_completed', module.domain, {
                    issueCount: result.issues.length,
                    confidence: result.confidence,
                    processingTime,
                }, request.userId);
                return result;
            }
            catch (error) {
                const processingTime = Date.now() - moduleStartTime;
                this.addAuditEntry(auditTrail, verificationId, 'module_failed', module.domain, {
                    error: error instanceof Error
                        ? error.message
                        : 'Unknown error',
                    processingTime,
                }, request.userId);
                this.logger.error(`Module ${module.domain} failed:`, error);
                // Return empty result instead of failing entire verification
                return {
                    moduleId: module.domain,
                    issues: [],
                    confidence: 0,
                    processingTime,
                    metadata: {
                        error: error instanceof Error
                            ? error.message
                            : 'Unknown error',
                    },
                };
            }
        });
        const moduleResults = await Promise.all(modulePromises);
        return moduleResults.filter((result) => result !== null);
    }
    async runModuleWithTimeout(module, content, timeout) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Module ${module.domain} timed out after ${timeout}ms`));
            }, timeout);
            module
                .validateContent(content)
                .then((result) => {
                clearTimeout(timer);
                resolve(result);
            })
                .catch((error) => {
                clearTimeout(timer);
                reject(error);
            });
        });
    }
    updateVerificationStatus(verificationId, updates) {
        const current = this.activeVerifications.get(verificationId);
        if (current) {
            this.activeVerifications.set(verificationId, {
                ...current,
                ...updates,
            });
        }
    }
    addAuditEntry(auditTrail, sessionId, action, component, details, userId) {
        auditTrail.push({
            id: (0, uuid_1.v4)(),
            sessionId,
            timestamp: new Date(),
            action,
            component,
            details,
            userId,
        });
    }
    // Module management methods
    registerModule(module) {
        this.modules.set(module.domain, module);
        this.logger.info(`Registered module for domain: ${module.domain}`);
    }
    unregisterModule(domain) {
        const removed = this.modules.delete(domain);
        if (removed) {
            this.logger.info(`Unregistered module for domain: ${domain}`);
        }
        return removed;
    }
    getRegisteredModules() {
        return Array.from(this.modules.keys());
    }
    getActiveVerificationCount() {
        return this.activeVerifications.size;
    }
    // Results processing methods
    async getCachedResult(verificationId) {
        return await this.resultsProcessor.getResult(verificationId);
    }
    async invalidateCache(cacheKey) {
        await this.resultsProcessor.invalidateCache(cacheKey);
    }
    getProcessingMetrics() {
        return this.resultsProcessor.getMetrics();
    }
    getCacheStats() {
        return this.resultsProcessor.getCacheStats();
    }
}
exports.VerificationEngine = VerificationEngine;
//# sourceMappingURL=VerificationEngine.js.map