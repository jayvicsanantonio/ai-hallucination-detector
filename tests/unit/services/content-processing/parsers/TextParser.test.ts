import { TextParser } from '../../../../../src/services/content-processing/parsers/TextParser';
import { ContentType } from '../../../../../src/models/core';

describe('TextParser', () => {
  let parser: TextParser;

  beforeEach(() => {
    parser = new TextParser();
  });

  describe('supports', () => {
    it('should support text and txt content types', () => {
      expect(parser.supports('text')).toBe(true);
      expect(parser.supports('txt')).toBe(true);
      expect(parser.supports('pdf')).toBe(false);
      expect(parser.supports('docx')).toBe(false);
    });
  });

  describe('getSupportedTypes', () => {
    it('should return supported content types', () => {
      const types = parser.getSupportedTypes();
      expect(types).toContain('text');
      expect(types).toContain('txt');
      expect(types).toHaveLength(2);
    });
  });

  describe('parse', () => {
    it('should parse simple text content', async () => {
      const content =
        'This is a simple text document with some content.';
      const result = await parser.parse(content);

      expect(result.id).toBeDefined();
      expect(result.originalContent).toBe(content);
      expect(result.extractedText).toBe(content);
      expect(result.contentType).toBe('text');
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should parse text with sections', async () => {
      const content = `INTRODUCTION
This is the introduction section.

1. FIRST SECTION
This is the first section content.

2. SECOND SECTION
This is the second section content.`;

      const result = await parser.parse(content);

      expect(result.structure.sections).toHaveLength(3);
      expect(result.structure.sections[0].title).toBe('INTRODUCTION');
      expect(result.structure.sections[1].title).toBe(
        '1. FIRST SECTION'
      );
      expect(result.structure.sections[2].title).toBe(
        '2. SECOND SECTION'
      );
    });

    it('should extract entities from text', async () => {
      const content = `Contact John Doe at john.doe@example.com or call (555) 123-4567.
The meeting is scheduled for 2024-01-15.
The total amount is $1,500.00.`;

      const result = await parser.parse(content);

      const entityTypes = result.entities.map((e) => e.type);
      expect(entityTypes).toContain('person');
      expect(entityTypes).toContain('date');
      expect(entityTypes).toContain('amount');
    });

    it('should detect tables in text', async () => {
      const content = `Product	Price	Quantity
Widget A	$10.00	5
Widget B	$15.00	3`;

      const result = await parser.parse(content);

      expect(result.structure.tables).toHaveLength(3); // Each row detected as a table
      expect(result.structure.tables[0].columns).toBe(3);
    });

    it('should extract references', async () => {
      const content = `According to Smith (2020), the results show [1] that the hypothesis is correct.
See also https://example.com for more information.`;

      const result = await parser.parse(content);

      expect(result.structure.references.length).toBeGreaterThan(0);
      const refTexts = result.structure.references.map((r) => r.text);
      expect(refTexts).toContain('[1]');
    });

    it('should handle markdown-style headers', async () => {
      const content = `# Main Header
This is content under main header.

## Sub Header
This is content under sub header.

### Sub Sub Header
This is content under sub sub header.`;

      const result = await parser.parse(content);

      expect(result.structure.sections).toHaveLength(3);
      expect(result.structure.sections[0].level).toBe(1);
      expect(result.structure.sections[1].level).toBe(2);
      expect(result.structure.sections[2].level).toBe(3);
    });

    it('should calculate content statistics', async () => {
      const content = `This is a test document.
It has multiple sentences and paragraphs.

This is the second paragraph.
It also has multiple sentences.`;

      const result = await parser.parse(content);

      expect(result.metadata.wordCount).toBeGreaterThan(0);
      expect(result.metadata.characterCount).toBe(content.length);
      expect(result.metadata.lineCount).toBe(
        content.split('\n').length
      );
    });

    it('should handle empty content', async () => {
      const content = '';
      const result = await parser.parse(content);

      expect(result.extractedText).toBe('');
      expect(result.metadata.wordCount).toBe(0);
      expect(result.metadata.characterCount).toBe(0);
    });

    it('should handle buffer input', async () => {
      const content = 'This is buffer content.';
      const buffer = Buffer.from(content, 'utf-8');
      const result = await parser.parse(buffer);

      expect(result.extractedText).toBe(content);
      expect(result.originalContent).toBe(content);
    });

    it('should include metadata in result', async () => {
      const content = 'Test content';
      const metadata = { source: 'test', author: 'tester' };
      const result = await parser.parse(content, metadata);

      expect(result.metadata.source).toBe('test');
      expect(result.metadata.author).toBe('tester');
      expect(result.metadata.extractedAt).toBeDefined();
    });

    it('should handle parsing errors gracefully', async () => {
      // Simulate an error by passing invalid input
      const invalidContent = null as any;

      await expect(parser.parse(invalidContent)).rejects.toThrow(
        'Text parsing failed'
      );
    });
  });

  describe('entity extraction', () => {
    it('should extract email addresses', async () => {
      const content =
        'Contact us at support@example.com or sales@company.org';
      const result = await parser.parse(content);

      const emails = result.entities.filter(
        (e) => e.type === 'email'
      );
      expect(emails).toHaveLength(2);
      expect(emails[0].value).toBe('support@example.com');
      expect(emails[1].value).toBe('sales@company.org');
    });

    it('should extract phone numbers', async () => {
      const content = 'Call us at (555) 123-4567 or 555-987-6543';
      const result = await parser.parse(content);

      const phones = result.entities.filter(
        (e) => e.type === 'phone'
      );
      expect(phones.length).toBeGreaterThan(0);
    });

    it('should extract organizations', async () => {
      const content =
        'Microsoft Corp and Apple Inc are major companies.';
      const result = await parser.parse(content);

      const orgs = result.entities.filter(
        (e) => e.type === 'organization'
      );
      expect(orgs.length).toBeGreaterThan(0);
    });

    it('should extract dates in various formats', async () => {
      const content = `Important dates: 01/15/2024, 2024-01-15, January 15, 2024, and 15 Jan 2024`;
      const result = await parser.parse(content);

      const dates = result.entities.filter((e) => e.type === 'date');
      expect(dates.length).toBeGreaterThan(0);
    });

    it('should extract monetary amounts', async () => {
      const content = 'The price is $1,500.00 or 2000 USD or €500.50';
      const result = await parser.parse(content);

      const amounts = result.entities.filter(
        (e) => e.type === 'amount'
      );
      expect(amounts.length).toBeGreaterThan(0);
    });

    it('should provide entity context', async () => {
      const content = 'John Doe works at Microsoft Corp in Seattle.';
      const result = await parser.parse(content);

      result.entities.forEach((entity) => {
        expect(entity.context).toBeDefined();
        expect(entity.context.length).toBeGreaterThan(0);
        expect(entity.location).toBeDefined();
        expect(entity.location.start).toBeGreaterThanOrEqual(0);
        expect(entity.location.end).toBeGreaterThan(
          entity.location.start
        );
      });
    });
  });
});
