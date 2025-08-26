"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecureDataService = void 0;
exports.createSecureDataService = createSecureDataService;
const EncryptionService_1 = require("../../utils/encryption/EncryptionService");
const PIIDetector_1 = require("../../utils/privacy/PIIDetector");
class SecureDataService {
    constructor(encryptionService, piiDetector, options) {
        this.encryptionService = encryptionService;
        this.piiDetector = piiDetector;
        this.options = options;
    }
    /**
     * Securely stores data with optional encryption and PII handling
     */
    async storeData(id, data, metadata) {
        let processedData = data;
        let isEncrypted = false;
        let piiDetected = [];
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
            const dataToEncrypt = typeof processedData === 'string'
                ? processedData
                : JSON.stringify(processedData);
            processedData = await this.encryptionService.encrypt(dataToEncrypt, this.options.encryptionKey);
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
    async retrieveData(storedData) {
        if (!storedData.isEncrypted) {
            return storedData.data;
        }
        if (!this.options.encryptionKey) {
            throw new Error('Encryption key required to decrypt data');
        }
        const encryptedData = storedData.data;
        return await this.encryptionService.decrypt(encryptedData, this.options.encryptionKey);
    }
    /**
     * Checks if data contains sensitive information
     */
    isSensitiveData(data) {
        const piiMatches = this.piiDetector.detectPII(data);
        return piiMatches.length > 0;
    }
    /**
     * Sanitizes data for logging or display
     */
    sanitizeForLogging(data) {
        if (this.options.detectPII) {
            return this.piiDetector.mask(data);
        }
        return data;
    }
    /**
     * Validates data integrity using HMAC
     */
    validateDataIntegrity(data, signature, secret) {
        return this.encryptionService.verifyHMAC(data, signature, secret);
    }
    /**
     * Creates data integrity signature
     */
    createDataSignature(data, secret) {
        return this.encryptionService.createHMAC(data, secret);
    }
    /**
     * Securely deletes data by overwriting memory
     */
    secureDelete(data) {
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
    createAuditEntry(action, dataId, userId, metadata) {
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
exports.SecureDataService = SecureDataService;
/**
 * Factory function to create SecureDataService with default configuration
 */
function createSecureDataService(options) {
    const defaultOptions = {
        encryptSensitiveData: true,
        detectPII: true,
        anonymizePII: false,
        encryptionKey: process.env.DATA_ENCRYPTION_KEY,
        ...options,
    };
    return new SecureDataService(new EncryptionService_1.EncryptionService(), new PIIDetector_1.PIIDetector(), defaultOptions);
}
//# sourceMappingURL=SecureDataService.js.map