import {
  ParsedContent,
  ExtractedEntity,
  ContentMetadata,
  ParsedContentValidator,
  ModelFactory,
  ModelSerializer,
  ValidationError,
} from '../../../../src/models/core';

describe('ParsedContent Model', () => {
  describe('ParsedContentValidator', () => {
    const validParsedContent: ParsedContent = {
      id: 'test-id-123',
      originalContent: 'This is test content',
      extractedText: 'This is test content',
      contentType: 'text',
      structure: {
        sections: [],
        tables: [],
        figures: [],
        references: [],
      },
      entities: [],
      metadata: {},
      createdAt: new Date(),
    };

    it('should validate a valid ParsedContent object', () => {
      expect(() =>
        ParsedContentValidator.validate(validParsedContent)
      ).not.toThrow();
    });

    it('should throw ValidationError for missing id', () => {
      const invalid = { ...validParsedContent, id: '' };
      expect(() => ParsedContentValidator.validate(invalid)).toThrow(
        ValidationError
      );
      expect(() => ParsedContentValidator.validate(invalid)).toThrow(
        'ParsedContent must have a valid id'
      );
    });

    it('should throw ValidationError for missing originalContent', () => {
      const invalid = { ...validParsedContent, originalContent: '' };
      expect(() => ParsedContentValidator.validate(invalid)).toThrow(
        ValidationError
      );
      expect(() => ParsedContentValidator.validate(invalid)).toThrow(
        'ParsedContent must have originalContent'
      );
    });

    it('should throw ValidationError for missing extractedText', () => {
      const invalid = { ...validParsedContent, extractedText: '' };
      expect(() => ParsedContentValidator.validate(invalid)).toThrow(
        ValidationError
      );
      expect(() => ParsedContentValidator.validate(invalid)).toThrow(
        'ParsedContent must have extractedText'
      );
    });

    it('should throw ValidationError for invalid contentType', () => {
      const invalid = {
        ...validParsedContent,
        contentType: 'invalid' as any,
      };
      expect(() => ParsedContentValidator.validate(invalid)).toThrow(
        ValidationError
      );
      expect(() => ParsedContentValidator.validate(invalid)).toThrow(
        'ParsedContent must have a valid contentType'
      );
    });

    it('should throw ValidationError for invalid createdAt', () => {
      const invalid = {
        ...validParsedContent,
        createdAt: 'not-a-date' as any,
      };
      expect(() => ParsedContentValidator.validate(invalid)).toThrow(
        ValidationError
      );
      expect(() => ParsedContentValidator.validate(invalid)).toThrow(
        'ParsedContent must have a valid createdAt date'
      );
    });

    it('should validate entities array', () => {
      const validEntity: ExtractedEntity = {
        type: 'person',
        value: 'John Doe',
        confidence: 0.95,
        location: { start: 0, end: 8 },
        context: 'John Doe is mentioned',
      };

      const contentWithEntities = {
        ...validParsedContent,
        entities: [validEntity],
      };

      expect(() =>
        ParsedContentValidator.validate(contentWithEntities)
      ).not.toThrow();
    });

    it('should throw ValidationError for invalid entity type', () => {
      const invalidEntity: ExtractedEntity = {
        type: 'invalid' as any,
        value: 'John Doe',
        confidence: 0.95,
        location: { start: 0, end: 8 },
        context: 'John Doe is mentioned',
      };

      const contentWithInvalidEntity = {
        ...validParsedContent,
        entities: [invalidEntity],
      };

      expect(() =>
        ParsedContentValidator.validate(contentWithInvalidEntity)
      ).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid entity confidence', () => {
      const invalidEntity: ExtractedEntity = {
        type: 'person',
        value: 'John Doe',
        confidence: 1.5, // Invalid: > 1
        location: { start: 0, end: 8 },
        context: 'John Doe is mentioned',
      };

      const contentWithInvalidEntity = {
        ...validParsedContent,
        entities: [invalidEntity],
      };

      expect(() =>
        ParsedContentValidator.validate(contentWithInvalidEntity)
      ).toThrow(ValidationError);
    });

    it('should validate metadata fields', () => {
      const validMetadata: ContentMetadata = {
        filename: 'test.txt',
        fileSize: 1024,
        author: 'Test Author',
        createdDate: new Date(),
        modifiedDate: new Date(),
        language: 'en',
        encoding: 'utf-8',
        pageCount: 1,
        wordCount: 100,
        customFields: { department: 'legal' },
      };

      const contentWithMetadata = {
        ...validParsedContent,
        metadata: validMetadata,
      };

      expect(() =>
        ParsedContentValidator.validate(contentWithMetadata)
      ).not.toThrow();
    });

    it('should throw ValidationError for invalid metadata fileSize', () => {
      const invalidMetadata: ContentMetadata = {
        fileSize: -1, // Invalid: negative
      };

      const contentWithInvalidMetadata = {
        ...validParsedContent,
        metadata: invalidMetadata,
      };

      expect(() =>
        ParsedContentValidator.validate(contentWithInvalidMetadata)
      ).toThrow(ValidationError);
    });
  });

  describe('ModelFactory', () => {
    it('should create valid ParsedContent with minimal data', () => {
      const content = ModelFactory.createParsedContent({
        originalContent: 'Test content',
      });

      expect(content.id).toBeDefined();
      expect(content.originalContent).toBe('Test content');
      expect(content.extractedText).toBe('Test content');
      expect(content.contentType).toBe('text');
      expect(content.createdAt).toBeInstanceOf(Date);
    });

    it('should create valid ParsedContent with full data', () => {
      const inputData: Partial<ParsedContent> = {
        id: 'custom-id',
        originalContent: 'Original content',
        extractedText: 'Extracted content',
        contentType: 'pdf',
        entities: [
          {
            type: 'person',
            value: 'John Doe',
            confidence: 0.9,
            location: { start: 0, end: 8 },
            context: 'context',
          },
        ],
        metadata: { filename: 'test.pdf' },
      };

      const content = ModelFactory.createParsedContent(inputData);

      expect(content.id).toBe('custom-id');
      expect(content.originalContent).toBe('Original content');
      expect(content.extractedText).toBe('Extracted content');
      expect(content.contentType).toBe('pdf');
      expect(content.entities).toHaveLength(1);
      expect(content.metadata.filename).toBe('test.pdf');
    });

    it('should throw ValidationError for invalid data', () => {
      expect(() =>
        ModelFactory.createParsedContent({
          originalContent: 'Test',
          contentType: 'invalid' as any,
        })
      ).toThrow(ValidationError);
    });
  });

  describe('ModelSerializer', () => {
    const testContent: ParsedContent = {
      id: 'test-id',
      originalContent: 'Test content',
      extractedText: 'Test content',
      contentType: 'text',
      structure: {
        sections: [],
        tables: [],
        figures: [],
        references: [],
      },
      entities: [],
      metadata: { createdDate: new Date('2023-01-01') },
      createdAt: new Date('2023-01-01'),
    };

    it('should serialize and deserialize ParsedContent correctly', () => {
      const serialized =
        ModelSerializer.serializeParsedContent(testContent);
      const deserialized =
        ModelSerializer.deserializeParsedContent(serialized);

      expect(deserialized).toEqual(testContent);
      expect(deserialized.createdAt).toBeInstanceOf(Date);
      expect(deserialized.metadata.createdDate).toBeInstanceOf(Date);
    });

    it('should throw ValidationError when deserializing invalid data', () => {
      const invalidJson = JSON.stringify({
        id: '',
        originalContent: 'test',
      });

      expect(() =>
        ModelSerializer.deserializeParsedContent(invalidJson)
      ).toThrow(ValidationError);
    });
  });
});
