"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentNormalizer = void 0;
class ContentNormalizer {
    /**
     * Normalize content based on provided options
     */
    normalize(content, options = {}) {
        const { normalizeEncoding = true, normalizeLineEndings = true, normalizeQuotes = true, normalizeDashes = true, normalizeSpaces = true, normalizeNumbers = false, normalizeDates = false, normalizeUrls = false, preserveFormatting = true, } = options;
        let normalizedText = content;
        const originalLength = content.length;
        const normalizations = [];
        const statistics = {
            quotesNormalized: 0,
            dashesNormalized: 0,
            spacesNormalized: 0,
            numbersNormalized: 0,
            datesNormalized: 0,
            urlsNormalized: 0,
        };
        // Normalize encoding (handle common encoding issues)
        if (normalizeEncoding) {
            // Replace common encoding artifacts
            normalizedText = normalizedText.replace(/â€™/g, "'"); // Smart apostrophe
            normalizedText = normalizedText.replace(/â€œ/g, '"'); // Smart quote open
            normalizedText = normalizedText.replace(/â€/g, '"'); // Smart quote close
            normalizedText = normalizedText.replace(/â€"/g, '—'); // Em dash
            normalizedText = normalizedText.replace(/â€"/g, '–'); // En dash
            normalizations.push('Encoding artifacts normalized');
        }
        // Normalize line endings
        if (normalizeLineEndings) {
            // Convert all line endings to \n
            normalizedText = normalizedText.replace(/\r\n/g, '\n');
            normalizedText = normalizedText.replace(/\r/g, '\n');
            normalizations.push('Line endings normalized');
        }
        // Normalize quotes
        if (normalizeQuotes) {
            const quotesBefore = (normalizedText.match(/[""'']/g) || [])
                .length;
            // Convert smart quotes to regular quotes
            normalizedText = normalizedText.replace(/[""]/g, '"');
            normalizedText = normalizedText.replace(/['']/g, "'");
            const quotesAfter = (normalizedText.match(/[""'']/g) || [])
                .length;
            statistics.quotesNormalized = quotesBefore - quotesAfter;
            if (statistics.quotesNormalized > 0) {
                normalizations.push('Smart quotes normalized');
            }
        }
        // Normalize dashes
        if (normalizeDashes) {
            const dashesBefore = (normalizedText.match(/[—–]/g) || [])
                .length;
            // Convert em dashes and en dashes to regular hyphens
            normalizedText = normalizedText.replace(/[—–]/g, '-');
            const dashesAfter = (normalizedText.match(/[—–]/g) || [])
                .length;
            statistics.dashesNormalized = dashesBefore - dashesAfter;
            if (statistics.dashesNormalized > 0) {
                normalizations.push('Dashes normalized');
            }
        }
        // Normalize spaces
        if (normalizeSpaces) {
            const spacesBefore = normalizedText.length;
            // Replace non-breaking spaces and other space characters
            normalizedText = normalizedText.replace(/[\u00A0\u2000-\u200B\u2028\u2029]/g, ' ');
            // Replace multiple consecutive spaces with single space (unless preserving formatting)
            if (!preserveFormatting) {
                normalizedText = normalizedText.replace(/  +/g, ' ');
            }
            const spacesAfter = normalizedText.length;
            statistics.spacesNormalized = Math.abs(spacesBefore - spacesAfter);
            if (statistics.spacesNormalized > 0) {
                normalizations.push('Spaces normalized');
            }
        }
        // Normalize numbers
        if (normalizeNumbers) {
            const numbersBefore = (normalizedText.match(/\d+/g) || [])
                .length;
            // Normalize number formats (remove commas in large numbers)
            normalizedText = normalizedText.replace(/\b\d{1,3}(,\d{3})+\b/g, (match) => {
                return match.replace(/,/g, '');
            });
            // Normalize decimal separators (convert European format)
            normalizedText = normalizedText.replace(/\b\d+,\d{2}\b/g, (match) => {
                return match.replace(',', '.');
            });
            const numbersAfter = (normalizedText.match(/\d+/g) || [])
                .length;
            statistics.numbersNormalized = Math.abs(numbersBefore - numbersAfter);
            if (statistics.numbersNormalized > 0) {
                normalizations.push('Number formats normalized');
            }
        }
        // Normalize dates
        if (normalizeDates) {
            const datesBefore = (normalizedText.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g) ||
                []).length;
            // Convert various date formats to ISO format (YYYY-MM-DD)
            normalizedText = normalizedText.replace(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/g, (match, month, day, year) => {
                const m = month.padStart(2, '0');
                const d = day.padStart(2, '0');
                return `${year}-${m}-${d}`;
            });
            // Handle 2-digit years (assume 20xx for years < 50, 19xx for years >= 50)
            normalizedText = normalizedText.replace(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})\b/g, (match, month, day, year) => {
                const m = month.padStart(2, '0');
                const d = day.padStart(2, '0');
                const y = parseInt(year) < 50 ? `20${year}` : `19${year}`;
                return `${y}-${m}-${d}`;
            });
            const datesAfter = (normalizedText.match(/\d{4}-\d{2}-\d{2}/g) || []).length;
            statistics.datesNormalized = datesAfter - datesBefore;
            if (statistics.datesNormalized > 0) {
                normalizations.push('Date formats normalized');
            }
        }
        // Normalize URLs
        if (normalizeUrls) {
            const urlsBefore = (normalizedText.match(/https?:\/\/[^\s]+/g) || []).length;
            // Normalize URL protocols (convert http to https where appropriate)
            normalizedText = normalizedText.replace(/http:\/\//g, 'https://');
            // Remove trailing slashes from URLs
            normalizedText = normalizedText.replace(/https?:\/\/[^\s]+\//g, (match) => {
                return match.endsWith('/') ? match.slice(0, -1) : match;
            });
            const urlsAfter = (normalizedText.match(/https?:\/\/[^\s]+/g) || []).length;
            statistics.urlsNormalized = Math.abs(urlsBefore - urlsAfter);
            if (statistics.urlsNormalized > 0) {
                normalizations.push('URLs normalized');
            }
        }
        return {
            normalizedText,
            originalLength,
            normalizedLength: normalizedText.length,
            normalizations,
            statistics,
        };
    }
    /**
     * Normalize parsed content and update the content object
     */
    normalizeParsedContent(parsedContent, options = {}) {
        const result = this.normalize(parsedContent.extractedText, options);
        return {
            ...parsedContent,
            extractedText: result.normalizedText,
            metadata: {
                ...parsedContent.metadata,
                normalization: {
                    applied: true,
                    options,
                    originalLength: result.originalLength,
                    normalizedLength: result.normalizedLength,
                    normalizations: result.normalizations,
                    statistics: result.statistics,
                    normalizedAt: new Date().toISOString(),
                },
            },
        };
    }
    /**
     * Apply standard normalization for text analysis
     */
    standardNormalization(content) {
        return this.normalize(content, {
            normalizeEncoding: true,
            normalizeLineEndings: true,
            normalizeQuotes: true,
            normalizeDashes: true,
            normalizeSpaces: true,
            normalizeNumbers: false,
            normalizeDates: false,
            normalizeUrls: false,
            preserveFormatting: true,
        });
    }
    /**
     * Apply aggressive normalization for machine learning
     */
    aggressiveNormalization(content) {
        return this.normalize(content, {
            normalizeEncoding: true,
            normalizeLineEndings: true,
            normalizeQuotes: true,
            normalizeDashes: true,
            normalizeSpaces: true,
            normalizeNumbers: true,
            normalizeDates: true,
            normalizeUrls: true,
            preserveFormatting: false,
        });
    }
    /**
     * Normalize content for comparison purposes
     */
    normalizeForComparison(content) {
        const result = this.normalize(content, {
            normalizeEncoding: true,
            normalizeLineEndings: true,
            normalizeQuotes: true,
            normalizeDashes: true,
            normalizeSpaces: true,
            normalizeNumbers: true,
            normalizeDates: true,
            normalizeUrls: true,
            preserveFormatting: false,
        });
        // Additional normalization for comparison
        return result.normalizedText
            .toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
    }
    /**
     * Get normalization statistics for content
     */
    getStatistics(content) {
        return {
            encoding: (content.match(/â€[™œ"]/g) || []).length,
            quotes: (content.match(/[""'']/g) || []).length,
            dashes: (content.match(/[—–]/g) || []).length,
            spaces: (content.match(/[\u00A0\u2000-\u200B\u2028\u2029]/g) || []).length,
            numbers: (content.match(/\d{1,3}(,\d{3})+/g) || []).length,
            dates: (content.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g) || []).length,
            urls: (content.match(/https?:\/\/[^\s]+/g) || []).length,
        };
    }
}
exports.ContentNormalizer = ContentNormalizer;
//# sourceMappingURL=ContentNormalizer.js.map