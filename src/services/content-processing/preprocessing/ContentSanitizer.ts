import { ParsedContent } from '../../../models/core';

export interface SanitizationOptions {
  removeHtml?: boolean;
  removeMarkdown?: boolean;
  normalizeWhitespace?: boolean;
  removeEmptyLines?: boolean;
  trimLines?: boolean;
  convertToLowercase?: boolean;
  removeSpecialCharacters?: boolean;
  preserveStructure?: boolean;
  maxLineLength?: number;
}

export interface SanitizationResult {
  sanitizedText: string;
  originalLength: number;
  sanitizedLength: number;
  removedElements: string[];
  transformations: string[];
}

export class ContentSanitizer {
  /**
   * Sanitize content based on provided options
   */
  sanitize(
    content: string,
    options: SanitizationOptions = {}
  ): SanitizationResult {
    const {
      removeHtml = false,
      removeMarkdown = false,
      normalizeWhitespace = true,
      removeEmptyLines = true,
      trimLines = true,
      convertToLowercase = false,
      removeSpecialCharacters = false,
      preserveStructure = true,
      maxLineLength,
    } = options;

    let sanitizedText = content;
    const originalLength = content.length;
    const removedElements: string[] = [];
    const transformations: string[] = [];

    // Remove HTML tags
    if (removeHtml) {
      const htmlRegex = /<[^>]*>/g;
      const htmlMatches = sanitizedText.match(htmlRegex);
      if (htmlMatches) {
        removedElements.push(...htmlMatches);
        sanitizedText = sanitizedText.replace(htmlRegex, '');
        transformations.push('HTML tags removed');
      }
    }

    // Remove Markdown formatting
    if (removeMarkdown) {
      // Remove markdown headers
      sanitizedText = sanitizedText.replace(/^#{1,6}\s+/gm, '');
      // Remove bold/italic
      sanitizedText = sanitizedText.replace(/\*\*([^*]+)\*\*/g, '$1');
      sanitizedText = sanitizedText.replace(/\*([^*]+)\*/g, '$1');
      sanitizedText = sanitizedText.replace(/__([^_]+)__/g, '$1');
      sanitizedText = sanitizedText.replace(/_([^_]+)_/g, '$1');
      // Remove links
      sanitizedText = sanitizedText.replace(
        /\[([^\]]+)\]\([^)]+\)/g,
        '$1'
      );
      // Remove code blocks
      sanitizedText = sanitizedText.replace(/```[^`]*```/g, '');
      sanitizedText = sanitizedText.replace(/`([^`]+)`/g, '$1');
      transformations.push('Markdown formatting removed');
    }

    // Normalize whitespace
    if (normalizeWhitespace) {
      // Replace multiple spaces with single space
      sanitizedText = sanitizedText.replace(/[ \t]+/g, ' ');
      // Replace multiple newlines with double newline (preserve paragraph breaks)
      if (preserveStructure) {
        sanitizedText = sanitizedText.replace(/\n{3,}/g, '\n\n');
      } else {
        sanitizedText = sanitizedText.replace(/\n+/g, ' ');
      }
      transformations.push('Whitespace normalized');
    }

    // Trim lines
    if (trimLines) {
      sanitizedText = sanitizedText
        .split('\n')
        .map((line) => line.trim())
        .join('\n');
      transformations.push('Lines trimmed');
    }

    // Remove empty lines
    if (removeEmptyLines) {
      sanitizedText = sanitizedText
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .join('\n');
      transformations.push('Empty lines removed');
    }

    // Limit line length
    if (maxLineLength && maxLineLength > 0) {
      sanitizedText = sanitizedText
        .split('\n')
        .map((line) => {
          if (line.length <= maxLineLength) return line;
          // Break long lines at word boundaries
          const words = line.split(' ');
          const lines: string[] = [];
          let currentLine = '';

          for (const word of words) {
            if ((currentLine + ' ' + word).length <= maxLineLength) {
              currentLine = currentLine
                ? currentLine + ' ' + word
                : word;
            } else {
              if (currentLine) lines.push(currentLine);
              currentLine = word;
            }
          }
          if (currentLine) lines.push(currentLine);
          return lines.join('\n');
        })
        .join('\n');
      transformations.push(
        `Lines limited to ${maxLineLength} characters`
      );
    }

    // Convert to lowercase
    if (convertToLowercase) {
      sanitizedText = sanitizedText.toLowerCase();
      transformations.push('Converted to lowercase');
    }

    // Remove special characters (keep alphanumeric, spaces, and basic punctuation)
    if (removeSpecialCharacters) {
      sanitizedText = sanitizedText.replace(
        /[^a-zA-Z0-9\s.,!?;:()\-'"]/g,
        ''
      );
      transformations.push('Special characters removed');
    }

    return {
      sanitizedText: sanitizedText.trim(),
      originalLength,
      sanitizedLength: sanitizedText.length,
      removedElements,
      transformations,
    };
  }

  /**
   * Sanitize parsed content and update the content object
   */
  sanitizeParsedContent(
    parsedContent: ParsedContent,
    options: SanitizationOptions = {}
  ): ParsedContent {
    const result = this.sanitize(
      parsedContent.extractedText,
      options
    );

    return {
      ...parsedContent,
      extractedText: result.sanitizedText,
      metadata: {
        ...parsedContent.metadata,
        sanitization: {
          applied: true,
          options,
          originalLength: result.originalLength,
          sanitizedLength: result.sanitizedLength,
          removedElements: result.removedElements,
          transformations: result.transformations,
          sanitizedAt: new Date().toISOString(),
        },
      },
    };
  }

  /**
   * Remove sensitive information from content
   */
  removeSensitiveInfo(content: string): SanitizationResult {
    let sanitizedText = content;
    const originalLength = content.length;
    const removedElements: string[] = [];
    const transformations: string[] = [];

    // Remove email addresses
    const emailRegex =
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = sanitizedText.match(emailRegex);
    if (emails) {
      removedElements.push(...emails);
      sanitizedText = sanitizedText.replace(
        emailRegex,
        '[EMAIL_REDACTED]'
      );
      transformations.push('Email addresses redacted');
    }

    // Remove phone numbers
    const phoneRegex =
      /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g;
    const phones = sanitizedText.match(phoneRegex);
    if (phones) {
      removedElements.push(...phones);
      sanitizedText = sanitizedText.replace(
        phoneRegex,
        '[PHONE_REDACTED]'
      );
      transformations.push('Phone numbers redacted');
    }

    // Remove SSNs
    const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
    const ssns = sanitizedText.match(ssnRegex);
    if (ssns) {
      removedElements.push(...ssns);
      sanitizedText = sanitizedText.replace(
        ssnRegex,
        '[SSN_REDACTED]'
      );
      transformations.push('SSNs redacted');
    }

    // Remove credit card numbers
    const ccRegex = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g;
    const creditCards = sanitizedText.match(ccRegex);
    if (creditCards) {
      removedElements.push(...creditCards);
      sanitizedText = sanitizedText.replace(
        ccRegex,
        '[CREDIT_CARD_REDACTED]'
      );
      transformations.push('Credit card numbers redacted');
    }

    return {
      sanitizedText,
      originalLength,
      sanitizedLength: sanitizedText.length,
      removedElements,
      transformations,
    };
  }

  /**
   * Clean up text for analysis (remove noise but preserve meaning)
   */
  cleanForAnalysis(content: string): SanitizationResult {
    return this.sanitize(content, {
      removeHtml: true,
      removeMarkdown: true,
      normalizeWhitespace: true,
      removeEmptyLines: true,
      trimLines: true,
      preserveStructure: true,
      removeSpecialCharacters: false,
    });
  }

  /**
   * Prepare content for machine learning processing
   */
  prepareForML(content: string): SanitizationResult {
    return this.sanitize(content, {
      removeHtml: true,
      removeMarkdown: true,
      normalizeWhitespace: true,
      removeEmptyLines: true,
      trimLines: true,
      convertToLowercase: true,
      preserveStructure: false,
      removeSpecialCharacters: true,
    });
  }
}
