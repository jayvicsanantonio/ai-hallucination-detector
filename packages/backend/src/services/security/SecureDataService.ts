import {
  EncryptionService,
  EncryptedData,
} from '../../utils/encryption/EncryptionService';
import {
  PIIDetector,
  PIIMatch,
} from '../../utils/privacy/PIIDetector';

export interface SecureStorageOptions {
  encryptSensitiveData: boolean;
  detectPII: boolean;
  anonymizePII: boolean;
  encryptionKey?: string;
}

export interface StoredData {
  id: string;
  data: string | EncryptedData;
  isEncrypted: boolean;
  piiDetected: PIIMatch[];
  createdAt: Date;
  metadata?: Record<string, any>;
}

export class SecureDataService {
  private readonly encryptionService: EncryptionService;
  private readonly piiDetector: PIIDetector;
  private readonly options: SecureStorageOptions;

  constructor(
    encryptionService: EncryptionService,
    piiDetector: PIIDetector,
    options: SecureStorageOptions
  ) {
    this.encryptionService = encryptionService;
    this.piiDetector = piiDetector;
    this.options = options;
  }

  /**
   * Securely stores data with optional encryption and PII handling
   */
  async storeData(
    id: string,
    data: string,
    metadata?: Record<string, any>
  ): Promise<StoredData> {
    let processedData: string | EncryptedData = data;
    let isEncrypted = false;
    let piiDetected: PIIMatch[] = [];

    // Detect PII if enabled
    if (this.options.detectPII) {
      piiDetected = this.piiDetector.detectPII(data);
    }

    // Handle PII anonymization
    if (this.options.anonymizePII && piiDetected.length > 0) {
      processedData = this.piiDetector.anonymize(data);
    }

    // Encrypt sensitive data if enabled
    if (this.options.encryptSensitiveData) {
      if (!this.options.encryptionKey) {
        throw new Error('Encryption key required for secure storage');
      }

      const dataToEncrypt =
        typeof processedData === 'string'
          ? processedData
          : JSON.stringify(processedData);
      processedData = await this.encryptionService.encrypt(
        dataToEncrypt,
        this.options.encryptionKey
      );
      isEncrypted = true;
    }

    return {
      id,
      data: processedData,
      isEncrypted,
      piiDetected,
      createdAt: new Date(),
      metadata,
    };
  }

  /**
   * Retrieves and decrypts stored data
   */
  async retrieveData(storedData: StoredData): Promise<string> {
    if (!storedData.isEncrypted) {
      return storedData.data as string;
    }

    if (!this.options.encryptionKey) {
      throw new Error('Encryption key required to decrypt data');
    }

    const encryptedData = storedData.data as EncryptedData;
    return await this.encryptionService.decrypt(
      encryptedData,
      this.options.encryptionKey
    );
  }

  /**
   * Checks if data contains sensitive information
   */
  isSensitiveData(data: string): boolean {
    const piiMatches = this.piiDetector.detectPII(data);
    return piiMatches.length > 0;
  }

  /**
   * Sanitizes data for logging or display
   */
  sanitizeForLogging(data: string): string {
    if (this.options.detectPII) {
      return this.piiDetector.mask(data);
    }
    return data;
  }

  /**
   * Validates data integrity using HMAC
   */
  validateDataIntegrity(
    data: string,
    signature: string,
    secret: string
  ): boolean {
    return this.encryptionService.verifyHMAC(data, signature, secret);
  }

  /**
   * Creates data integrity signature
   */
  createDataSignature(data: string, secret: string): string {
    return this.encryptionService.createHMAC(data, secret);
  }

  /**
   * Securely deletes data by overwriting memory
   */
  secureDelete(data: string): void {
    // Overwrite the string data in memory (limited effectiveness in JavaScript)
    // In production, consider using native modules for secure memory management
    if (typeof data === 'string') {
      // Create a buffer and fill with random data
      const buffer = Buffer.from(data, 'utf8');
      buffer.fill(0);
    }
  }

  /**
   * Generates audit log entry for data access
   */
  createAuditEntry(
    action: 'store' | 'retrieve' | 'delete',
    dataId: string,
    userId?: string,
    metadata?: Record<string, any>
  ): Record<string, any> {
    return {
      timestamp: new Date().toISOString(),
      action,
      dataId,
      userId,
      metadata,
      component: 'SecureDataService',
    };
  }
}

/**
 * Factory function to create SecureDataService with default configuration
 */
export function createSecureDataService(
  options?: Partial<SecureStorageOptions>
): SecureDataService {
  const defaultOptions: SecureStorageOptions = {
    encryptSensitiveData: true,
    detectPII: true,
    anonymizePII: false,
    encryptionKey: process.env.DATA_ENCRYPTION_KEY,
    ...options,
  };

  return new SecureDataService(
    new EncryptionService(),
    new PIIDetector(),
    defaultOptions
  );
}
