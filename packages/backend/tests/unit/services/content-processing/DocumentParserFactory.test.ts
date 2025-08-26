import { DocumentParserFactory } from '../../../../src/services/content-processing/DocumentParserFactory';
import { PDFParser } from '../../../../src/services/content-processing/parsers/PDFParser';
import { DOCXParser } from '../../../../src/services/content-processing/parsers/DOCXParser';
import { TextParser } from '../../../../src/services/content-processing/parsers/TextParser';
import { JSONParser } from '../../../../src/services/content-processing/parsers/JSONParser';
import { DocumentParser } from '../../../../src/services/content-processing/interfaces/DocumentParser';
import { ContentType } from '../../../../src/models/core';

describe('DocumentParserFactory', () => {
  describe('getParser', () => {
    it('should return PDFParser for pdf content type', () => {
      const parser = DocumentParserFactory.getParser('pdf');
      expect(parser).toBeInstanceOf(PDFParser);
    });

    it('should return DOCXParser for docx content type', () => {
      const parser = DocumentParserFactory.getParser('docx');
      expect(parser).toBeInstanceOf(DOCXParser);
    });

    it('should return TextParser for text content type', () => {
      const parser = DocumentParserFactory.getParser('text');
      expect(parser).toBeInstanceOf(TextParser);
    });

    it('should return TextParser for txt content type', () => {
      const parser = DocumentParserFactory.getParser('text');
      expect(parser).toBeInstanceOf(TextParser);
    });

    it('should return JSONParser for json content type', () => {
      const parser = DocumentParserFactory.getParser('json');
      expect(parser).toBeInstanceOf(JSONParser);
    });

    it('should throw error for unsupported content type', () => {
      expect(() => {
        DocumentParserFactory.getParser('unsupported' as ContentType);
      }).toThrow('No parser available for content type: unsupported');
    });
  });

  describe('getSupportedTypes', () => {
    it('should return all supported content types', () => {
      const types = DocumentParserFactory.getSupportedTypes();

      expect(types).toContain('pdf');
      expect(types).toContain('docx');
      expect(types).toContain('text');
      expect(types).toContain('text');
      expect(types).toContain('json');
      expect(types.length).toBeGreaterThanOrEqual(4);
    });

    it('should not contain duplicate types', () => {
      const types = DocumentParserFactory.getSupportedTypes();
      const uniqueTypes = [...new Set(types)];

      expect(types.length).toBe(uniqueTypes.length);
    });
  });

  describe('isSupported', () => {
    it('should return true for supported content types', () => {
      expect(DocumentParserFactory.isSupported('pdf')).toBe(true);
      expect(DocumentParserFactory.isSupported('docx')).toBe(true);
      expect(DocumentParserFactory.isSupported('text')).toBe(true);
      expect(DocumentParserFactory.isSupported('text')).toBe(true);
      expect(DocumentParserFactory.isSupported('json')).toBe(true);
    });

    it('should return false for unsupported content types', () => {
      expect(
        DocumentParserFactory.isSupported(
          'unsupported' as ContentType
        )
      ).toBe(false);
      expect(
        DocumentParserFactory.isSupported('xml' as ContentType)
      ).toBe(false);
      expect(
        DocumentParserFactory.isSupported('csv' as ContentType)
      ).toBe(false);
    });
  });

  describe('registerParser', () => {
    it('should register a new parser', () => {
      // Create a mock parser
      const mockParser: DocumentParser = {
        supports: (contentType: ContentType) =>
          (contentType as any) === 'custom',
        getSupportedTypes: () => ['custom' as any],
        parse: jest.fn(),
      };

      // Register the parser
      DocumentParserFactory.registerParser(mockParser);

      // Verify it's registered
      expect(DocumentParserFactory.isSupported('custom' as any)).toBe(
        true
      );
      expect(DocumentParserFactory.getSupportedTypes()).toContain(
        'custom'
      );

      // Verify we can get the parser
      const parser = DocumentParserFactory.getParser('custom' as any);
      expect(parser).toBe(mockParser);
    });

    it('should allow multiple parsers for the same content type', () => {
      const mockParser1: DocumentParser = {
        supports: (contentType: ContentType) =>
          (contentType as any) === 'multi',
        getSupportedTypes: () => ['multi' as any],
        parse: jest.fn(),
      };

      const mockParser2: DocumentParser = {
        supports: (contentType: ContentType) =>
          (contentType as any) === 'multi',
        getSupportedTypes: () => ['multi' as any],
        parse: jest.fn(),
      };

      DocumentParserFactory.registerParser(mockParser1);
      DocumentParserFactory.registerParser(mockParser2);

      // Should return the first matching parser
      const parser = DocumentParserFactory.getParser('multi' as any);
      expect(parser).toBe(mockParser1);
    });
  });

  describe('getAllParsers', () => {
    it('should return all registered parsers', () => {
      const parsers = DocumentParserFactory.getAllParsers();

      expect(parsers.length).toBeGreaterThanOrEqual(4); // At least the default parsers
      expect(parsers.some((p) => p instanceof PDFParser)).toBe(true);
      expect(parsers.some((p) => p instanceof DOCXParser)).toBe(true);
      expect(parsers.some((p) => p instanceof TextParser)).toBe(true);
      expect(parsers.some((p) => p instanceof JSONParser)).toBe(true);
    });

    it('should return a copy of the parsers array', () => {
      const parsers1 = DocumentParserFactory.getAllParsers();
      const parsers2 = DocumentParserFactory.getAllParsers();

      expect(parsers1).not.toBe(parsers2); // Different array instances
      expect(parsers1).toEqual(parsers2); // Same content
    });
  });

  describe('parser consistency', () => {
    it('should ensure all parsers implement the DocumentParser interface', () => {
      const parsers = DocumentParserFactory.getAllParsers();

      parsers.forEach((parser) => {
        expect(typeof parser.supports).toBe('function');
        expect(typeof parser.getSupportedTypes).toBe('function');
        expect(typeof parser.parse).toBe('function');
      });
    });

    it('should ensure parser supports method matches getSupportedTypes', () => {
      const parsers = DocumentParserFactory.getAllParsers();

      parsers.forEach((parser) => {
        const supportedTypes = parser.getSupportedTypes();

        supportedTypes.forEach((type) => {
          expect(parser.supports(type)).toBe(true);
        });
      });
    });

    it('should ensure factory can get parser for all supported types', () => {
      const supportedTypes =
        DocumentParserFactory.getSupportedTypes();

      supportedTypes.forEach((type) => {
        expect(() => {
          DocumentParserFactory.getParser(type);
        }).not.toThrow();
      });
    });
  });
});
