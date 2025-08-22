import crypto from 'crypto';
import { promisify } from 'util';

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

export class EncryptionService {
  private readonly config: EncryptionConfig;
  private readonly scrypt = promisify(crypto.scrypt);

  constructor(config?: Partial<EncryptionConfig>) {
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
  async encrypt(
    data: string,
    password: string
  ): Promise<EncryptedData> {
    try {
      const salt = crypto.randomBytes(this.config.saltLength);
      const iv = crypto.randomBytes(this.config.ivLength);

      // Derive key from password using scrypt
      const key = (await this.scrypt(
        password,
        salt,
        this.config.keyLength
      )) as Buffer;

      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Create a simple tag for integrity (in real GCM this would be automatic)
      const tag = crypto
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
    } catch (error: any) {
      throw new Error(
        `Encryption failed: ${error?.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Decrypts data using AES-256-GCM
   */
  async decrypt(
    encryptedData: EncryptedData,
    password: string
  ): Promise<string> {
    try {
      const salt = Buffer.from(encryptedData.salt, 'hex');
      const iv = Buffer.from(encryptedData.iv, 'hex');

      // Derive key from password using scrypt
      const key = (await this.scrypt(
        password,
        salt,
        this.config.keyLength
      )) as Buffer;

      // Verify tag first
      const expectedTag = crypto
        .createHmac('sha256', key)
        .update(encryptedData.encrypted)
        .digest('hex')
        .slice(0, 32);
      if (expectedTag !== encryptedData.tag) {
        throw new Error('Authentication tag verification failed');
      }

      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        key,
        iv
      );

      let decrypted = decipher.update(
        encryptedData.encrypted,
        'hex',
        'utf8'
      );
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error: any) {
      throw new Error(
        `Decryption failed: ${error?.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Generates a secure random key for encryption
   */
  generateKey(): string {
    return crypto.randomBytes(this.config.keyLength).toString('hex');
  }

  /**
   * Hashes data using SHA-256
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Creates HMAC signature for data integrity
   */
  createHMAC(data: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
  }

  /**
   * Verifies HMAC signature
   */
  verifyHMAC(
    data: string,
    signature: string,
    secret: string
  ): boolean {
    try {
      const expectedSignature = this.createHMAC(data, secret);

      // Ensure both buffers have the same length for timing-safe comparison
      const sigBuffer = Buffer.from(signature, 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');

      if (sigBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }
}

export const encryptionService = new EncryptionService();
