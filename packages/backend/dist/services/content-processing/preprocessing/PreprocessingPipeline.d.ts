import { ParsedContent } from '../../../models/core';
import { SanitizationOptions } from './ContentSanitizer';
import { NormalizationOptions } from './ContentNormalizer';
import { SegmentationOptions } from './TextSegmenter';
import { MetadataExtractionOptions, ExtractedMetadata } from './MetadataExtractor';
export interface PreprocessingOptions {
    sanitization?: SanitizationOptions;
    normalization?: NormalizationOptions;
    segmentation?: SegmentationOptions;
    metadataExtraction?: MetadataExtractionOptions;
    enableSanitization?: boolean;
    enableNormalization?: boolean;
    enableSegmentation?: boolean;
    enableMetadataExtraction?: boolean;
}
export interface PreprocessingResult {
    processedContent: ParsedContent;
    extractedMetadata?: ExtractedMetadata;
    segmentation?: any;
    processingStats: {
        originalLength: number;
        processedLength: number;
        processingTime: number;
        stepsApplied: string[];
    };
}
export declare class PreprocessingPipeline {
    private sanitizer;
    private normalizer;
    private segmenter;
    private metadataExtractor;
    constructor();
    /**
     * Process content through the complete preprocessing pipeline
     */
    process(parsedContent: ParsedContent, options?: PreprocessingOptions): Promise<PreprocessingResult>;
    /**
     * Apply quick preprocessing for analysis
     */
    quickPreprocess(parsedContent: ParsedContent): Promise<PreprocessingResult>;
    /**
     * Apply comprehensive preprocessing for detailed analysis
     */
    comprehensivePreprocess(parsedContent: ParsedContent): Promise<PreprocessingResult>;
    /**
     * Prepare content for machine learning processing
     */
    prepareForML(parsedContent: ParsedContent): Promise<PreprocessingResult>;
    /**
     * Clean content for verification analysis
     */
    prepareForVerification(parsedContent: ParsedContent): Promise<PreprocessingResult>;
    /**
     * Sanitize content for privacy compliance
     */
    sanitizeForPrivacy(parsedContent: ParsedContent): Promise<PreprocessingResult>;
    /**
     * Get preprocessing recommendations based on content characteristics
     */
    getRecommendations(parsedContent: ParsedContent): PreprocessingOptions;
    /**
     * Validate preprocessing options
     */
    validateOptions(options: PreprocessingOptions): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Get processing statistics
     */
    getProcessingStats(results: PreprocessingResult[]): {
        totalProcessed: number;
        averageProcessingTime: number;
        averageReduction: number;
        mostCommonSteps: string[];
    };
}
//# sourceMappingURL=PreprocessingPipeline.d.ts.map