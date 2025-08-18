import { DocumentParser } from './interfaces/DocumentParser';
import { PDFParser } from './parsers/PDFParser';
import { DOCXParser } from './parsers/DOCXParser';
import { TextParser } from './parsers/TextParser';
import { JSONParser } from './parsers/JSONParser';
import { ContentType } from '../../models/core';

export class DocumentParserFactory {
  private static parsers: DocumentParser[] = [
    new PDFParser(),
    new DOCXParser(),
    new TextParser(),
    new JSONParser(),
  ];

  /**
   * Get appropriate parser for the given content type
   */
  static getParser(contentType: ContentType): DocumentParser {
    const parser = this.parsers.find((p) => p.supports(contentType));

    if (!parser) {
      throw new Error(
        `No parser available for content type: ${contentType}`
      );
    }

    return parser;
  }

  /**
   * Get all supported content types
   */
  static getSupportedTypes(): ContentType[] {
    const types = new Set<ContentType>();

    this.parsers.forEach((parser) => {
      parser.getSupportedTypes().forEach((type) => types.add(type));
    });

    return Array.from(types);
  }

  /**
   * Check if a content type is supported
   */
  static isSupported(contentType: ContentType): boolean {
    return this.parsers.some((parser) =>
      parser.supports(contentType)
    );
  }

  /**
   * Register a new parser
   */
  static registerParser(parser: DocumentParser): void {
    this.parsers.push(parser);
  }

  /**
   * Get all registered parsers
   */
  static getAllParsers(): DocumentParser[] {
    return [...this.parsers];
  }
}
