import { VerificationResult } from '../../models/core/VerificationResult';
import { ParsedContent } from '../../models/core/ParsedContent';
export interface CacheConfig {
    redis: {
        host: string;
        port: number;
        password?: string;
        db?: number;
    };
    ttl: {
        verificationResults: number;
        parsedContent: number;
        knowledgeBase: number;
        complianceRules: number;
        userSessions: number;
    };
    enabled: boolean;
}
export declare class CacheManager {
    private cache;
    private logger;
    private config;
    constructor(config: CacheConfig);
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    cacheVerificationResult(contentHash: string, result: VerificationResult): Promise<void>;
    getVerificationResult(contentHash: string): Promise<VerificationResult | null>;
    cacheParsedContent(contentHash: string, parsedContent: ParsedContent): Promise<void>;
    getParsedContent(contentHash: string): Promise<ParsedContent | null>;
    cacheKnowledgeBaseQuery(query: string, results: any[]): Promise<void>;
    getKnowledgeBaseQuery(query: string): Promise<any[] | null>;
    cacheComplianceRules(domain: string, jurisdiction: string, rules: any[]): Promise<void>;
    getComplianceRules(domain: string, jurisdiction: string): Promise<any[] | null>;
    cacheUserSession(sessionId: string, sessionData: any): Promise<void>;
    getUserSession(sessionId: string): Promise<any | null>;
    invalidateUserSession(sessionId: string): Promise<void>;
    batchCacheVerificationResults(results: Array<{
        contentHash: string;
        result: VerificationResult;
    }>): Promise<void>;
    batchGetVerificationResults(contentHashes: string[]): Promise<(VerificationResult | null)[]>;
    clearCache(pattern?: string): Promise<void>;
    getCacheStats(): Promise<any>;
    private hashString;
    generateContentHash(content: string): string;
    warmCache(): Promise<void>;
}
//# sourceMappingURL=CacheManager.d.ts.map