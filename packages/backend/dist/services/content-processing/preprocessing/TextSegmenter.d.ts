import { ParsedContent, TextLocation } from '../../../models/core';
export interface SegmentationOptions {
    segmentBySentences?: boolean;
    segmentByParagraphs?: boolean;
    segmentBySemanticBlocks?: boolean;
    maxSegmentLength?: number;
    minSegmentLength?: number;
    overlapLength?: number;
    preserveStructure?: boolean;
}
export interface TextSegment {
    id: string;
    text: string;
    type: 'sentence' | 'paragraph' | 'semantic_block' | 'chunk';
    location: TextLocation;
    metadata: {
        wordCount: number;
        characterCount: number;
        index: number;
        parentSegment?: string;
    };
}
export interface SegmentationResult {
    segments: TextSegment[];
    totalSegments: number;
    averageLength: number;
    statistics: {
        sentences: number;
        paragraphs: number;
        semanticBlocks: number;
        chunks: number;
    };
}
export declare class TextSegmenter {
    /**
     * Segment text based on provided options
     */
    segment(content: string, options?: SegmentationOptions): SegmentationResult;
    /**
     * Extract sentences from text
     */
    private extractSentences;
    /**
     * Extract paragraphs from text
     */
    private extractParagraphs;
    /**
     * Extract semantic blocks (sections, lists, etc.)
     */
    private extractSemanticBlocks;
    /**
     * Create fixed-size chunks with optional overlap
     */
    private createChunks;
    /**
     * Segment parsed content and update the content object
     */
    segmentParsedContent(parsedContent: ParsedContent, options?: SegmentationOptions): ParsedContent & {
        segmentation: SegmentationResult;
    };
    /**
     * Get optimal segmentation for content length
     */
    getOptimalSegmentation(contentLength: number): SegmentationOptions;
    /**
     * Merge small segments with adjacent ones
     */
    mergeSmallSegments(segments: TextSegment[], minLength: number): TextSegment[];
    /**
     * Helper methods
     */
    private countWords;
    private getLineNumber;
}
//# sourceMappingURL=TextSegmenter.d.ts.map