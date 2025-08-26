import { DocumentParser } from './interfaces/DocumentParser';
import { ContentType } from '../../models/core';
export declare class DocumentParserFactory {
    private static parsers;
    /**
     * Get appropriate parser for the given content type
     */
    static getParser(contentType: ContentType): DocumentParser;
    /**
     * Get all supported content types
     */
    static getSupportedTypes(): ContentType[];
    /**
     * Check if a content type is supported
     */
    static isSupported(contentType: ContentType): boolean;
    /**
     * Register a new parser
     */
    static registerParser(parser: DocumentParser): void;
    /**
     * Get all registered parsers
     */
    static getAllParsers(): DocumentParser[];
}
//# sourceMappingURL=DocumentParserFactory.d.ts.map