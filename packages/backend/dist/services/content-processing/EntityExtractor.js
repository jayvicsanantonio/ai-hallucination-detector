"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityExtractor = void 0;
const natural = __importStar(require("natural"));
class EntityExtractor {
    constructor() {
        this.tokenizer = new natural.WordTokenizer();
    }
    /**
     * Extract entities from text using regex patterns
     */
    async extractEntities(text) {
        const entities = [];
        // Extract additional entities using regex patterns
        await this.extractRegexEntities(text, entities);
        // Extract domain-specific entities
        await this.extractDomainEntities(text, entities);
        // Extract basic named entities using simple patterns
        await this.extractBasicNamedEntities(text, entities);
        return entities;
    }
    /**
     * Extract entities using regex patterns
     */
    async extractRegexEntities(text, entities) {
        // Email addresses
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        this.extractWithRegex(text, emailRegex, 'email', 0.95, entities);
        // Phone numbers
        const phoneRegex = /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g;
        this.extractWithRegex(text, phoneRegex, 'phone', 0.9, entities);
        // URLs
        const urlRegex = /https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\/_.])*(?:\?(?:[\w&=%.])*)?(?:\#(?:[\w.])*)?)?/g;
        this.extractWithRegex(text, urlRegex, 'url', 0.95, entities);
        // Social Security Numbers (masked for privacy)
        const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
        this.extractWithRegex(text, ssnRegex, 'ssn', 0.9, entities);
        // Credit Card Numbers (masked for privacy)
        const ccRegex = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g;
        this.extractWithRegex(text, ccRegex, 'credit_card', 0.8, entities);
        // IP Addresses
        const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
        this.extractWithRegex(text, ipRegex, 'ip_address', 0.9, entities);
        // Monetary amounts with currency symbols
        const moneyRegex = /[$€£¥₹]\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\b\d{1,3}(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|EUR|GBP|JPY|INR|dollars?|euros?|pounds?)\b/gi;
        this.extractWithRegex(text, moneyRegex, 'amount', 0.85, entities);
        // Percentages
        const percentRegex = /\b\d+(?:\.\d+)?%\b/g;
        this.extractWithRegex(text, percentRegex, 'percentage', 0.9, entities);
        // Dates
        const dateRegex = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/g;
        this.extractWithRegex(text, dateRegex, 'date', 0.9, entities);
    }
    /**
     * Extract domain-specific entities
     */
    async extractDomainEntities(text, entities) {
        // Legal entities
        const legalEntityRegex = /\b[A-Z][a-z]+ (?:Inc|Corp|LLC|Ltd|Company|Corporation|LP|LLP|PC|PA)\b/g;
        this.extractWithRegex(text, legalEntityRegex, 'legal_entity', 0.8, entities);
        // Medical terms (basic patterns)
        const medicalTermRegex = /\b(?:mg|ml|mcg|IU|units?)\b|\b\d+(?:\.\d+)?\s*(?:mg|ml|mcg|IU|units?)\b/gi;
        this.extractWithRegex(text, medicalTermRegex, 'medical_term', 0.7, entities);
        // Financial instruments
        const financialRegex = /\b(?:stock|bond|option|future|derivative|security|share|equity|debt)\b/gi;
        this.extractWithRegex(text, financialRegex, 'financial_instrument', 0.6, entities);
        // Regulatory references
        const regulationRegex = /\b(?:SEC|FDA|HIPAA|GDPR|SOX|Basel|Dodd-Frank|MiFID|CFTC|FINRA)\b/g;
        this.extractWithRegex(text, regulationRegex, 'regulation', 0.9, entities);
        // Insurance terms
        const insuranceRegex = /\b(?:policy|premium|deductible|coverage|claim|beneficiary|underwriter)\b/gi;
        this.extractWithRegex(text, insuranceRegex, 'insurance_term', 0.6, entities);
    }
    /**
     * Extract basic named entities using simple patterns
     */
    async extractBasicNamedEntities(text, entities) {
        // Person names (simple pattern)
        const personPattern = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;
        this.extractWithRegex(text, personPattern, 'person', 0.6, entities);
        // Organizations (simple pattern)
        const orgPattern = /\b[A-Z][a-z]+ (?:Inc|Corp|LLC|Ltd|Company|Corporation|Group|Holdings|Partners)\b/g;
        this.extractWithRegex(text, orgPattern, 'organization', 0.7, entities);
    }
    /**
     * Extract entities using a regex pattern
     */
    extractWithRegex(text, regex, entityType, confidence, entities) {
        let match;
        while ((match = regex.exec(text)) !== null) {
            const location = {
                start: match.index,
                end: match.index + match[0].length,
                line: this.getLineNumber(text, match.index),
            };
            entities.push({
                type: entityType,
                value: match[0],
                confidence,
                location,
                context: this.getContext(text, match.index),
            });
        }
    }
    /**
     * Find all locations of a text substring
     */
    findTextLocations(text, searchText) {
        const locations = [];
        let index = text.indexOf(searchText);
        while (index !== -1) {
            locations.push({
                start: index,
                end: index + searchText.length,
                line: this.getLineNumber(text, index),
            });
            index = text.indexOf(searchText, index + 1);
        }
        return locations;
    }
    /**
     * Get line number for a given position in text
     */
    getLineNumber(text, position) {
        return text.substring(0, position).split('\n').length;
    }
    /**
     * Get context around a position in text
     */
    getContext(text, position, contextLength = 50) {
        const start = Math.max(0, position - contextLength);
        const end = Math.min(text.length, position + contextLength);
        return text.substring(start, end);
    }
    /**
     * Tokenize text into words
     */
    tokenize(text) {
        return this.tokenizer.tokenize(text) || [];
    }
    /**
     * Calculate text similarity using Jaro-Winkler distance
     */
    calculateSimilarity(text1, text2) {
        return natural.JaroWinklerDistance(text1, text2);
    }
    /**
     * Extract key phrases from text using simple frequency analysis
     */
    extractKeyPhrases(text, maxPhrases = 10) {
        const words = this.tokenize(text.toLowerCase());
        const stopWords = new Set([
            'the',
            'a',
            'an',
            'and',
            'or',
            'but',
            'in',
            'on',
            'at',
            'to',
            'for',
            'of',
            'with',
            'by',
            'is',
            'are',
            'was',
            'were',
            'be',
            'been',
            'being',
            'have',
            'has',
            'had',
            'do',
            'does',
            'did',
            'will',
            'would',
            'could',
            'should',
            'may',
            'might',
            'must',
            'can',
            'this',
            'that',
            'these',
            'those',
        ]);
        // Filter out stop words and short words
        const filteredWords = words.filter((word) => word.length > 2 &&
            !stopWords.has(word) &&
            /^[a-zA-Z]+$/.test(word));
        // Count word frequency
        const wordFreq = new Map();
        filteredWords.forEach((word) => {
            wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
        });
        // Sort by frequency and return top phrases
        return Array.from(wordFreq.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxPhrases)
            .map(([word]) => word);
    }
}
exports.EntityExtractor = EntityExtractor;
//# sourceMappingURL=EntityExtractor.js.map