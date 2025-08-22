import https from 'https';
import fs from 'fs';
import path from 'path';

export interface TLSOptions {
  certPath?: string;
  keyPath?: string;
  caPath?: string;
  minVersion?: string;
  maxVersion?: string;
  ciphers?: string;
  honorCipherOrder?: boolean;
  secureProtocol?: string;
}

export class TLSConfig {
  private readonly options: TLSOptions;

  constructor(options: TLSOptions = {}) {
    this.options = {
      minVersion: 'TLSv1.3',
      maxVersion: 'TLSv1.3',
      honorCipherOrder: true,
      secureProtocol: 'TLSv1_3_method',
      // TLS 1.3 cipher suites (automatically negotiated)
      ciphers: [
        'TLS_AES_256_GCM_SHA384',
        'TLS_CHACHA20_POLY1305_SHA256',
        'TLS_AES_128_GCM_SHA256',
      ].join(':'),
      ...options,
    };
  }

  /**
   * Creates HTTPS server options with TLS 1.3 configuration
   */
  createHTTPSOptions(): https.ServerOptions {
    const httpsOptions: https.ServerOptions = {
      minVersion: this.options.minVersion,
      maxVersion: this.options.maxVersion,
      ciphers: this.options.ciphers,
      honorCipherOrder: this.options.honorCipherOrder,
      secureProtocol: this.options.secureProtocol,
      // Additional security headers
      secureOptions: this.getSecureOptions(),
    };

    // Load certificates if paths are provided
    if (this.options.certPath && this.options.keyPath) {
      try {
        httpsOptions.cert = fs.readFileSync(this.options.certPath);
        httpsOptions.key = fs.readFileSync(this.options.keyPath);

        if (this.options.caPath) {
          httpsOptions.ca = fs.readFileSync(this.options.caPath);
        }
      } catch (error) {
        throw new Error(
          `Failed to load TLS certificates: ${error.message}`
        );
      }
    } else {
      // Generate self-signed certificate for development
      const { cert, key } = this.generateSelfSignedCert();
      httpsOptions.cert = cert;
      httpsOptions.key = key;
    }

    return httpsOptions;
  }

  /**
   * Validates TLS configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check certificate files exist
    if (
      this.options.certPath &&
      !fs.existsSync(this.options.certPath)
    ) {
      errors.push(
        `Certificate file not found: ${this.options.certPath}`
      );
    }

    if (
      this.options.keyPath &&
      !fs.existsSync(this.options.keyPath)
    ) {
      errors.push(
        `Private key file not found: ${this.options.keyPath}`
      );
    }

    if (this.options.caPath && !fs.existsSync(this.options.caPath)) {
      errors.push(`CA file not found: ${this.options.caPath}`);
    }

    // Validate TLS version
    const validVersions = ['TLSv1.2', 'TLSv1.3'];
    if (
      this.options.minVersion &&
      !validVersions.includes(this.options.minVersion)
    ) {
      errors.push(
        `Invalid minimum TLS version: ${this.options.minVersion}`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private getSecureOptions(): number {
    const constants = require('constants');

    return (
      constants.SSL_OP_NO_SSLv2 |
      constants.SSL_OP_NO_SSLv3 |
      constants.SSL_OP_NO_TLSv1 |
      constants.SSL_OP_NO_TLSv1_1 |
      constants.SSL_OP_CIPHER_SERVER_PREFERENCE |
      constants.SSL_OP_NO_COMPRESSION
    );
  }

  private generateSelfSignedCert(): { cert: string; key: string } {
    // This is a simplified version for development
    // In production, use proper certificate management
    const crypto = require('crypto');

    console.warn(
      'Using self-signed certificate for development. Use proper certificates in production.'
    );

    // Generate a simple self-signed certificate
    // Note: This is a placeholder - in real implementation, use proper certificate generation
    const cert = `-----BEGIN CERTIFICATE-----
MIIBkTCB+wIJAKHHH7V7V7V7MA0GCSqGSIb3DQEBCwUAMBQxEjAQBgNVBAMMCWxv
Y2FsaG9zdDAeFw0yNDA4MjIwMDAwMDBaFw0yNTA4MjIwMDAwMDBaMBQxEjAQBgNV
BAMMCWxvY2FsaG9zdDBcMA0GCSqGSIb3DQEBAQUAA0sAMEgCQQC7VJTUt9Us8cKB
wko6CwYCGIYfqcXUSCJe9CvqZHy6/UBAVJ346r/whXfNc0S/X4C8g/VGp6VXVtlm
AUBo7M/rAgMBAAEwDQYJKoZIhvcNAQELBQADQQA4f0Nc9sQ7yWnP+DlQ2UoZjoBi
-----END CERTIFICATE-----`;

    const key = `-----BEGIN PRIVATE KEY-----
MIIBVAIBADANBgkqhkiG9w0BAQEFAASCAT4wggE6AgEAAkEAu1SU1L7VLPHCgcJK
OgsGAhiGH6nF1EgiXvQr6mR8uv1AQFS9+Oq/8IV3zXNEv1+AvIP1RqelV1bZZgFA
aOzP6wIDAQABAkEAiAC2hw9L0tUp/jiacc0/wVFgpQDl9Z7D5WuJQ1cxdwYfHHQZ
-----END PRIVATE KEY-----`;

    return { cert, key };
  }

  /**
   * Gets recommended security headers for HTTPS
   */
  getSecurityHeaders(): Record<string, string> {
    return {
      'Strict-Transport-Security':
        'max-age=31536000; includeSubDomains; preload',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
      'Permissions-Policy':
        'geolocation=(), microphone=(), camera=()',
    };
  }
}

export const tlsConfig = new TLSConfig();
