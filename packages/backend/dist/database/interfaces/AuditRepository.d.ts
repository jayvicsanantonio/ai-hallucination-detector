import { VerificationSession, FeedbackData, AuditEntry, AuditQuery, AuditSummary } from '../../models/audit';
export interface AuditRepository {
    createVerificationSession(session: VerificationSession): Promise<VerificationSession>;
    getVerificationSession(id: string): Promise<VerificationSession | null>;
    updateVerificationSession(id: string, updates: Partial<VerificationSession>): Promise<VerificationSession>;
    deleteVerificationSession(id: string): Promise<boolean>;
    getVerificationSessionsByUser(userId: string, limit?: number, offset?: number): Promise<VerificationSession[]>;
    getVerificationSessionsByOrganization(organizationId: string, limit?: number, offset?: number): Promise<VerificationSession[]>;
    createEntry(entry: Omit<AuditEntry, 'id'>): Promise<AuditEntry>;
    createAuditEntry(entry: AuditEntry): Promise<AuditEntry>;
    getAuditEntry(id: string): Promise<AuditEntry | null>;
    getEntriesBySession(sessionId: string): Promise<AuditEntry[]>;
    getAuditEntriesBySession(sessionId: string): Promise<AuditEntry[]>;
    queryEntries(query: AuditQuery): Promise<AuditEntry[]>;
    queryAuditEntries(query: AuditQuery): Promise<AuditEntry[]>;
    getAuditSummary(organizationId: string, startDate?: Date, endDate?: Date): Promise<AuditSummary>;
    createFeedbackData(feedback: FeedbackData): Promise<FeedbackData>;
    getFeedbackData(verificationId: string): Promise<FeedbackData[]>;
    getFeedbackByUser(userId: string, limit?: number, offset?: number): Promise<FeedbackData[]>;
    updateFeedbackData(id: string, updates: Partial<FeedbackData>): Promise<FeedbackData>;
    createAuditEntriesBatch(entries: AuditEntry[]): Promise<AuditEntry[]>;
    cleanupExpiredAuditData(organizationId: string, retentionYears: number): Promise<number>;
    archiveOldSessions(organizationId: string, archiveBeforeDate: Date): Promise<number>;
}
export interface AuditRetentionPolicy {
    id: number;
    organizationId: string;
    retentionYears: number;
    autoArchive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface AuditRetentionRepository {
    createRetentionPolicy(policy: Omit<AuditRetentionPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<AuditRetentionPolicy>;
    getRetentionPolicy(organizationId: string): Promise<AuditRetentionPolicy | null>;
    updateRetentionPolicy(organizationId: string, updates: Partial<AuditRetentionPolicy>): Promise<AuditRetentionPolicy>;
    deleteRetentionPolicy(organizationId: string): Promise<boolean>;
    getAllRetentionPolicies(): Promise<AuditRetentionPolicy[]>;
}
export interface DatabaseConnection {
    query<T = any>(sql: string, params?: any[]): Promise<T[]>;
    queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
    execute(sql: string, params?: any[]): Promise<{
        rowCount: number;
        insertId?: string;
    }>;
    transaction<T>(callback: (connection: DatabaseConnection) => Promise<T>): Promise<T>;
    close(): Promise<void>;
}
export interface DatabaseMigration {
    version: string;
    description: string;
    up: string;
    down?: string;
    timestamp: Date;
}
export interface MigrationRepository {
    getCurrentVersion(): Promise<string | null>;
    applyMigration(migration: DatabaseMigration): Promise<void>;
    rollbackMigration(version: string): Promise<void>;
    getMigrationHistory(): Promise<DatabaseMigration[]>;
}
//# sourceMappingURL=AuditRepository.d.ts.map