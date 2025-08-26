export interface EncryptionConfig {
    algorithm: string;
    keyLength: number;
    ivLength: number;
    tagLength: number;
    saltLength: number;
}
export interface EncryptedData {
    encrypted: string;
    iv: string;
    tag: string;
    salt: string;
}
export declare class EncryptionService {
    private readonly config;
    private readonly scrypt;
    constructor(config?: Partial<EncryptionConfig>);
    /**
     * Encrypts data using AES-256-GCM with a password-derived key
     */
    encrypt(data: string, password: string): Promise<EncryptedData>;
    /**
     * Decrypts data using AES-256-GCM
     */
    decrypt(encryptedData: EncryptedData, password: string): Promise<string>;
    /**
     * Generates a secure random key for encryption
     */
    generateKey(): string;
    /**
     * Hashes data using SHA-256
     */
    hash(data: string): string;
    /**
     * Creates HMAC signature for data integrity
     */
    createHMAC(data: string, secret: string): string;
    /**
     * Verifies HMAC signature
     */
    verifyHMAC(data: string, signature: string, secret: string): boolean;
}
export declare const encryptionService: EncryptionService;
//# sourceMappingURL=EncryptionService.d.ts.map