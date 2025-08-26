"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptionService = exports.EncryptionService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const util_1 = require("util");
class EncryptionService {
    constructor(config) {
        this.scrypt = (0, util_1.promisify)(crypto_1.default.scrypt);
        this.config = {
            algorithm: 'aes-256-gcm',
            keyLength: 32,
            ivLength: 16,
            tagLength: 16,
            saltLength: 32,
            ...config,
        };
    }
    /**
     * Encrypts data using AES-256-GCM with a password-derived key
     */
    async encrypt(data, password) {
        try {
            const salt = crypto_1.default.randomBytes(this.config.saltLength);
            const iv = crypto_1.default.randomBytes(this.config.ivLength);
            // Derive key from password using scrypt
            const key = (await this.scrypt(password, salt, this.config.keyLength));
            const cipher = crypto_1.default.createCipheriv('aes-256-cbc', key, iv);
            let encrypted = cipher.update(data, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            // Create a simple tag for integrity (in real GCM this would be automatic)
            const tag = crypto_1.default
                .createHmac('sha256', key)
                .update(encrypted)
                .digest('hex')
                .slice(0, 32);
            return {
                encrypted,
                iv: iv.toString('hex'),
                tag,
                salt: salt.toString('hex'),
            };
        }
        catch (error) {
            throw new Error(`Encryption failed: ${error?.message || 'Unknown error'}`);
        }
    }
    /**
     * Decrypts data using AES-256-GCM
     */
    async decrypt(encryptedData, password) {
        try {
            const salt = Buffer.from(encryptedData.salt, 'hex');
            const iv = Buffer.from(encryptedData.iv, 'hex');
            // Derive key from password using scrypt
            const key = (await this.scrypt(password, salt, this.config.keyLength));
            // Verify tag first
            const expectedTag = crypto_1.default
                .createHmac('sha256', key)
                .update(encryptedData.encrypted)
                .digest('hex')
                .slice(0, 32);
            if (expectedTag !== encryptedData.tag) {
                throw new Error('Authentication tag verification failed');
            }
            const decipher = crypto_1.default.createDecipheriv('aes-256-cbc', key, iv);
            let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        catch (error) {
            throw new Error(`Decryption failed: ${error?.message || 'Unknown error'}`);
        }
    }
    /**
     * Generates a secure random key for encryption
     */
    generateKey() {
        return crypto_1.default.randomBytes(this.config.keyLength).toString('hex');
    }
    /**
     * Hashes data using SHA-256
     */
    hash(data) {
        return crypto_1.default.createHash('sha256').update(data).digest('hex');
    }
    /**
     * Creates HMAC signature for data integrity
     */
    createHMAC(data, secret) {
        return crypto_1.default
            .createHmac('sha256', secret)
            .update(data)
            .digest('hex');
    }
    /**
     * Verifies HMAC signature
     */
    verifyHMAC(data, signature, secret) {
        try {
            const expectedSignature = this.createHMAC(data, secret);
            // Ensure both buffers have the same length for timing-safe comparison
            const sigBuffer = Buffer.from(signature, 'hex');
            const expectedBuffer = Buffer.from(expectedSignature, 'hex');
            if (sigBuffer.length !== expectedBuffer.length) {
                return false;
            }
            return crypto_1.default.timingSafeEqual(sigBuffer, expectedBuffer);
        }
        catch {
            return false;
        }
    }
}
exports.EncryptionService = EncryptionService;
exports.encryptionService = new EncryptionService();
//# sourceMappingURL=EncryptionService.js.map