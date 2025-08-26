"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreprocessingPipeline = void 0;
const ContentSanitizer_1 = require("./ContentSanitizer");
const ContentNormalizer_1 = require("./ContentNormalizer");
const TextSegmenter_1 = require("./TextSegmenter");
const MetadataExtractor_1 = require("./MetadataExtractor");
class PreprocessingPipeline {
    constructor() {
        this.sanitizer = new ContentSanitizer_1.ContentSanitizer();
        this.normalizer = new ContentNormalizer_1.ContentNormalizer();
        this.segmenter = new TextSegmenter_1.TextSegmenter();
        this.metadataExtractor = new MetadataExtractor_1.MetadataExtractor();
    }
    /**
     * Process content through the complete preprocessing pipeline
     */
    async process(parsedContent, options = {}) {
        const startTime = Date.now();
        const originalLength = parsedContent.extractedText.length;
        const stepsApplied = [];
        let processedContent = { ...parsedContent };
        let extractedMetadata;
        let segmentation;
        const { enableSanitization = false, enableNormalization = true, enableSegmentation = false, enableMetadataExtraction = true, sanitization = {}, normalization = {}, segmentation: segmentationOptions = {}, metadataExtraction = {}, } = options;
        try {
            // Step 1: Content Sanitization
            if (enableSanitization) {
                processedContent = this.sanitizer.sanitizeParsedContent(processedContent, sanitization);
                stepsApplied.push('sanitization');
            }
            // Step 2: Content Normalization
            if (enableNormalization) {
                processedContent = this.normalizer.normalizeParsedContent(processedContent, normalization);
                stepsApplied.push('normalization');
            }
            // Step 3: Text Segmentation
            if (enableSegmentation) {
                const segmentedContent = this.segmenter.segmentParsedContent(processedContent, segmentationOptions);
                processedContent = segmentedContent;
                segmentation = segmentedContent.segmentation;
                stepsApplied.push('segmentation');
            }
            // Step 4: Metadata Extraction
            if (enableMetadataExtraction) {
                extractedMetadata = this.metadataExtractor.extractMetadata(processedContent, metadataExtraction);
                stepsApplied.push('metadata_extraction');
            }
            // Update processing metadata
            const processingTime = Date.now() - startTime;
            processedContent.metadata = {
                ...processedContent.metadata,
                preprocessing: {
                    applied: true,
                    options,
                    stepsApplied,
                    processingTime,
                    processedAt: new Date().toISOString(),
                },
            };
            return {
                processedContent,
                extractedMetadata,
                segmentation,
                processingStats: {
                    originalLength,
                    processedLength: processedContent.extractedText.length,
                    processingTime,
                    stepsApplied,
                },
            };
        }
        catch (error) {
            throw new Error(`Preprocessing failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Apply quick preprocessing for analysis
     */
    async quickPreprocess(parsedContent) {
        return this.process(parsedContent, {
            enableNormalization: true,
            enableMetadataExtraction: true,
            normalization: {
                normalizeEncoding: true,
                normalizeLineEndings: true,
                normalizeQuotes: true,
                normalizeSpaces: true,
            },
            metadataExtraction: {
                extractTitle: true,
                extractKeywords: true,
                calculateReadability: true,
                extractEntities: true,
                maxKeywords: 5,
            },
        });
    }
    /**
     * Apply comprehensive preprocessing for detailed analysis
     */
    async comprehensivePreprocess(parsedContent) {
        return this.process(parsedContent, {
            enableSanitization: true,
            enableNormalization: true,
            enableSegmentation: true,
            enableMetadataExtraction: true,
            sanitization: {
                normalizeWhitespace: true,
                removeEmptyLines: true,
                trimLines: true,
                preserveStructure: true,
            },
            normalization: {
                normalizeEncoding: true,
                normalizeLineEndings: true,
                normalizeQuotes: true,
                normalizeDashes: true,
                normalizeSpaces: true,
                preserveFormatting: true,
            },
            segmentation: this.segmenter.getOptimalSegmentation(parsedContent.extractedText.length),
            metadataExtraction: {
                extractTitle: true,
                extractAuthor: true,
                extractKeywords: true,
                extractTopics: true,
                calculateReadability: true,
                analyzeSentiment: true,
                analyzeTone: true,
                extractEntities: true,
                maxKeywords: 10,
                maxTopics: 5,
            },
        });
    }
    /**
     * Prepare content for machine learning processing
     */
    async prepareForML(parsedContent) {
        return this.process(parsedContent, {
            enableSanitization: true,
            enableNormalization: true,
            enableSegmentation: true,
            enableMetadataExtraction: false,
            sanitization: {
                removeHtml: true,
                removeMarkdown: true,
                normalizeWhitespace: true,
                removeEmptyLines: true,
                trimLines: true,
                convertToLowercase: true,
                removeSpecialCharacters: true,
                preserveStructure: false,
            },
            normalization: {
                normalizeEncoding: true,
                normalizeLineEndings: true,
                normalizeQuotes: true,
                normalizeDashes: true,
                normalizeSpaces: true,
                normalizeNumbers: true,
                preserveFormatting: false,
            },
            segmentation: {
                segmentByParagraphs: true,
                maxSegmentLength: 512,
                minSegmentLength: 50,
                overlapLength: 25,
            },
        });
    }
    /**
     * Clean content for verification analysis
     */
    async prepareForVerification(parsedContent) {
        return this.process(parsedContent, {
            enableSanitization: true,
            enableNormalization: true,
            enableSegmentation: true,
            enableMetadataExtraction: true,
            sanitization: {
                removeHtml: true,
                removeMarkdown: true,
                normalizeWhitespace: true,
                removeEmptyLines: true,
                trimLines: true,
                preserveStructure: true,
            },
            normalization: {
                normalizeEncoding: true,
                normalizeLineEndings: true,
                normalizeQuotes: true,
                normalizeDashes: true,
                normalizeSpaces: true,
                preserveFormatting: true,
            },
            segmentation: {
                segmentBySentences: true,
                maxSegmentLength: 200,
                minSegmentLength: 20,
            },
            metadataExtraction: {
                extractTitle: true,
                extractKeywords: true,
                extractTopics: true,
                calculateReadability: true,
                extractEntities: true,
                maxKeywords: 15,
                maxTopics: 8,
            },
        });
    }
    /**
     * Sanitize content for privacy compliance
     */
    async sanitizeForPrivacy(parsedContent) {
        // First remove sensitive information
        const sensitiveInfoResult = this.sanitizer.removeSensitiveInfo(parsedContent.extractedText);
        const sanitizedContent = {
            ...parsedContent,
            extractedText: sensitiveInfoResult.sanitizedText,
            metadata: {
                ...parsedContent.metadata,
                privacySanitization: {
                    applied: true,
                    removedElements: sensitiveInfoResult.removedElements,
                    transformations: sensitiveInfoResult.transformations,
                    sanitizedAt: new Date().toISOString(),
                },
            },
        };
        return this.process(sanitizedContent, {
            enableSanitization: true,
            enableNormalization: true,
            enableMetadataExtraction: false,
            sanitization: {
                normalizeWhitespace: true,
                removeEmptyLines: true,
                trimLines: true,
                preserveStructure: true,
            },
            normalization: {
                normalizeEncoding: true,
                normalizeLineEndings: true,
                normalizeSpaces: true,
                preserveFormatting: true,
            },
        });
    }
    /**
     * Get preprocessing recommendations based on content characteristics
     */
    getRecommendations(parsedContent) {
        const textLength = parsedContent.extractedText.length;
        const hasStructure = parsedContent.structure.sections.length > 0;
        const hasEntities = parsedContent.entities.length > 0;
        const recommendations = {
            enableNormalization: true,
            enableMetadataExtraction: true,
        };
        // For short content, focus on basic processing
        if (textLength < 500) {
            recommendations.normalization = {
                normalizeEncoding: true,
                normalizeSpaces: true,
                preserveFormatting: true,
            };
            recommendations.metadataExtraction = {
                extractKeywords: true,
                calculateReadability: true,
                maxKeywords: 3,
            };
        }
        // For medium content, add more processing
        else if (textLength < 5000) {
            recommendations.enableSegmentation = true;
            recommendations.normalization = {
                normalizeEncoding: true,
                normalizeLineEndings: true,
                normalizeQuotes: true,
                normalizeSpaces: true,
                preserveFormatting: true,
            };
            recommendations.segmentation = {
                segmentByParagraphs: true,
                maxSegmentLength: 500,
                minSegmentLength: 50,
            };
            recommendations.metadataExtraction = {
                extractTitle: true,
                extractKeywords: true,
                extractTopics: true,
                calculateReadability: true,
                extractEntities: true,
                maxKeywords: 8,
                maxTopics: 3,
            };
        }
        // For long content, use comprehensive processing
        else {
            recommendations.enableSanitization = true;
            recommendations.enableSegmentation = true;
            recommendations.sanitization = {
                normalizeWhitespace: true,
                removeEmptyLines: true,
                trimLines: true,
                preserveStructure: true,
            };
            recommendations.segmentation =
                this.segmenter.getOptimalSegmentation(textLength);
            recommendations.metadataExtraction = {
                extractTitle: true,
                extractAuthor: true,
                extractKeywords: true,
                extractTopics: true,
                calculateReadability: true,
                analyzeTone: true,
                extractEntities: true,
                maxKeywords: 12,
                maxTopics: 5,
            };
        }
        return recommendations;
    }
    /**
     * Validate preprocessing options
     */
    validateOptions(options) {
        const errors = [];
        // Check for conflicting options
        if (options.sanitization?.convertToLowercase &&
            options.normalization?.preserveFormatting) {
            errors.push('Converting to lowercase conflicts with preserving formatting');
        }
        if (options.sanitization?.removeSpecialCharacters &&
            options.segmentation?.preserveStructure) {
            errors.push('Removing special characters may affect structure preservation');
        }
        // Check for reasonable limits
        if (options.metadataExtraction?.maxKeywords &&
            options.metadataExtraction.maxKeywords > 50) {
            errors.push('Maximum keywords should not exceed 50');
        }
        if (options.metadataExtraction?.maxTopics &&
            options.metadataExtraction.maxTopics > 20) {
            errors.push('Maximum topics should not exceed 20');
        }
        if (options.segmentation?.maxSegmentLength &&
            options.segmentation.maxSegmentLength < 10) {
            errors.push('Maximum segment length should be at least 10 characters');
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    /**
     * Get processing statistics
     */
    getProcessingStats(results) {
        if (results.length === 0) {
            return {
                totalProcessed: 0,
                averageProcessingTime: 0,
                averageReduction: 0,
                mostCommonSteps: [],
            };
        }
        const totalProcessingTime = results.reduce((sum, r) => sum + r.processingStats.processingTime, 0);
        const totalReduction = results.reduce((sum, r) => {
            const reduction = (r.processingStats.originalLength -
                r.processingStats.processedLength) /
                r.processingStats.originalLength;
            return sum + reduction;
        }, 0);
        const stepCounts = new Map();
        results.forEach((r) => {
            r.processingStats.stepsApplied.forEach((step) => {
                stepCounts.set(step, (stepCounts.get(step) || 0) + 1);
            });
        });
        const mostCommonSteps = Array.from(stepCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([step]) => step);
        return {
            totalProcessed: results.length,
            averageProcessingTime: totalProcessingTime / results.length,
            averageReduction: totalReduction / results.length,
            mostCommonSteps,
        };
    }
}
exports.PreprocessingPipeline = PreprocessingPipeline;
//# sourceMappingURL=PreprocessingPipeline.js.map