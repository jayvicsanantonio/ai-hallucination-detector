import { ParsedContent } from '../../../models/core';
export interface SanitizationOptions {
    removeHtml?: boolean;
    removeMarkdown?: boolean;
    normalizeWhitespace?: boolean;
    removeEmptyLines?: boolean;
    trimLines?: boolean;
    convertToLowercase?: boolean;
    removeSpecialCharacters?: boolean;
    preserveStructure?: boolean;
    maxLineLength?: number;
}
export interface SanitizationResult {
    sanitizedText: string;
    originalLength: number;
    sanitizedLength: number;
    removedElements: string[];
    transformations: string[];
}
export declare class ContentSanitizer {
    /**
     * Sanitize content based on provided options
     */
    sanitize(content: string, options?: SanitizationOptions): SanitizationResult;
    /**
     * Sanitize parsed content and update the content object
     */
    sanitizeParsedContent(parsedContent: ParsedContent, options?: SanitizationOptions): ParsedContent;
    /**
     * Remove sensitive information from content
     */
    removeSensitiveInfo(content: string): SanitizationResult;
    /**
     * Clean up text for analysis (remove noise but preserve meaning)
     */
    cleanForAnalysis(content: string): SanitizationResult;
    /**
     * Prepare content for machine learning processing
     */
    prepareForML(content: string): SanitizationResult;
}
//# sourceMappingURL=ContentSanitizer.d.ts.map