import { ParsedContent } from '../../../models/core';
export interface NormalizationOptions {
    normalizeEncoding?: boolean;
    normalizeLineEndings?: boolean;
    normalizeQuotes?: boolean;
    normalizeDashes?: boolean;
    normalizeSpaces?: boolean;
    normalizeNumbers?: boolean;
    normalizeDates?: boolean;
    normalizeUrls?: boolean;
    preserveFormatting?: boolean;
}
export interface NormalizationResult {
    normalizedText: string;
    originalLength: number;
    normalizedLength: number;
    normalizations: string[];
    statistics: {
        quotesNormalized: number;
        dashesNormalized: number;
        spacesNormalized: number;
        numbersNormalized: number;
        datesNormalized: number;
        urlsNormalized: number;
    };
}
export declare class ContentNormalizer {
    /**
     * Normalize content based on provided options
     */
    normalize(content: string, options?: NormalizationOptions): NormalizationResult;
    /**
     * Normalize parsed content and update the content object
     */
    normalizeParsedContent(parsedContent: ParsedContent, options?: NormalizationOptions): ParsedContent;
    /**
     * Apply standard normalization for text analysis
     */
    standardNormalization(content: string): NormalizationResult;
    /**
     * Apply aggressive normalization for machine learning
     */
    aggressiveNormalization(content: string): NormalizationResult;
    /**
     * Normalize content for comparison purposes
     */
    normalizeForComparison(content: string): string;
    /**
     * Get normalization statistics for content
     */
    getStatistics(content: string): {
        encoding: number;
        quotes: number;
        dashes: number;
        spaces: number;
        numbers: number;
        dates: number;
        urls: number;
    };
}
//# sourceMappingURL=ContentNormalizer.d.ts.map