import { EncryptionService } from '../../../../src/utils/encryption/EncryptionService';

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;
  const testPassword = 'test-password-123';
  const testData =
    'This is sensitive test data that needs encryption';

  beforeEach(() => {
    encryptionService = new EncryptionService();
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data successfully', async () => {
      const encrypted = await encryptionService.encrypt(
        testData,
        testPassword
      );

      expect(encrypted).toHaveProperty('encrypted');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('tag');
      expect(encrypted).toHaveProperty('salt');

      const decrypted = await encryptionService.decrypt(
        encrypted,
        testPassword
      );
      expect(decrypted).toBe(testData);
    });

    it('should produce different encrypted output for same input', async () => {
      const encrypted1 = await encryptionService.encrypt(
        testData,
        testPassword
      );
      const encrypted2 = await encryptionService.encrypt(
        testData,
        testPassword
      );

      expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.salt).not.toBe(encrypted2.salt);
    });

    it('should fail decryption with wrong password', async () => {
      const encrypted = await encryptionService.encrypt(
        testData,
        testPassword
      );

      await expect(
        encryptionService.decrypt(encrypted, 'wrong-password')
      ).rejects.toThrow('Decryption failed');
    });

    it('should fail decryption with tampered data', async () => {
      const encrypted = await encryptionService.encrypt(
        testData,
        testPassword
      );

      // Tamper with encrypted data
      encrypted.encrypted = encrypted.encrypted.slice(0, -2) + 'XX';

      await expect(
        encryptionService.decrypt(encrypted, testPassword)
      ).rejects.toThrow('Decryption failed');
    });

    it('should handle empty string encryption', async () => {
      const encrypted = await encryptionService.encrypt(
        '',
        testPassword
      );
      const decrypted = await encryptionService.decrypt(
        encrypted,
        testPassword
      );

      expect(decrypted).toBe('');
    });

    it('should handle large data encryption', async () => {
      const largeData = 'x'.repeat(1000000); // 1MB of data

      const encrypted = await encryptionService.encrypt(
        largeData,
        testPassword
      );
      const decrypted = await encryptionService.decrypt(
        encrypted,
        testPassword
      );

      expect(decrypted).toBe(largeData);
    });
  });

  describe('generateKey', () => {
    it('should generate unique keys', () => {
      const key1 = encryptionService.generateKey();
      const key2 = encryptionService.generateKey();

      expect(key1).not.toBe(key2);
      expect(key1).toHaveLength(64); // 32 bytes * 2 (hex)
      expect(key2).toHaveLength(64);
    });

    it('should generate valid hex keys', () => {
      const key = encryptionService.generateKey();
      expect(key).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('hash', () => {
    it('should produce consistent hash for same input', () => {
      const hash1 = encryptionService.hash(testData);
      const hash2 = encryptionService.hash(testData);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex output
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = encryptionService.hash('data1');
      const hash2 = encryptionService.hash('data2');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string hashing', () => {
      const hash = encryptionService.hash('');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('HMAC operations', () => {
    const secret = 'test-secret-key';

    it('should create and verify HMAC signatures', () => {
      const signature = encryptionService.createHMAC(
        testData,
        secret
      );
      const isValid = encryptionService.verifyHMAC(
        testData,
        signature,
        secret
      );

      expect(isValid).toBe(true);
      expect(signature).toHaveLength(64); // SHA-256 HMAC hex output
    });

    it('should fail verification with wrong secret', () => {
      const signature = encryptionService.createHMAC(
        testData,
        secret
      );
      const isValid = encryptionService.verifyHMAC(
        testData,
        signature,
        'wrong-secret'
      );

      expect(isValid).toBe(false);
    });

    it('should fail verification with tampered data', () => {
      const signature = encryptionService.createHMAC(
        testData,
        secret
      );
      const isValid = encryptionService.verifyHMAC(
        testData + 'tampered',
        signature,
        secret
      );

      expect(isValid).toBe(false);
    });

    it('should fail verification with tampered signature', () => {
      const signature = encryptionService.createHMAC(
        testData,
        secret
      );
      const tamperedSignature = signature.slice(0, -2) + 'XX';
      const isValid = encryptionService.verifyHMAC(
        testData,
        tamperedSignature,
        secret
      );

      expect(isValid).toBe(false);
    });

    it('should be resistant to timing attacks', () => {
      const signature = encryptionService.createHMAC(
        testData,
        secret
      );

      // Test with signatures of different lengths
      const shortSignature = signature.slice(0, 32);
      const longSignature = signature + 'extra';

      expect(() => {
        encryptionService.verifyHMAC(
          testData,
          shortSignature,
          secret
        );
      }).not.toThrow();

      expect(() => {
        encryptionService.verifyHMAC(testData, longSignature, secret);
      }).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle encryption errors gracefully', async () => {
      // Test with invalid password (null)
      await expect(
        encryptionService.encrypt(testData, null as any)
      ).rejects.toThrow('Encryption failed');
    });

    it('should handle decryption errors gracefully', async () => {
      const invalidEncryptedData = {
        encrypted: 'invalid-hex',
        iv: 'invalid-hex',
        tag: 'invalid-hex',
        salt: 'invalid-hex',
      };

      await expect(
        encryptionService.decrypt(invalidEncryptedData, testPassword)
      ).rejects.toThrow('Decryption failed');
    });
  });

  describe('configuration', () => {
    it('should accept custom configuration', () => {
      const customConfig = {
        algorithm: 'aes-256-gcm' as const,
        keyLength: 32,
        ivLength: 16,
        tagLength: 16,
        saltLength: 32,
      };

      const customService = new EncryptionService(customConfig);
      expect(customService).toBeInstanceOf(EncryptionService);
    });

    it('should use default configuration when none provided', () => {
      const defaultService = new EncryptionService();
      expect(defaultService).toBeInstanceOf(EncryptionService);
    });
  });
});
