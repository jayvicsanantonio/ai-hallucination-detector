import { VerificationEngine as IVerificationEngine, VerificationRequest, VerificationStatus } from './interfaces/VerificationEngine';
import { VerificationResult } from '@/models/core/VerificationResult';
import { DomainModule } from '@/modules/interfaces/DomainModule';
import { Logger } from '@/utils/Logger';
export declare class VerificationEngine implements IVerificationEngine {
    private readonly logger;
    private readonly modules;
    private readonly activeVerifications;
    private readonly maxConcurrentVerifications;
    private readonly defaultTimeout;
    private readonly resultsProcessor;
    constructor(modules?: DomainModule[], options?: {
        maxConcurrentVerifications?: number;
        defaultTimeout?: number;
        logger?: Logger;
        enableCaching?: boolean;
        cacheTtl?: number;
    });
    verifyContent(request: VerificationRequest): Promise<VerificationResult>;
    getVerificationStatus(verificationId: string): Promise<VerificationStatus>;
    cancelVerification(verificationId: string): Promise<boolean>;
    private validateRequest;
    private runVerificationModules;
    private runModuleWithTimeout;
    private updateVerificationStatus;
    private addAuditEntry;
    registerModule(module: DomainModule): void;
    unregisterModule(domain: string): boolean;
    getRegisteredModules(): string[];
    getActiveVerificationCount(): number;
    getCachedResult(verificationId: string): Promise<VerificationResult | null>;
    invalidateCache(cacheKey?: string): Promise<void>;
    getProcessingMetrics(): import("./ResultsProcessor").ResultsMetrics;
    getCacheStats(): Promise<import("./ResultsCache").CacheStats>;
}
//# sourceMappingURL=VerificationEngine.d.ts.map