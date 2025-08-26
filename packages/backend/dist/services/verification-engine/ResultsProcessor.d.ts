import { VerificationResult } from '@/models/core/VerificationResult';
import { VerificationRequest } from './interfaces/VerificationEngine';
import { ValidationResult } from '@/modules/interfaces/DomainModule';
import { RiskLevel, IssueType } from '@/models/core/ContentTypes';
export interface ProcessorConfig {
    enableCaching?: boolean;
    cacheTtl?: number;
    enablePersistence?: boolean;
    confidenceWeights?: Record<string, number>;
}
export interface ResultsMetrics {
    totalProcessed: number;
    averageConfidence: number;
    riskDistribution: Record<RiskLevel, number>;
    issueTypeDistribution: Record<IssueType, number>;
    averageProcessingTime: number;
}
export declare class ResultsProcessor {
    private readonly logger;
    private readonly cache;
    private readonly config;
    private metrics;
    constructor(config?: ProcessorConfig);
    processResults(verificationId: string, request: VerificationRequest, moduleResults: ValidationResult[], processingTime: number): Promise<VerificationResult>;
    getResult(verificationId: string): Promise<VerificationResult | null>;
    invalidateCache(cacheKey?: string): Promise<void>;
    getMetrics(): ResultsMetrics;
    getCacheStats(): Promise<import("./ResultsCache").CacheStats>;
    private aggregateModuleResults;
    private applyConfidenceWeighting;
    private formatResult;
    private calculateRiskLevel;
    private generateRecommendations;
    private generateCacheKey;
    private persistResult;
    private getPersistedResult;
    private updateMetrics;
}
//# sourceMappingURL=ResultsProcessor.d.ts.map