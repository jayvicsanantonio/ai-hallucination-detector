import {
  SecureDataService,
  createSecureDataService,
} from '../../../../src/services/security/SecureDataService';
import { EncryptionService } from '../../../../src/utils/encryption/EncryptionService';
import {
  PIIDetector,
  PIIType,
} from '../../../../src/utils/privacy/PIIDetector';

describe('SecureDataService', () => {
  let secureDataService: SecureDataService;
  let encryptionService: EncryptionService;
  let piiDetector: PIIDetector;
  const testKey = 'test-encryption-key-123';

  beforeEach(() => {
    encryptionService = new EncryptionService();
    piiDetector = new PIIDetector();
    secureDataService = new SecureDataService(
      encryptionService,
      piiDetector,
      {
        encryptSensitiveData: true,
        detectPII: true,
        anonymizePII: false,
        encryptionKey: testKey,
      }
    );
  });

  describe('storeData', () => {
    it('should store data with encryption when enabled', async () => {
      const testData = 'This is sensitive test data';
      const stored = await secureDataService.storeData(
        'test-id',
        testData
      );

      expect(stored.id).toBe('test-id');
      expect(stored.isEncrypted).toBe(true);
      expect(stored.data).not.toBe(testData);
      expect(stored.data).toHaveProperty('encrypted');
      expect(stored.data).toHaveProperty('iv');
      expect(stored.data).toHaveProperty('tag');
      expect(stored.data).toHaveProperty('salt');
      expect(stored.createdAt).toBeInstanceOf(Date);
    });

    it('should detect PII in stored data', async () => {
      const testData = 'Contact john.doe@example.com for more info';
      const stored = await secureDataService.storeData(
        'test-id',
        testData
      );

      expect(stored.piiDetected).toHaveLength(1);
      expect(stored.piiDetected[0].type).toBe(PIIType.EMAIL);
      expect(stored.piiDetected[0].value).toBe(
        'john.doe@example.com'
      );
    });

    it('should anonymize PII when enabled', async () => {
      const anonymizingService = new SecureDataService(
        encryptionService,
        piiDetector,
        {
          encryptSensitiveData: false,
          detectPII: true,
          anonymizePII: true,
          encryptionKey: testKey,
        }
      );

      const testData = 'Contact john.doe@example.com for help';
      const stored = await anonymizingService.storeData(
        'test-id',
        testData
      );

      expect(stored.data).toBe('Contact [EMAIL] for help');
      expect(stored.isEncrypted).toBe(false);
    });

    it('should store metadata with data', async () => {
      const testData = 'Test data';
      const metadata = { source: 'test', priority: 'high' };
      const stored = await secureDataService.storeData(
        'test-id',
        testData,
        metadata
      );

      expect(stored.metadata).toEqual(metadata);
    });

    it('should throw error when encryption enabled but no key provided', async () => {
      const noKeyService = new SecureDataService(
        encryptionService,
        piiDetector,
        {
          encryptSensitiveData: true,
          detectPII: false,
          anonymizePII: false,
        }
      );

      await expect(
        noKeyService.storeData('test-id', 'test data')
      ).rejects.toThrow('Encryption key required for secure storage');
    });

    it('should handle empty data', async () => {
      const stored = await secureDataService.storeData('test-id', '');
      expect(stored.id).toBe('test-id');
      expect(stored.isEncrypted).toBe(true);
    });
  });

  describe('retrieveData', () => {
    it('should retrieve and decrypt encrypted data', async () => {
      const testData = 'This is sensitive test data';
      const stored = await secureDataService.storeData(
        'test-id',
        testData
      );
      const retrieved = await secureDataService.retrieveData(stored);

      expect(retrieved).toBe(testData);
    });

    it('should return unencrypted data as-is', async () => {
      const unencryptedService = new SecureDataService(
        encryptionService,
        piiDetector,
        {
          encryptSensitiveData: false,
          detectPII: false,
          anonymizePII: false,
        }
      );

      const testData = 'This is test data';
      const stored = await unencryptedService.storeData(
        'test-id',
        testData
      );
      const retrieved = await unencryptedService.retrieveData(stored);

      expect(retrieved).toBe(testData);
    });

    it('should throw error when decryption key missing', async () => {
      const testData = 'Test data';
      const stored = await secureDataService.storeData(
        'test-id',
        testData
      );

      const noKeyService = new SecureDataService(
        encryptionService,
        piiDetector,
        {
          encryptSensitiveData: true,
          detectPII: false,
          anonymizePII: false,
        }
      );

      await expect(noKeyService.retrieveData(stored)).rejects.toThrow(
        'Encryption key required to decrypt data'
      );
    });
  });

  describe('isSensitiveData', () => {
    it('should identify data with PII as sensitive', () => {
      const sensitiveData = 'My email is john@example.com';
      const isSensitive =
        secureDataService.isSensitiveData(sensitiveData);

      expect(isSensitive).toBe(true);
    });

    it('should identify data without PII as not sensitive', () => {
      const regularData = 'This is just regular text';
      const isSensitive =
        secureDataService.isSensitiveData(regularData);

      expect(isSensitive).toBe(false);
    });
  });

  describe('sanitizeForLogging', () => {
    it('should mask PII in log data', () => {
      const logData = 'User email: john.doe@example.com';
      const sanitized = secureDataService.sanitizeForLogging(logData);

      expect(sanitized).toContain('j***@example.com');
      expect(sanitized).not.toContain('john.doe@example.com');
    });

    it('should return original data when PII detection disabled', () => {
      const noPIIService = new SecureDataService(
        encryptionService,
        piiDetector,
        {
          encryptSensitiveData: false,
          detectPII: false,
          anonymizePII: false,
        }
      );

      const logData = 'User email: john.doe@example.com';
      const sanitized = noPIIService.sanitizeForLogging(logData);

      expect(sanitized).toBe(logData);
    });
  });

  describe('data integrity', () => {
    it('should create and validate data signatures', () => {
      const testData =
        'Important data that needs integrity protection';
      const secret = 'integrity-secret';

      const signature = secureDataService.createDataSignature(
        testData,
        secret
      );
      const isValid = secureDataService.validateDataIntegrity(
        testData,
        signature,
        secret
      );

      expect(isValid).toBe(true);
      expect(signature).toHaveLength(64); // SHA-256 HMAC hex length
    });

    it('should fail validation with tampered data', () => {
      const testData = 'Important data';
      const secret = 'integrity-secret';

      const signature = secureDataService.createDataSignature(
        testData,
        secret
      );
      const isValid = secureDataService.validateDataIntegrity(
        testData + ' tampered',
        signature,
        secret
      );

      expect(isValid).toBe(false);
    });

    it('should fail validation with wrong secret', () => {
      const testData = 'Important data';
      const secret = 'integrity-secret';

      const signature = secureDataService.createDataSignature(
        testData,
        secret
      );
      const isValid = secureDataService.validateDataIntegrity(
        testData,
        signature,
        'wrong-secret'
      );

      expect(isValid).toBe(false);
    });
  });

  describe('audit logging', () => {
    it('should create audit entries for data operations', () => {
      const auditEntry = secureDataService.createAuditEntry(
        'store',
        'test-data-id',
        'user-123',
        { source: 'api' }
      );

      expect(auditEntry).toHaveProperty('timestamp');
      expect(auditEntry.action).toBe('store');
      expect(auditEntry.dataId).toBe('test-data-id');
      expect(auditEntry.userId).toBe('user-123');
      expect(auditEntry.metadata).toEqual({ source: 'api' });
      expect(auditEntry.component).toBe('SecureDataService');
    });

    it('should handle audit entries without user ID', () => {
      const auditEntry = secureDataService.createAuditEntry(
        'retrieve',
        'test-data-id'
      );

      expect(auditEntry.action).toBe('retrieve');
      expect(auditEntry.dataId).toBe('test-data-id');
      expect(auditEntry.userId).toBeUndefined();
    });
  });

  describe('secureDelete', () => {
    it('should attempt to securely delete data', () => {
      const testData = 'sensitive data to delete';

      // This test mainly ensures the method doesn't throw
      expect(() => {
        secureDataService.secureDelete(testData);
      }).not.toThrow();
    });
  });

  describe('factory function', () => {
    it('should create service with default configuration', () => {
      const service = createSecureDataService();
      expect(service).toBeInstanceOf(SecureDataService);
    });

    it('should create service with custom configuration', () => {
      const service = createSecureDataService({
        encryptSensitiveData: false,
        detectPII: false,
      });
      expect(service).toBeInstanceOf(SecureDataService);
    });

    it('should use environment variable for encryption key', () => {
      const originalEnv = process.env.DATA_ENCRYPTION_KEY;
      process.env.DATA_ENCRYPTION_KEY = 'env-test-key';

      const service = createSecureDataService();
      expect(service).toBeInstanceOf(SecureDataService);

      // Restore original environment
      if (originalEnv) {
        process.env.DATA_ENCRYPTION_KEY = originalEnv;
      } else {
        delete process.env.DATA_ENCRYPTION_KEY;
      }
    });
  });

  describe('error handling', () => {
    it('should handle encryption errors gracefully', async () => {
      const faultyEncryptionService = {
        encrypt: jest
          .fn()
          .mockRejectedValue(new Error('Encryption failed')),
        decrypt: jest.fn(),
        generateKey: jest.fn(),
        hash: jest.fn(),
        createHMAC: jest.fn(),
        verifyHMAC: jest.fn(),
      };

      const faultyService = new SecureDataService(
        faultyEncryptionService as any,
        piiDetector,
        {
          encryptSensitiveData: true,
          detectPII: false,
          anonymizePII: false,
          encryptionKey: testKey,
        }
      );

      await expect(
        faultyService.storeData('test-id', 'test data')
      ).rejects.toThrow('Encryption failed');
    });

    it('should handle PII detection errors gracefully', async () => {
      const faultyPIIDetector = {
        detectPII: jest.fn().mockImplementation(() => {
          throw new Error('PII detection failed');
        }),
        anonymize: jest.fn(),
        mask: jest.fn(),
      };

      const faultyService = new SecureDataService(
        encryptionService,
        faultyPIIDetector as any,
        {
          encryptSensitiveData: false,
          detectPII: true,
          anonymizePII: false,
        }
      );

      await expect(
        faultyService.storeData('test-id', 'test data')
      ).rejects.toThrow('PII detection failed');
    });
  });
});
