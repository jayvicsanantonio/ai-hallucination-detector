import https from 'https';
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
export declare class TLSConfig {
    private readonly options;
    constructor(options?: TLSOptions);
    /**
     * Creates HTTPS server options with TLS 1.3 configuration
     */
    createHTTPSOptions(): https.ServerOptions;
    /**
     * Validates TLS configuration
     */
    validateConfig(): {
        valid: boolean;
        errors: string[];
    };
    private getSecureOptions;
    private generateSelfSignedCert;
    /**
     * Gets recommended security headers for HTTPS
     */
    getSecurityHeaders(): Record<string, string>;
}
export declare const tlsConfig: TLSConfig;
//# sourceMappingURL=TLSConfig.d.ts.map