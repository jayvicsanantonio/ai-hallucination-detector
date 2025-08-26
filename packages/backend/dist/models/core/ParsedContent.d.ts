import { ContentType, EntityType } from './ContentTypes';
import { DocumentStructure, TextLocation } from './TextLocation';
export interface ParsedContent {
    id: string;
    originalContent: string;
    extractedText: string;
    contentType: ContentType;
    structure: DocumentStructure;
    entities: ExtractedEntity[];
    metadata: ContentMetadata;
    createdAt: Date;
}
export interface ExtractedEntity {
    type: EntityType;
    value: string;
    confidence: number;
    location: TextLocation;
    context: string;
}
export interface ContentMetadata {
    filename?: string;
    fileSize?: number;
    author?: string;
    createdDate?: Date;
    modifiedDate?: Date;
    language?: string;
    encoding?: string;
    pageCount?: number;
    wordCount?: number;
    characterCount?: number;
    lineCount?: number;
    paragraphCount?: number;
    extractedAt?: string;
    processedAt?: string;
    processingTime?: number;
    entityCount?: number;
    sectionCount?: number;
    processingOptions?: any;
    sanitized?: boolean;
    sanitizationOptions?: any;
    sanitizedAt?: string;
    objectCount?: number;
    arrayCount?: number;
    maxDepth?: number;
    keyCount?: number;
    jsonStructure?: any;
    warnings?: any[];
    info?: any;
    source?: string;
    version?: string;
    preprocessing?: any;
    sanitization?: any;
    normalization?: any;
    segmentation?: any;
    privacySanitization?: any;
    customFields?: Record<string, any>;
}
//# sourceMappingURL=ParsedContent.d.ts.map