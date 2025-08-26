import { ParsedContent, ContentType, DocumentStructure, ExtractedEntity } from '../../../models/core';
export interface DocumentParser {
    /**
     * Parse document content and extract structured information
     */
    parse(content: Buffer | string, metadata?: Record<string, any>): Promise<ParsedContent>;
    /**
     * Check if this parser supports the given content type
     */
    supports(contentType: ContentType): boolean;
    /**
     * Get the supported content types for this parser
     */
    getSupportedTypes(): ContentType[];
}
export interface ParsingOptions {
    extractEntities?: boolean;
    preserveFormatting?: boolean;
    includeMetadata?: boolean;
    maxContentLength?: number;
}
export interface ParsingResult {
    extractedText: string;
    structure: DocumentStructure;
    entities: ExtractedEntity[];
    metadata: Record<string, any>;
}
//# sourceMappingURL=DocumentParser.d.ts.map