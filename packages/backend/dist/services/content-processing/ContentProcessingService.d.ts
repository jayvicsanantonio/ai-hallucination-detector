import { ParsedContent, ContentType } from '../../models/core';
export interface ContentProcessingOptions {
    extractEntities?: boolean;
    enhanceEntities?: boolean;
    preserveFormatting?: boolean;
    maxContentLength?: number;
    timeout?: number;
}
export declare class ContentProcessingService {
    private entityExtractor;
    constructor();
    /**
     * Process document content and return parsed structure
     */
    processContent(content: Buffer | string, contentType: ContentType, options?: ContentProcessingOptions, metadata?: Record<string, any>): Promise<ParsedContent>;
    /**
     * Process multiple documents in batch
     */
    processBatch(documents: Array<{
        id: string;
        content: Buffer | string;
        contentType: ContentType;
        metadata?: Record<string, any>;
    }>, options?: ContentProcessingOptions): Promise<Array<{
        id: string;
        result?: ParsedContent;
        error?: string;
    }>>;
    /**
     * Get supported content types
     */
    getSupportedContentTypes(): ContentType[];
    /**
     * Check if content type is supported
     */
    isContentTypeSupported(contentType: ContentType): boolean;
    /**
     * Validate content before processing
     */
    validateContent(content: Buffer | string, contentType: ContentType, options?: ContentProcessingOptions): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Extract key phrases from processed content
     */
    extractKeyPhrases(parsedContent: ParsedContent, maxPhrases?: number): Promise<string[]>;
    /**
     * Calculate content similarity between two parsed documents
     */
    calculateContentSimilarity(content1: ParsedContent, content2: ParsedContent): number;
    /**
     * Get content statistics
     */
    getContentStatistics(parsedContent: ParsedContent): {
        wordCount: number;
        characterCount: number;
        sentenceCount: number;
        paragraphCount: number;
        entityCount: number;
        sectionCount: number;
        tableCount: number;
        figureCount: number;
        referenceCount: number;
    };
    /**
     * Sanitize content by removing or masking sensitive information
     */
    sanitizeContent(parsedContent: ParsedContent, options?: {
        maskEmails?: boolean;
        maskPhones?: boolean;
        maskSSNs?: boolean;
        maskCreditCards?: boolean;
        removeUrls?: boolean;
    }): ParsedContent;
}
//# sourceMappingURL=ContentProcessingService.d.ts.map