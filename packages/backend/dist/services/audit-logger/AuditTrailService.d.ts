import { AuditRepository, AuditRetentionRepository, AuditRetentionPolicy } from '../../database/interfaces/AuditRepository';
import { AuditEntry, AuditQuery, AuditSummary } from '../../models/audit';
import { Logger } from '../../utils/Logger';
export interface RetentionPolicyConfig {
    defaultRetentionYears: number;
    autoArchiveEnabled: boolean;
    cleanupSchedule: string;
    maxBatchSize: number;
}
export interface AuditTrailMetrics {
    totalEntries: number;
    entriesLastHour: number;
    entriesLastDay: number;
    averageEntriesPerHour: number;
    storageUsageMB: number;
    oldestEntry?: Date;
    newestEntry?: Date;
}
export declare class AuditTrailService {
    private auditRepository;
    private retentionRepository;
    private logger;
    private config;
    private cleanupTimer?;
    constructor(auditRepository: AuditRepository, retentionRepository: AuditRetentionRepository, logger: Logger, config: RetentionPolicyConfig);
    /**
     * Create or update retention policy for organization
     */
    setRetentionPolicy(organizationId: string, retentionYears: number, autoArchive?: boolean): Promise<AuditRetentionPolicy>;
    /**
     * Get retention policy for organization
     */
    getRetentionPolicy(organizationId: string): Promise<AuditRetentionPolicy | null>;
    /**
     * Get effective retention years (policy or default)
     */
    getEffectiveRetentionYears(organizationId: string): Promise<number>;
    /**
     * Persist audit entry with validation
     */
    persistAuditEntry(entry: AuditEntry): Promise<AuditEntry>;
    /**
     * Persist multiple audit entries in batch
     */
    persistAuditEntriesBatch(entries: AuditEntry[]): Promise<AuditEntry[]>;
    /**
     * Query audit entries with advanced filtering
     */
    queryAuditEntries(query: AuditQuery): Promise<AuditEntry[]>;
    /**
     * Get audit summary with metrics
     */
    getAuditSummary(organizationId: string, startDate?: Date, endDate?: Date): Promise<AuditSummary>;
    /**
     * Get audit trail metrics for monitoring
     */
    getAuditTrailMetrics(organizationId: string): Promise<AuditTrailMetrics>;
    /**
     * Archive old audit data based on retention policy
     */
    archiveOldData(organizationId: string): Promise<number>;
    /**
     * Cleanup expired audit data
     */
    cleanupExpiredData(organizationId: string): Promise<number>;
    /**
     * Run scheduled cleanup for all organizations
     */
    runScheduledCleanup(): Promise<void>;
    /**
     * Validate audit data integrity
     */
    validateDataIntegrity(organizationId: string): Promise<{
        isValid: boolean;
        issues: string[];
        checkedEntries: number;
    }>;
    /**
     * Shutdown service gracefully
     */
    shutdown(): Promise<void>;
    private validateAuditEntry;
    private scheduleCleanup;
    private estimateStorageUsage;
}
//# sourceMappingURL=AuditTrailService.d.ts.map