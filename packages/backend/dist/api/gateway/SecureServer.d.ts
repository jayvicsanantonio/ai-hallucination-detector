import express from 'express';
export declare class SecureServer {
    private app;
    private tlsConfig;
    private httpServer?;
    private httpsServer?;
    constructor();
    private setupMiddleware;
    private setupRoutes;
    private setupErrorHandling;
    /**
     * Starts the secure HTTPS server
     */
    startSecure(port?: number): Promise<void>;
    /**
     * Starts HTTP server that redirects to HTTPS
     */
    startRedirectServer(httpPort?: number, httpsPort?: number): void;
    /**
     * Gracefully shuts down the servers
     */
    shutdown(): Promise<void>;
    getApp(): express.Application;
}
export declare const secureServer: SecureServer;
//# sourceMappingURL=SecureServer.d.ts.map