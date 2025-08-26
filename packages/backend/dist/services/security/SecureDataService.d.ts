import { EncryptionService, EncryptedData } from '../../utils/encryption/EncryptionService';
import { PIIDetector, PIIMatch } from '../../utils/privacy/PIIDetector';
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
export declare class SecureDataService {
    private readonly encryptionService;
    private readonly piiDetector;
    private readonly options;
    constructor(encryptionService: EncryptionService, piiDetector: PIIDetector, options: SecureStorageOptions);
    /**
     * Securely stores data with optional encryption and PII handling
     */
    storeData(id: string, data: string, metadata?: Record<string, any>): Promise<StoredData>;
    /**
     * Retrieves and decrypts stored data
     */
    retrieveData(storedData: StoredData): Promise<string>;
    /**
     * Checks if data contains sensitive information
     */
    isSensitiveData(data: string): boolean;
    /**
     * Sanitizes data for logging or display
     */
    sanitizeForLogging(data: string): string;
    /**
     * Validates data integrity using HMAC
     */
    validateDataIntegrity(data: string, signature: string, secret: string): boolean;
    /**
     * Creates data integrity signature
     */
    createDataSignature(data: string, secret: string): string;
    /**
     * Securely deletes data by overwriting memory
     */
    secureDelete(data: string): void;
    /**
     * Generates audit log entry for data access
     */
    createAuditEntry(action: 'store' | 'retrieve' | 'delete', dataId: string, userId?: string, metadata?: Record<string, any>): Record<string, any>;
}
/**
 * Factory function to create SecureDataService with default configuration
 */
export declare function createSecureDataService(options?: Partial<SecureStorageOptions>): SecureDataService;
//# sourceMappingURL=SecureDataService.d.ts.map