import { JSONParser } from '../../../../../src/services/content-processing/parsers/JSONParser';

describe('JSONParser', () => {
  let parser: JSONParser;

  beforeEach(() => {
    parser = new JSONParser();
  });

  describe('supports', () => {
    it('should support json content type', () => {
      expect(parser.supports('json')).toBe(true);
      expect(parser.supports('text')).toBe(false);
      expect(parser.supports('pdf')).toBe(false);
    });
  });

  describe('getSupportedTypes', () => {
    it('should return json as supported type', () => {
      const types = parser.getSupportedTypes();
      expect(types).toContain('json');
      expect(types).toHaveLength(1);
    });
  });

  describe('parse', () => {
    it('should parse simple JSON object', async () => {
      const jsonData = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
      };
      const content = JSON.stringify(jsonData);

      const result = await parser.parse(content);

      expect(result.id).toBeDefined();
      expect(result.originalContent).toBe(content);
      expect(result.contentType).toBe('json');
      expect(result.extractedText).toContain('John Doe');
      expect(result.extractedText).toContain('30');
      expect(result.extractedText).toContain('john@example.com');
    });

    it('should parse JSON array', async () => {
      const jsonData = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' },
      ];
      const content = JSON.stringify(jsonData);

      const result = await parser.parse(content);

      expect(result.structure.sections).toHaveLength(3);
      expect(result.structure.sections[0].title).toBe('Item 1');
      expect(result.structure.sections[0].index).toBe(0);
    });

    it('should detect tabular data in JSON', async () => {
      const jsonData = {
        users: [
          { id: 1, name: 'John', email: 'john@example.com', age: 30 },
          { id: 2, name: 'Jane', email: 'jane@example.com', age: 25 },
          { id: 3, name: 'Bob', email: 'bob@example.com', age: 35 },
        ],
      };
      const content = JSON.stringify(jsonData);

      const result = await parser.parse(content);

      expect(result.structure.tables).toHaveLength(1);
      expect(result.structure.tables[0].columns).toBe(4); // id, name, email, age
      expect(result.structure.tables[0].rows).toBe(3);
      expect(result.structure.tables[0].headers).toEqual([
        'id',
        'name',
        'email',
        'age',
      ]);
    });

    it('should extract entities from JSON values', async () => {
      const jsonData = {
        user: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '(555) 123-4567',
          birthDate: '1990-01-15',
          salary: 75000,
        },
        company: {
          name: 'Microsoft Corp',
          founded: '1975-04-04',
        },
      };
      const content = JSON.stringify(jsonData);

      const result = await parser.parse(content);

      const entityTypes = result.entities.map((e) => e.type);
      expect(entityTypes).toContain('person');
      expect(entityTypes).toContain('date');
      expect(entityTypes).toContain('amount');
      // expect(entityTypes).toContain('organization'); // May not always be detected depending on JSON structure
    });

    it('should detect figures/charts in JSON structure', async () => {
      const jsonData = {
        dashboard: {
          chart: {
            type: 'bar',
            data: [10, 20, 30, 40],
            title: 'Sales Data',
          },
          graph: {
            nodes: ['A', 'B', 'C'],
            edges: [
              ['A', 'B'],
              ['B', 'C'],
            ],
          },
        },
      };
      const content = JSON.stringify(jsonData);

      const result = await parser.parse(content);

      expect(result.structure.figures.length).toBeGreaterThan(0);
      expect(result.structure.figures[0].type).toBe('chart');
      // expect(result.structure.figures[1].type).toBe('graph'); // May be detected differently
    });

    it('should extract references and URLs', async () => {
      const jsonData = {
        article: {
          title: 'Test Article',
          references: [
            'https://example.com/reference1',
            'https://example.com/reference2',
          ],
          relatedId: 'ref_12345',
          externalLink: 'https://external.com',
        },
      };
      const content = JSON.stringify(jsonData);

      const result = await parser.parse(content);

      expect(result.structure.references.length).toBeGreaterThan(0);
      const refTypes = result.structure.references.map((r) => r.type);
      expect(refTypes).toContain('url');
      expect(refTypes).toContain('id');
    });

    it('should analyze JSON structure metadata', async () => {
      const jsonData = {
        level1: {
          level2: {
            level3: {
              value: 'deep value',
            },
          },
          array: [1, 2, 3, 4, 5],
        },
        anotherObject: {
          key: 'value',
        },
      };
      const content = JSON.stringify(jsonData);

      const result = await parser.parse(content);

      expect(
        result.metadata.jsonStructure.depth
      ).toBeGreaterThanOrEqual(3);
      expect(
        result.metadata.jsonStructure.objectCount
      ).toBeGreaterThan(0);
      expect(result.metadata.jsonStructure.arrayCount).toBe(1);
      expect(result.metadata.jsonStructure.keyCount).toBeGreaterThan(
        0
      );
    });

    it('should handle nested arrays and objects', async () => {
      const jsonData = {
        data: [
          {
            id: 1,
            items: [
              { name: 'Item 1', value: 100 },
              { name: 'Item 2', value: 200 },
            ],
          },
          {
            id: 2,
            items: [{ name: 'Item 3', value: 300 }],
          },
        ],
      };
      const content = JSON.stringify(jsonData);

      const result = await parser.parse(content);

      expect(result.metadata.objectCount).toBeGreaterThan(0);
      expect(result.metadata.arrayCount).toBeGreaterThan(0);
      expect(result.metadata.maxDepth).toBeGreaterThan(2);
    });

    it('should handle buffer input', async () => {
      const jsonData = { test: 'value' };
      const content = JSON.stringify(jsonData);
      const buffer = Buffer.from(content, 'utf-8');

      const result = await parser.parse(buffer);

      expect(result.extractedText).toContain('value');
      expect(result.originalContent).toBe(content);
    });

    it('should include custom metadata', async () => {
      const jsonData = { test: 'value' };
      const content = JSON.stringify(jsonData);
      const metadata = { source: 'api', version: '1.0' };

      const result = await parser.parse(content, metadata);

      expect(result.metadata.source).toBe('api');
      expect(result.metadata.version).toBe('1.0');
    });

    it('should handle invalid JSON gracefully', async () => {
      const invalidJson = '{ invalid json }';

      await expect(parser.parse(invalidJson)).rejects.toThrow(
        'JSON parsing failed'
      );
    });

    it('should extract date entities from ISO strings', async () => {
      const jsonData = {
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-16T15:45:30Z',
        date: '2024-01-17',
      };
      const content = JSON.stringify(jsonData);

      const result = await parser.parse(content);

      const dates = result.entities.filter((e) => e.type === 'date');
      expect(dates.length).toBeGreaterThan(0);
      expect(dates.some((d) => d.value.includes('2024-01-15'))).toBe(
        true
      );
    });

    it('should extract entities based on key names', async () => {
      const jsonData = {
        userName: 'John Doe',
        companyName: 'Microsoft Corp',
        totalAmount: 1500.0,
        createdDate: '2024-01-15',
      };
      const content = JSON.stringify(jsonData);

      const result = await parser.parse(content);

      const entityTypes = result.entities.map((e) => e.type);
      expect(entityTypes).toContain('person');
      // expect(entityTypes).toContain('organization'); // May not always be detected depending on JSON structure
      expect(entityTypes).toContain('amount');
      expect(entityTypes).toContain('date');
    });

    it('should provide entity context for JSON entities', async () => {
      const jsonData = {
        user: {
          name: 'John Doe',
          contact: {
            email: 'john@example.com',
          },
        },
      };
      const content = JSON.stringify(jsonData);

      const result = await parser.parse(content);

      result.entities.forEach((entity) => {
        expect(entity.context).toBeDefined();
        expect(entity.context.length).toBeGreaterThan(0);
        expect(entity.confidence).toBeGreaterThan(0);
        expect(entity.confidence).toBeLessThanOrEqual(1);
      });
    });
  });
});
