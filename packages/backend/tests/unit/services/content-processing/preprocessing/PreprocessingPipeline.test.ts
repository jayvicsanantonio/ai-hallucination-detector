import { PreprocessingPipeline } from '../../../../../src/services/content-processing/preprocessing/PreprocessingPipeline';
import { ParsedContent } from '../../../../../src/models/core';

describe('PreprocessingPipeline', () => {
  let pipeline: PreprocessingPipeline;
  let sampleContent: ParsedContent;

  beforeEach(() => {
    pipeline = new PreprocessingPipeline();
    sampleContent = {
      id: 'test-1',
      originalContent: 'This is a test document with some content.',
      extractedText:
        'This is a test document with some content. It has multiple sentences.',
      contentType: 'text',
      structure: {
        sections: [],
        tables: [],
        figures: [],
        references: [],
      },
      entities: [],
      metadata: {
        wordCount: 10,
      },
      createdAt: new Date(),
    };
  });

  describe('process', () => {
    it('should process content with default options', async () => {
      const result = await pipeline.process(sampleContent);

      expect(result.processedContent).toBeDefined();
      expect(result.processingStats).toBeDefined();
      expect(result.processingStats.stepsApplied).toContain(
        'normalization'
      );
      expect(result.processingStats.stepsApplied).toContain(
        'metadata_extraction'
      );
    });

    it('should apply sanitization when enabled', async () => {
      const htmlContent = {
        ...sampleContent,
        extractedText:
          '<p>This is <strong>HTML</strong> content.</p>',
      };

      const result = await pipeline.process(htmlContent, {
        enableSanitization: true,
        sanitization: {
          removeHtml: true,
        },
      });

      expect(result.processedContent.extractedText).not.toContain(
        '<p>'
      );
      expect(result.processedContent.extractedText).not.toContain(
        '<strong>'
      );
      expect(result.processingStats.stepsApplied).toContain(
        'sanitization'
      );
    });

    it('should apply normalization when enabled', async () => {
      const unnormalizedContent = {
        ...sampleContent,
        extractedText:
          'This  has   multiple    spaces and "smart quotes".',
      };

      const result = await pipeline.process(unnormalizedContent, {
        enableNormalization: true,
        normalization: {
          normalizeSpaces: true,
          normalizeQuotes: true,
          preserveFormatting: false,
        },
      });

      // Check that multiple spaces are normalized
      expect(result.processedContent.extractedText).not.toContain(
        '   '
      );
      // Check that smart quotes are normalized (if they were present)
      expect(result.processingStats.stepsApplied).toContain(
        'normalization'
      );
    });

    it('should apply segmentation when enabled', async () => {
      const longContent = {
        ...sampleContent,
        extractedText:
          'This is the first paragraph.\n\nThis is the second paragraph.\n\nThis is the third paragraph.',
      };

      const result = await pipeline.process(longContent, {
        enableSegmentation: true,
        segmentation: {
          segmentByParagraphs: true,
          minSegmentLength: 10,
        },
      });

      expect(result.segmentation).toBeDefined();
      expect(result.segmentation.segments.length).toBeGreaterThan(0);
      expect(result.processingStats.stepsApplied).toContain(
        'segmentation'
      );
    });

    it('should extract metadata when enabled', async () => {
      const result = await pipeline.process(sampleContent, {
        enableMetadataExtraction: true,
        metadataExtraction: {
          extractKeywords: true,
          calculateReadability: true,
        },
      });

      expect(result.extractedMetadata).toBeDefined();
      expect(result.extractedMetadata?.keywords).toBeDefined();
      expect(
        result.extractedMetadata?.readabilityScore
      ).toBeDefined();
      expect(result.processingStats.stepsApplied).toContain(
        'metadata_extraction'
      );
    });

    it('should handle processing errors gracefully', async () => {
      const invalidContent = null as any;

      await expect(
        pipeline.process(invalidContent)
      ).rejects.toThrow();
    });
  });

  describe('quickPreprocess', () => {
    it('should apply quick preprocessing', async () => {
      const result = await pipeline.quickPreprocess(sampleContent);

      expect(result.processedContent).toBeDefined();
      expect(result.extractedMetadata).toBeDefined();
      expect(result.processingStats.stepsApplied).toContain(
        'normalization'
      );
      expect(result.processingStats.stepsApplied).toContain(
        'metadata_extraction'
      );
    });
  });

  describe('comprehensivePreprocess', () => {
    it('should apply comprehensive preprocessing', async () => {
      const result = await pipeline.comprehensivePreprocess(
        sampleContent
      );

      expect(result.processedContent).toBeDefined();
      expect(result.extractedMetadata).toBeDefined();
      expect(result.segmentation).toBeDefined();
      expect(result.processingStats.stepsApplied).toContain(
        'sanitization'
      );
      expect(result.processingStats.stepsApplied).toContain(
        'normalization'
      );
      expect(result.processingStats.stepsApplied).toContain(
        'segmentation'
      );
      expect(result.processingStats.stepsApplied).toContain(
        'metadata_extraction'
      );
    });
  });

  describe('prepareForML', () => {
    it('should prepare content for machine learning', async () => {
      const markdownContent = {
        ...sampleContent,
        extractedText:
          '# Title\n\nThis is **bold** text with *italic* formatting.',
      };

      const result = await pipeline.prepareForML(markdownContent);

      expect(result.processedContent.extractedText).not.toContain(
        '#'
      );
      expect(result.processedContent.extractedText).not.toContain(
        '**'
      );
      expect(result.processedContent.extractedText).not.toContain(
        '*'
      );
      expect(result.segmentation).toBeDefined();
    });
  });

  describe('prepareForVerification', () => {
    it('should prepare content for verification analysis', async () => {
      const result = await pipeline.prepareForVerification(
        sampleContent
      );

      expect(result.processedContent).toBeDefined();
      expect(result.extractedMetadata).toBeDefined();
      expect(result.segmentation).toBeDefined();
      expect(result.extractedMetadata?.keywords).toBeDefined();
      expect(result.extractedMetadata?.topics).toBeDefined();
    });
  });

  describe('sanitizeForPrivacy', () => {
    it('should sanitize sensitive information', async () => {
      const sensitiveContent = {
        ...sampleContent,
        extractedText:
          'Contact John Doe at john.doe@example.com or call (555) 123-4567. SSN: 123-45-6789.',
      };

      const result = await pipeline.sanitizeForPrivacy(
        sensitiveContent
      );

      expect(result.processedContent.extractedText).toContain(
        '[EMAIL_REDACTED]'
      );
      expect(result.processedContent.extractedText).toContain(
        '[PHONE_REDACTED]'
      );
      expect(result.processedContent.extractedText).toContain(
        '[SSN_REDACTED]'
      );
      expect(result.processedContent.extractedText).not.toContain(
        'john.doe@example.com'
      );
      expect(result.processedContent.extractedText).not.toContain(
        '(555) 123-4567'
      );
      expect(result.processedContent.extractedText).not.toContain(
        '123-45-6789'
      );
    });
  });

  describe('getRecommendations', () => {
    it('should provide recommendations for short content', () => {
      const shortContent = {
        ...sampleContent,
        extractedText: 'Short text.',
      };

      const recommendations =
        pipeline.getRecommendations(shortContent);

      expect(recommendations.enableNormalization).toBe(true);
      expect(recommendations.enableMetadataExtraction).toBe(true);
      expect(recommendations.metadataExtraction?.maxKeywords).toBe(3);
    });

    it('should provide recommendations for medium content', () => {
      const mediumContent = {
        ...sampleContent,
        extractedText: 'x'.repeat(2000),
      };

      const recommendations =
        pipeline.getRecommendations(mediumContent);

      expect(recommendations.enableSegmentation).toBe(true);
      expect(recommendations.metadataExtraction?.maxKeywords).toBe(8);
      expect(recommendations.metadataExtraction?.maxTopics).toBe(3);
    });

    it('should provide recommendations for long content', () => {
      const longContent = {
        ...sampleContent,
        extractedText: 'x'.repeat(10000),
      };

      const recommendations =
        pipeline.getRecommendations(longContent);

      expect(recommendations.enableSanitization).toBe(true);
      expect(recommendations.enableSegmentation).toBe(true);
      expect(recommendations.metadataExtraction?.maxKeywords).toBe(
        12
      );
      expect(recommendations.metadataExtraction?.maxTopics).toBe(5);
    });
  });

  describe('validateOptions', () => {
    it('should validate valid options', () => {
      const validOptions = {
        enableNormalization: true,
        normalization: {
          normalizeSpaces: true,
        },
      };

      const result = pipeline.validateOptions(validOptions);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect conflicting options', () => {
      const conflictingOptions = {
        sanitization: {
          convertToLowercase: true,
        },
        normalization: {
          preserveFormatting: true,
        },
      };

      const result = pipeline.validateOptions(conflictingOptions);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('conflicts');
    });

    it('should detect unreasonable limits', () => {
      const unreasonableOptions = {
        metadataExtraction: {
          maxKeywords: 100,
          maxTopics: 50,
        },
        segmentation: {
          maxSegmentLength: 5,
        },
      };

      const result = pipeline.validateOptions(unreasonableOptions);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getProcessingStats', () => {
    it('should calculate processing statistics', async () => {
      const results = [
        await pipeline.quickPreprocess(sampleContent),
        await pipeline.quickPreprocess(sampleContent),
      ];

      const stats = pipeline.getProcessingStats(results);

      expect(stats.totalProcessed).toBe(2);
      expect(stats.averageProcessingTime).toBeGreaterThanOrEqual(0);
      expect(stats.mostCommonSteps).toContain('normalization');
    });

    it('should handle empty results', () => {
      const stats = pipeline.getProcessingStats([]);

      expect(stats.totalProcessed).toBe(0);
      expect(stats.averageProcessingTime).toBe(0);
      expect(stats.averageReduction).toBe(0);
      expect(stats.mostCommonSteps).toHaveLength(0);
    });
  });
});
