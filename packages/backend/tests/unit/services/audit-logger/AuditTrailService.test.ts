import {
  AuditTrailService,
  RetentionPolicyConfig,
} from '../../../../src/services/audit-logger/AuditTrailService';
import {
  AuditRepository,
  AuditRetentionRepository,
} from '../../../../src/database/interfaces/AuditRepository';
import { Logger } from '../../../../src/utils/Logger';
import { AuditEntry } from '../../../../src/models/audit';

describe('AuditTrailService', () => {
  let auditTrailService: AuditTrailService;
  let mockAuditRepository: jest.Mocked<AuditRepository>;
  let mockRetentionRepository: jest.Mocked<AuditRetentionRepository>;
  let mockLogger: jest.Mocked<Logger>;
  let config: RetentionPolicyConfig;

  beforeEach(() => {
    mockAuditRepository = {
      createAuditEntry: jest.fn(),
      createAuditEntriesBatch: jest.fn(),
      queryAuditEntries: jest.fn(),
      getAuditSummary: jest.fn(),
      cleanupExpiredAuditData: jest.fn(),
      archiveOldSessions: jest.fn(),
    } as any;

    mockRetentionRepository = {
      createRetentionPolicy: jest.fn(),
      getRetentionPolicy: jest.fn(),
      updateRetentionPolicy: jest.fn(),
      deleteRetentionPolicy: jest.fn(),
      getAllRetentionPolicies: jest.fn(),
    };

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    config = {
      defaultRetentionYears: 7,
      autoArchiveEnabled: true,
      cleanupSchedule: '0 2 * * *', // Daily at 2 AM
      maxBatchSize: 1000,
    };

    auditTrailService = new AuditTrailService(
      mockAuditRepository,
      mockRetentionRepository,
      mockLogger,
      config
    );
  });

  afterEach(async () => {
    await auditTrailService.shutdown();
  });

  describe('setRetentionPolicy', () => {
    it('should create new retention policy', async () => {
      const organizationId = 'org-123';
      const retentionYears = 5;
      const mockPolicy = {
        id: 1,
        organizationId,
        retentionYears,
        autoArchive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRetentionRepository.getRetentionPolicy.mockResolvedValue(
        null
      );
      mockRetentionRepository.createRetentionPolicy.mockResolvedValue(
        mockPolicy
      );

      const result = await auditTrailService.setRetentionPolicy(
        organizationId,
        retentionYears
      );

      expect(
        mockRetentionRepository.createRetentionPolicy
      ).toHaveBeenCalledWith({
        organizationId,
        retentionYears,
        autoArchive: true,
      });
      expect(result).toBe(mockPolicy);
    });

    it('should update existing retention policy', async () => {
      const organizationId = 'org-123';
      const retentionYears = 10;
      const existingPolicy = {
        id: 1,
        organizationId,
        retentionYears: 7,
        autoArchive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updatedPolicy = { ...existingPolicy, retentionYears };

      mockRetentionRepository.getRetentionPolicy.mockResolvedValue(
        existingPolicy
      );
      mockRetentionRepository.updateRetentionPolicy.mockResolvedValue(
        updatedPolicy
      );

      const result = await auditTrailService.setRetentionPolicy(
        organizationId,
        retentionYears,
        false
      );

      expect(
        mockRetentionRepository.updateRetentionPolicy
      ).toHaveBeenCalledWith(organizationId, {
        retentionYears,
        autoArchive: false,
      });
      expect(result).toBe(updatedPolicy);
    });
  });

  describe('getEffectiveRetentionYears', () => {
    it('should return policy retention years when policy exists', async () => {
      const organizationId = 'org-123';
      const policy = {
        id: 1,
        organizationId,
        retentionYears: 5,
        autoArchive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRetentionRepository.getRetentionPolicy.mockResolvedValue(
        policy
      );

      const result =
        await auditTrailService.getEffectiveRetentionYears(
          organizationId
        );

      expect(result).toBe(5);
    });

    it('should return default retention years when no policy exists', async () => {
      const organizationId = 'org-123';

      mockRetentionRepository.getRetentionPolicy.mockResolvedValue(
        null
      );

      const result =
        await auditTrailService.getEffectiveRetentionYears(
          organizationId
        );

      expect(result).toBe(config.defaultRetentionYears);
    });
  });

  describe('persistAuditEntry', () => {
    it('should persist valid audit entry', async () => {
      const entry: AuditEntry = {
        id: 'entry-123',
        sessionId: 'session-456',
        timestamp: new Date(),
        action: 'verification_completed',
        component: 'VerificationEngine',
        details: {},
        success: true,
        severity: 'info',
      };

      mockAuditRepository.createAuditEntry.mockResolvedValue(entry);

      const result = await auditTrailService.persistAuditEntry(entry);

      expect(
        mockAuditRepository.createAuditEntry
      ).toHaveBeenCalledWith(entry);
      expect(result).toBe(entry);
    });

    it('should reject invalid audit entry', async () => {
      const invalidEntry = {
        id: '',
        sessionId: 'session-456',
        timestamp: new Date(),
        action: 'verification_completed',
        component: 'VerificationEngine',
        details: {},
        success: true,
        severity: 'info',
      } as AuditEntry;

      await expect(
        auditTrailService.persistAuditEntry(invalidEntry)
      ).rejects.toThrow('Audit entry must have an ID');
    });

    it('should reject entry with future timestamp', async () => {
      const futureEntry: AuditEntry = {
        id: 'entry-123',
        sessionId: 'session-456',
        timestamp: new Date(Date.now() + 60000), // 1 minute in future
        action: 'verification_completed',
        component: 'VerificationEngine',
        details: {},
        success: true,
        severity: 'info',
      };

      await expect(
        auditTrailService.persistAuditEntry(futureEntry)
      ).rejects.toThrow(
        'Audit entry timestamp cannot be in the future'
      );
    });
  });

  describe('persistAuditEntriesBatch', () => {
    it('should persist batch of valid entries', async () => {
      const entries: AuditEntry[] = [
        {
          id: 'entry-1',
          sessionId: 'session-1',
          timestamp: new Date(),
          action: 'verification_started',
          component: 'VerificationEngine',
          details: {},
          success: true,
          severity: 'info',
        },
        {
          id: 'entry-2',
          sessionId: 'session-1',
          timestamp: new Date(),
          action: 'verification_completed',
          component: 'VerificationEngine',
          details: {},
          success: true,
          severity: 'info',
        },
      ];

      mockAuditRepository.createAuditEntriesBatch.mockResolvedValue(
        entries
      );

      const result = await auditTrailService.persistAuditEntriesBatch(
        entries
      );

      expect(
        mockAuditRepository.createAuditEntriesBatch
      ).toHaveBeenCalledWith(entries);
      expect(result).toEqual(entries);
    });

    it('should handle large batches by splitting them', async () => {
      const largeEntries: AuditEntry[] = Array.from(
        { length: 2500 },
        (_, i) => ({
          id: `entry-${i}`,
          sessionId: 'session-1',
          timestamp: new Date(),
          action: 'verification_completed',
          component: 'VerificationEngine',
          details: {},
          success: true,
          severity: 'info',
        })
      );

      mockAuditRepository.createAuditEntriesBatch.mockImplementation(
        (batch) => Promise.resolve(batch)
      );

      const result = await auditTrailService.persistAuditEntriesBatch(
        largeEntries
      );

      expect(
        mockAuditRepository.createAuditEntriesBatch
      ).toHaveBeenCalledTimes(3); // 2500 / 1000 = 3 batches
      expect(result).toHaveLength(2500);
    });

    it('should return empty array for empty input', async () => {
      const result = await auditTrailService.persistAuditEntriesBatch(
        []
      );

      expect(result).toEqual([]);
      expect(
        mockAuditRepository.createAuditEntriesBatch
      ).not.toHaveBeenCalled();
    });
  });

  describe('getAuditTrailMetrics', () => {
    it('should calculate audit trail metrics', async () => {
      const organizationId = 'org-123';
      const mockSummary = {
        totalEntries: 1000,
        successfulActions: 950,
        failedActions: 50,
        uniqueUsers: 25,
        uniqueSessions: 100,
        actionCounts: {} as any,
        severityCounts: {} as any,
        timeRange: {
          earliest: new Date('2024-01-01'),
          latest: new Date('2024-01-31'),
        },
      };

      mockAuditRepository.queryAuditEntries
        .mockResolvedValueOnce([]) // totalEntries query
        .mockResolvedValueOnce(Array(50).fill({})) // entriesLastHour
        .mockResolvedValueOnce(Array(500).fill({})); // entriesLastDay

      mockAuditRepository.getAuditSummary.mockResolvedValue(
        mockSummary
      );

      const metrics = await auditTrailService.getAuditTrailMetrics(
        organizationId
      );

      expect(metrics).toEqual({
        totalEntries: 1000,
        entriesLastHour: 50,
        entriesLastDay: 500,
        averageEntriesPerHour: 500 / 24,
        storageUsageMB: expect.any(Number),
        oldestEntry: mockSummary.timeRange.earliest,
        newestEntry: mockSummary.timeRange.latest,
      });
    });
  });

  describe('archiveOldData', () => {
    it('should archive old data based on retention policy', async () => {
      const organizationId = 'org-123';
      const retentionYears = 7;
      const archivedCount = 250;

      mockRetentionRepository.getRetentionPolicy.mockResolvedValue({
        id: 1,
        organizationId,
        retentionYears,
        autoArchive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockAuditRepository.archiveOldSessions.mockResolvedValue(
        archivedCount
      );

      const result = await auditTrailService.archiveOldData(
        organizationId
      );

      expect(result).toBe(archivedCount);
      expect(
        mockAuditRepository.archiveOldSessions
      ).toHaveBeenCalledWith(organizationId, expect.any(Date));
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Archived old audit data',
        expect.objectContaining({
          organizationId,
          archivedCount,
          retentionYears,
        })
      );
    });
  });

  describe('cleanupExpiredData', () => {
    it('should cleanup expired data and log results', async () => {
      const organizationId = 'org-123';
      const retentionYears = 7;
      const deletedCount = 100;

      mockRetentionRepository.getRetentionPolicy.mockResolvedValue({
        id: 1,
        organizationId,
        retentionYears,
        autoArchive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockAuditRepository.cleanupExpiredAuditData.mockResolvedValue(
        deletedCount
      );

      const result = await auditTrailService.cleanupExpiredData(
        organizationId
      );

      expect(result).toBe(deletedCount);
      expect(
        mockAuditRepository.cleanupExpiredAuditData
      ).toHaveBeenCalledWith(organizationId, retentionYears);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Cleaned up expired audit data',
        expect.objectContaining({
          organizationId,
          deletedCount,
          retentionYears,
        })
      );
    });
  });

  describe('runScheduledCleanup', () => {
    it('should run cleanup for all organizations with auto-archive enabled', async () => {
      const policies = [
        {
          id: 1,
          organizationId: 'org-1',
          retentionYears: 7,
          autoArchive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          organizationId: 'org-2',
          retentionYears: 5,
          autoArchive: false, // Should be skipped
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 3,
          organizationId: 'org-3',
          retentionYears: 10,
          autoArchive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRetentionRepository.getAllRetentionPolicies.mockResolvedValue(
        policies
      );
      // Mock individual policy lookups for cleanupExpiredData calls
      mockRetentionRepository.getRetentionPolicy
        .mockResolvedValueOnce(policies[0]) // org-1
        .mockResolvedValueOnce(policies[2]); // org-3
      mockAuditRepository.cleanupExpiredAuditData.mockResolvedValue(
        50
      );

      await auditTrailService.runScheduledCleanup();

      expect(
        mockAuditRepository.cleanupExpiredAuditData
      ).toHaveBeenCalledTimes(2); // Only auto-archive enabled
      expect(
        mockAuditRepository.cleanupExpiredAuditData
      ).toHaveBeenCalledWith('org-1', 7);
      expect(
        mockAuditRepository.cleanupExpiredAuditData
      ).toHaveBeenCalledWith('org-3', 10);
    });

    it('should handle cleanup errors gracefully', async () => {
      const policies = [
        {
          id: 1,
          organizationId: 'org-1',
          retentionYears: 7,
          autoArchive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRetentionRepository.getAllRetentionPolicies.mockResolvedValue(
        policies
      );
      mockAuditRepository.cleanupExpiredAuditData.mockRejectedValue(
        new Error('Cleanup failed')
      );

      await auditTrailService.runScheduledCleanup();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed cleanup for organization',
        expect.objectContaining({
          organizationId: 'org-1',
          error: expect.any(Error),
        })
      );
    });
  });

  describe('validateDataIntegrity', () => {
    it('should validate data integrity and return results', async () => {
      const organizationId = 'org-123';
      const mockEntries: AuditEntry[] = [
        {
          id: 'entry-1',
          sessionId: 'session-1',
          timestamp: new Date(),
          action: 'verification_completed',
          component: 'VerificationEngine',
          details: {},
          success: true,
          severity: 'info',
        },
        {
          id: 'entry-2',
          sessionId: '', // Invalid - missing sessionId
          timestamp: new Date(),
          action: 'verification_failed',
          component: 'VerificationEngine',
          details: {},
          success: false,
          severity: 'error',
        },
      ];

      mockAuditRepository.queryAuditEntries.mockResolvedValue(
        mockEntries
      );

      const result = await auditTrailService.validateDataIntegrity(
        organizationId
      );

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(2); // Missing sessionId and missing error message
      expect(result.checkedEntries).toBe(2);
    });

    it('should return valid result for clean data', async () => {
      const organizationId = 'org-123';
      const mockEntries: AuditEntry[] = [
        {
          id: 'entry-1',
          sessionId: 'session-1',
          timestamp: new Date(),
          action: 'verification_completed',
          component: 'VerificationEngine',
          details: {},
          success: true,
          severity: 'info',
        },
      ];

      mockAuditRepository.queryAuditEntries.mockResolvedValue(
        mockEntries
      );

      const result = await auditTrailService.validateDataIntegrity(
        organizationId
      );

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.checkedEntries).toBe(1);
    });
  });
});
