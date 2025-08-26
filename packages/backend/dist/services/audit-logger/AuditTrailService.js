"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditTrailService = void 0;
class AuditTrailService {
    constructor(auditRepository, retentionRepository, logger, config) {
        this.auditRepository = auditRepository;
        this.retentionRepository = retentionRepository;
        this.logger = logger;
        this.config = config;
        this.scheduleCleanup();
    }
    /**
     * Create or update retention policy for organization
     */
    async setRetentionPolicy(organizationId, retentionYears, autoArchive = true) {
        try {
            const existingPolicy = await this.retentionRepository.getRetentionPolicy(organizationId);
            if (existingPolicy) {
                return await this.retentionRepository.updateRetentionPolicy(organizationId, {
                    retentionYears,
                    autoArchive,
                });
            }
            else {
                return await this.retentionRepository.createRetentionPolicy({
                    organizationId,
                    retentionYears,
                    autoArchive,
                });
            }
        }
        catch (error) {
            this.logger.error('Failed to set retention policy', {
                error,
                organizationId,
            });
            throw error;
        }
    }
    /**
     * Get retention policy for organization
     */
    async getRetentionPolicy(organizationId) {
        return this.retentionRepository.getRetentionPolicy(organizationId);
    }
    /**
     * Get effective retention years (policy or default)
     */
    async getEffectiveRetentionYears(organizationId) {
        const policy = await this.getRetentionPolicy(organizationId);
        return (policy?.retentionYears ?? this.config.defaultRetentionYears);
    }
    /**
     * Persist audit entry with validation
     */
    async persistAuditEntry(entry) {
        try {
            this.validateAuditEntry(entry);
            return await this.auditRepository.createAuditEntry(entry);
        }
        catch (error) {
            this.logger.error('Failed to persist audit entry', {
                error,
                entryId: entry.id,
            });
            throw error;
        }
    }
    /**
     * Persist multiple audit entries in batch
     */
    async persistAuditEntriesBatch(entries) {
        if (entries.length === 0) {
            return [];
        }
        try {
            // Validate all entries
            entries.forEach((entry) => this.validateAuditEntry(entry));
            // Process in batches to avoid overwhelming the database
            const results = [];
            for (let i = 0; i < entries.length; i += this.config.maxBatchSize) {
                const batch = entries.slice(i, i + this.config.maxBatchSize);
                const batchResults = await this.auditRepository.createAuditEntriesBatch(batch);
                results.push(...batchResults);
            }
            this.logger.debug(`Persisted ${entries.length} audit entries in ${Math.ceil(entries.length / this.config.maxBatchSize)} batches`);
            return results;
        }
        catch (error) {
            this.logger.error('Failed to persist audit entries batch', {
                error,
                entryCount: entries.length,
            });
            throw error;
        }
    }
    /**
     * Query audit entries with advanced filtering
     */
    async queryAuditEntries(query) {
        try {
            return await this.auditRepository.queryAuditEntries(query);
        }
        catch (error) {
            this.logger.error('Failed to query audit entries', {
                error,
                query,
            });
            throw error;
        }
    }
    /**
     * Get audit summary with metrics
     */
    async getAuditSummary(organizationId, startDate, endDate) {
        try {
            return await this.auditRepository.getAuditSummary(organizationId, startDate, endDate);
        }
        catch (error) {
            this.logger.error('Failed to get audit summary', {
                error,
                organizationId,
            });
            throw error;
        }
    }
    /**
     * Get audit trail metrics for monitoring
     */
    async getAuditTrailMetrics(organizationId) {
        try {
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const [totalEntries, entriesLastHour, entriesLastDay, summary] = await Promise.all([
                this.auditRepository
                    .queryAuditEntries({ organizationId, limit: 1 })
                    .then((r) => (r.length > 0 ? 1 : 0)),
                this.auditRepository
                    .queryAuditEntries({
                    organizationId,
                    startDate: oneHourAgo,
                })
                    .then((r) => r.length),
                this.auditRepository
                    .queryAuditEntries({
                    organizationId,
                    startDate: oneDayAgo,
                })
                    .then((r) => r.length),
                this.auditRepository.getAuditSummary(organizationId),
            ]);
            return {
                totalEntries: summary.totalEntries,
                entriesLastHour,
                entriesLastDay,
                averageEntriesPerHour: entriesLastDay / 24,
                storageUsageMB: this.estimateStorageUsage(summary.totalEntries),
                oldestEntry: summary.timeRange?.earliest,
                newestEntry: summary.timeRange?.latest,
            };
        }
        catch (error) {
            this.logger.error('Failed to get audit trail metrics', {
                error,
                organizationId,
            });
            throw error;
        }
    }
    /**
     * Archive old audit data based on retention policy
     */
    async archiveOldData(organizationId) {
        try {
            const retentionYears = await this.getEffectiveRetentionYears(organizationId);
            const archiveBeforeDate = new Date();
            archiveBeforeDate.setFullYear(archiveBeforeDate.getFullYear() - retentionYears);
            const archivedCount = await this.auditRepository.archiveOldSessions(organizationId, archiveBeforeDate);
            this.logger.info('Archived old audit data', {
                organizationId,
                archivedCount,
                retentionYears,
                archiveBeforeDate,
            });
            return archivedCount;
        }
        catch (error) {
            this.logger.error('Failed to archive old audit data', {
                error,
                organizationId,
            });
            throw error;
        }
    }
    /**
     * Cleanup expired audit data
     */
    async cleanupExpiredData(organizationId) {
        try {
            const retentionYears = await this.getEffectiveRetentionYears(organizationId);
            const deletedCount = await this.auditRepository.cleanupExpiredAuditData(organizationId, retentionYears);
            this.logger.info('Cleaned up expired audit data', {
                organizationId,
                deletedCount,
                retentionYears,
            });
            return deletedCount;
        }
        catch (error) {
            this.logger.error('Failed to cleanup expired audit data', {
                error,
                organizationId,
            });
            throw error;
        }
    }
    /**
     * Run scheduled cleanup for all organizations
     */
    async runScheduledCleanup() {
        try {
            const policies = await this.retentionRepository.getAllRetentionPolicies();
            const autoArchivePolicies = policies.filter((p) => p.autoArchive);
            this.logger.info(`Running scheduled cleanup for ${autoArchivePolicies.length} organizations`);
            for (const policy of autoArchivePolicies) {
                try {
                    const deletedCount = await this.cleanupExpiredData(policy.organizationId);
                    this.logger.debug('Completed cleanup for organization', {
                        organizationId: policy.organizationId,
                        deletedCount,
                    });
                }
                catch (error) {
                    this.logger.error('Failed cleanup for organization', {
                        error,
                        organizationId: policy.organizationId,
                    });
                }
            }
        }
        catch (error) {
            this.logger.error('Failed to run scheduled cleanup', { error });
        }
    }
    /**
     * Validate audit data integrity
     */
    async validateDataIntegrity(organizationId) {
        try {
            const issues = [];
            let checkedEntries = 0;
            // Check for orphaned audit entries
            const entries = await this.auditRepository.queryAuditEntries({
                organizationId,
                limit: 1000,
            });
            for (const entry of entries) {
                checkedEntries++;
                // Validate required fields
                if (!entry.sessionId || !entry.action || !entry.component) {
                    issues.push(`Entry ${entry.id} missing required fields`);
                }
                // Validate timestamp consistency
                if (entry.timestamp > new Date()) {
                    issues.push(`Entry ${entry.id} has future timestamp`);
                }
                // Validate success/error consistency
                if (!entry.success && !entry.errorMessage) {
                    issues.push(`Entry ${entry.id} marked as failed but no error message`);
                }
            }
            return {
                isValid: issues.length === 0,
                issues,
                checkedEntries,
            };
        }
        catch (error) {
            this.logger.error('Failed to validate data integrity', {
                error,
                organizationId,
            });
            throw error;
        }
    }
    /**
     * Shutdown service gracefully
     */
    async shutdown() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
    }
    validateAuditEntry(entry) {
        if (!entry.id) {
            throw new Error('Audit entry must have an ID');
        }
        if (!entry.sessionId) {
            throw new Error('Audit entry must have a session ID');
        }
        if (!entry.action) {
            throw new Error('Audit entry must have an action');
        }
        if (!entry.component) {
            throw new Error('Audit entry must have a component');
        }
        if (!entry.timestamp) {
            throw new Error('Audit entry must have a timestamp');
        }
        if (entry.timestamp > new Date()) {
            throw new Error('Audit entry timestamp cannot be in the future');
        }
    }
    scheduleCleanup() {
        // Run cleanup every 24 hours (simplified scheduling)
        this.cleanupTimer = setInterval(async () => {
            await this.runScheduledCleanup();
        }, 24 * 60 * 60 * 1000);
    }
    estimateStorageUsage(entryCount) {
        // Rough estimate: ~2KB per audit entry on average
        return Math.round((entryCount * 2) / 1024);
    }
}
exports.AuditTrailService = AuditTrailService;
//# sourceMappingURL=AuditTrailService.js.map