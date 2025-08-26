import { ExtractedEntity } from '../../models/core';
export declare class EntityExtractor {
    private tokenizer;
    constructor();
    /**
     * Extract entities from text using regex patterns
     */
    extractEntities(text: string): Promise<ExtractedEntity[]>;
    /**
     * Extract entities using regex patterns
     */
    private extractRegexEntities;
    /**
     * Extract domain-specific entities
     */
    private extractDomainEntities;
    /**
     * Extract basic named entities using simple patterns
     */
    private extractBasicNamedEntities;
    /**
     * Extract entities using a regex pattern
     */
    private extractWithRegex;
    /**
     * Find all locations of a text substring
     */
    private findTextLocations;
    /**
     * Get line number for a given position in text
     */
    private getLineNumber;
    /**
     * Get context around a position in text
     */
    private getContext;
    /**
     * Tokenize text into words
     */
    tokenize(text: string): string[];
    /**
     * Calculate text similarity using Jaro-Winkler distance
     */
    calculateSimilarity(text1: string, text2: string): number;
    /**
     * Extract key phrases from text using simple frequency analysis
     */
    extractKeyPhrases(text: string, maxPhrases?: number): string[];
}
//# sourceMappingURL=EntityExtractor.d.ts.map