import { ParsedContent } from '../../../models/core';
export interface ExtractedMetadata {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
    description?: string;
    language?: string;
    readabilityScore?: number;
    complexity?: 'low' | 'medium' | 'high';
    sentiment?: 'positive' | 'negative' | 'neutral';
    tone?: 'formal' | 'informal' | 'technical' | 'conversational';
    hasHeaders?: boolean;
    hasTables?: boolean;
    hasFigures?: boolean;
    hasReferences?: boolean;
    hasLists?: boolean;
    topics?: string[];
    categories?: string[];
    tags?: string[];
    completeness?: number;
    coherence?: number;
    accuracy?: number;
    dateReferences?: string[];
    timeReferences?: string[];
    entitySummary?: {
        people: string[];
        organizations: string[];
        locations: string[];
        amounts: string[];
        dates: string[];
    };
}
export interface MetadataExtractionOptions {
    extractTitle?: boolean;
    extractAuthor?: boolean;
    extractKeywords?: boolean;
    extractTopics?: boolean;
    calculateReadability?: boolean;
    analyzeSentiment?: boolean;
    analyzeTone?: boolean;
    extractEntities?: boolean;
    maxKeywords?: number;
    maxTopics?: number;
}
export declare class MetadataExtractor {
    /**
     * Extract comprehensive metadata from parsed content
     */
    extractMetadata(parsedContent: ParsedContent, options?: MetadataExtractionOptions): ExtractedMetadata;
    /**
     * Extract title from content
     */
    private extractTitle;
    /**
     * Extract author from content
     */
    private extractAuthor;
    /**
     * Extract keywords using frequency analysis
     */
    private extractKeywords;
    /**
     * Extract topics using simple clustering
     */
    private extractTopics;
    /**
     * Check if two keywords are related (appear near each other)
     */
    private areRelated;
    /**
     * Calculate readability score (simplified Flesch Reading Ease)
     */
    private calculateReadability;
    /**
     * Count syllables in a word (simplified)
     */
    private countSyllables;
    /**
     * Determine complexity based on readability score
     */
    private determineComplexity;
    /**
     * Analyze sentiment (simplified)
     */
    private analyzeSentiment;
    /**
     * Analyze tone (simplified)
     */
    private analyzeTone;
    /**
     * Detect lists in text
     */
    private detectLists;
    /**
     * Summarize entities by type
     */
    private summarizeEntities;
    /**
     * Extract date references
     */
    private extractDateReferences;
    /**
     * Extract time references
     */
    private extractTimeReferences;
    /**
     * Calculate completeness score
     */
    private calculateCompleteness;
    /**
     * Calculate coherence score (simplified)
     */
    private calculateCoherence;
    /**
     * Detect language (simplified)
     */
    private detectLanguage;
    /**
     * Extract categories based on content
     */
    private extractCategories;
    /**
     * Extract tags based on entities and keywords
     */
    private extractTags;
}
//# sourceMappingURL=MetadataExtractor.d.ts.map