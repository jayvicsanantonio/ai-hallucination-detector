import { DocumentParserFactory } from './DocumentParserFactory';
import { EntityExtractor } from './EntityExtractor';
import { ParsedContent, ContentType } from '../../models/core';

export interface ContentProcessingOptions {
  extractEntities?: boolean;
  enhanceEntities?: boolean;
  preserveFormatting?: boolean;
  maxContentLength?: number;
  timeout?: number;
}

export class ContentProcessingService {
  private entityExtractor: EntityExtractor;

  constructor() {
    this.entityExtractor = new EntityExtractor();
  }

  /**
   * Process document content and return parsed structure
   */
  async processContent(
    content: Buffer | string,
    contentType: ContentType,
    options: ContentProcessingOptions = {},
    metadata: Record<string, any> = {}
  ): Promise<ParsedContent> {
    const {
      extractEntities = true,
      enhanceEntities = true,
      maxContentLength = 1000000, // 1MB default limit
      timeout = 30000, // 30 seconds default timeout
    } = options;

    // Validate content size
    const contentSize =
      typeof content === 'string' ? content.length : content.length;
    if (contentSize > maxContentLength) {
      throw new Error(
        `Content size (${contentSize}) exceeds maximum allowed size (${maxContentLength})`
      );
    }

    // Set up timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error('Content processing timeout')),
        timeout
      );
    });

    try {
      // Get appropriate parser
      const parser = DocumentParserFactory.getParser(contentType);

      // Parse content with timeout
      const parsePromise = parser.parse(content, metadata);
      const parsedContent = await Promise.race([
        parsePromise,
        timeoutPromise,
      ]);

      // Enhance entity extraction if requested
      if (extractEntities && enhanceEntities) {
        const enhancedEntities =
          await this.entityExtractor.extractEntities(
            parsedContent.extractedText
          );

        // Merge with existing entities, avoiding duplicates
        const existingEntityValues = new Set(
          parsedContent.entities.map((e) => e.value)
        );
        const newEntities = enhancedEntities.filter(
          (e) => !existingEntityValues.has(e.value)
        );

        parsedContent.entities = [
          ...parsedContent.entities,
          ...newEntities,
        ];
      }

      // Add processing metadata
      parsedContent.metadata = {
        ...parsedContent.metadata,
        processingOptions: options,
        processedAt: new Date().toISOString(),
        processingTime:
          Date.now() -
          (parsedContent.createdAt?.getTime() || Date.now()),
        entityCount: parsedContent.entities.length,
        sectionCount: parsedContent.structure.sections.length,
      };

      return parsedContent;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Content processing timeout'
      ) {
        throw new Error(
          `Content processing timed out after ${timeout}ms`
        );
      }
      throw new Error(
        `Content processing failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Process multiple documents in batch
   */
  async processBatch(
    documents: Array<{
      id: string;
      content: Buffer | string;
      contentType: ContentType;
      metadata?: Record<string, any>;
    }>,
    options: ContentProcessingOptions = {}
  ): Promise<
    Array<{ id: string; result?: ParsedContent; error?: string }>
  > {
    const results = await Promise.allSettled(
      documents.map(async (doc) => {
        try {
          const result = await this.processContent(
            doc.content,
            doc.contentType,
            options,
            doc.metadata
          );
          return { id: doc.id, result };
        } catch (error) {
          return {
            id: doc.id,
            error:
              error instanceof Error ? error.message : String(error),
          };
        }
      })
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          id: documents[index].id,
          error:
            result.reason instanceof Error
              ? result.reason.message
              : 'Unknown error',
        };
      }
    });
  }

  /**
   * Get supported content types
   */
  getSupportedContentTypes(): ContentType[] {
    return DocumentParserFactory.getSupportedTypes();
  }

  /**
   * Check if content type is supported
   */
  isContentTypeSupported(contentType: ContentType): boolean {
    return DocumentParserFactory.isSupported(contentType);
  }

  /**
   * Validate content before processing
   */
  validateContent(
    content: Buffer | string,
    contentType: ContentType,
    options: ContentProcessingOptions = {}
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if content type is supported
    if (!this.isContentTypeSupported(contentType)) {
      errors.push(`Unsupported content type: ${contentType}`);
    }

    // Check content size
    const contentSize =
      typeof content === 'string' ? content.length : content.length;
    const maxSize = options.maxContentLength || 1000000;
    if (contentSize > maxSize) {
      errors.push(
        `Content size (${contentSize}) exceeds maximum allowed size (${maxSize})`
      );
    }

    // Check if content is empty
    if (contentSize === 0) {
      errors.push('Content is empty');
    }

    // Validate content format for specific types
    if (contentType === 'json' && typeof content === 'string') {
      try {
        JSON.parse(content);
      } catch {
        errors.push('Invalid JSON format');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Extract key phrases from processed content
   */
  async extractKeyPhrases(
    parsedContent: ParsedContent,
    maxPhrases: number = 10
  ): Promise<string[]> {
    return this.entityExtractor.extractKeyPhrases(
      parsedContent.extractedText,
      maxPhrases
    );
  }

  /**
   * Calculate content similarity between two parsed documents
   */
  calculateContentSimilarity(
    content1: ParsedContent,
    content2: ParsedContent
  ): number {
    return this.entityExtractor.calculateSimilarity(
      content1.extractedText,
      content2.extractedText
    );
  }

  /**
   * Get content statistics
   */
  getContentStatistics(parsedContent: ParsedContent): {
    wordCount: number;
    characterCount: number;
    sentenceCount: number;
    paragraphCount: number;
    entityCount: number;
    sectionCount: number;
    tableCount: number;
    figureCount: number;
    referenceCount: number;
  } {
    const text = parsedContent.extractedText;

    return {
      wordCount: text.split(/\s+/).filter((word) => word.length > 0)
        .length,
      characterCount: text.length,
      sentenceCount: text
        .split(/[.!?]+/)
        .filter((sentence) => sentence.trim().length > 0).length,
      paragraphCount: text
        .split(/\n\s*\n/)
        .filter((para) => para.trim().length > 0).length,
      entityCount: parsedContent.entities.length,
      sectionCount: parsedContent.structure.sections.length,
      tableCount: parsedContent.structure.tables.length,
      figureCount: parsedContent.structure.figures.length,
      referenceCount: parsedContent.structure.references.length,
    };
  }

  /**
   * Sanitize content by removing or masking sensitive information
   */
  sanitizeContent(
    parsedContent: ParsedContent,
    options: {
      maskEmails?: boolean;
      maskPhones?: boolean;
      maskSSNs?: boolean;
      maskCreditCards?: boolean;
      removeUrls?: boolean;
    } = {}
  ): ParsedContent {
    let sanitizedText = parsedContent.extractedText;
    const sanitizedEntities = [...parsedContent.entities];

    if (options.maskEmails) {
      sanitizedText = sanitizedText.replace(
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        '[EMAIL]'
      );
      // Remove email entities
      parsedContent.entities = parsedContent.entities.filter(
        (e) => e.type !== 'email'
      );
    }

    if (options.maskPhones) {
      sanitizedText = sanitizedText.replace(
        /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
        '[PHONE]'
      );
      parsedContent.entities = parsedContent.entities.filter(
        (e) => e.type !== 'phone'
      );
    }

    if (options.maskSSNs) {
      sanitizedText = sanitizedText.replace(
        /\b\d{3}-\d{2}-\d{4}\b/g,
        '[SSN]'
      );
      parsedContent.entities = parsedContent.entities.filter(
        (e) => e.type !== 'ssn'
      );
    }

    if (options.maskCreditCards) {
      sanitizedText = sanitizedText.replace(
        /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
        '[CREDIT_CARD]'
      );
      parsedContent.entities = parsedContent.entities.filter(
        (e) => e.type !== 'credit_card'
      );
    }

    if (options.removeUrls) {
      sanitizedText = sanitizedText.replace(
        /https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\/_.])*(?:\?(?:[\w&=%.])*)?(?:\#(?:[\w.])*)?)?/g,
        ''
      );
      parsedContent.entities = parsedContent.entities.filter(
        (e) => e.type !== 'url'
      );
    }

    return {
      ...parsedContent,
      extractedText: sanitizedText,
      entities: sanitizedEntities,
      metadata: {
        ...parsedContent.metadata,
        sanitized: true,
        sanitizationOptions: options,
        sanitizedAt: new Date().toISOString(),
      },
    };
  }
}
