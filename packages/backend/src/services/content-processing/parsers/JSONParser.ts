import {
  DocumentParser,
  ParsingResult,
} from '../interfaces/DocumentParser';
import {
  ParsedContent,
  ContentType,
  DocumentStructure,
  ExtractedEntity,
} from '../../../models/core';
import { v4 as uuidv4 } from 'uuid';

export class JSONParser implements DocumentParser {
  supports(contentType: ContentType): boolean {
    return contentType === 'json';
  }

  getSupportedTypes(): ContentType[] {
    return ['json'];
  }

  async parse(
    content: Buffer | string,
    metadata: Record<string, any> = {}
  ): Promise<ParsedContent> {
    try {
      const jsonString =
        typeof content === 'string'
          ? content
          : content.toString('utf-8');
      const jsonData = JSON.parse(jsonString);

      const parsingResult = await this.extractStructuredContent(
        jsonData,
        jsonString
      );

      return {
        id: uuidv4(),
        originalContent: jsonString,
        extractedText: parsingResult.extractedText,
        contentType: 'json',
        structure: parsingResult.structure,
        entities: parsingResult.entities,
        metadata: {
          ...metadata,
          ...parsingResult.metadata,
          jsonStructure: this.analyzeJSONStructure(jsonData),
        },
        createdAt: new Date(),
      };
    } catch (error) {
      throw new Error(
        `JSON parsing failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private async extractStructuredContent(
    jsonData: any,
    jsonString: string
  ): Promise<ParsingResult> {
    // Convert JSON to readable text
    const extractedText = this.jsonToText(jsonData);

    // Extract structure from JSON
    const structure: DocumentStructure = {
      sections: this.extractSections(jsonData),
      tables: this.extractTables(jsonData),
      figures: this.extractFigures(jsonData),
      references: this.extractReferences(jsonData),
    };

    // Extract entities from the text representation
    const entities = await this.extractEntities(
      extractedText,
      jsonData
    );

    return {
      extractedText,
      structure,
      entities,
      metadata: {
        objectCount: this.countObjects(jsonData),
        arrayCount: this.countArrays(jsonData),
        maxDepth: this.getMaxDepth(jsonData),
        keyCount: this.countKeys(jsonData),
        extractedAt: new Date().toISOString(),
      },
    };
  }

  private jsonToText(obj: any, depth: number = 0): string {
    const indent = '  '.repeat(depth);

    if (obj === null || obj === undefined) {
      return 'null';
    }

    if (typeof obj === 'string') {
      return obj;
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj.toString();
    }

    if (Array.isArray(obj)) {
      return obj
        .map((item) => this.jsonToText(item, depth + 1))
        .join('\n');
    }

    if (typeof obj === 'object') {
      const lines = [];
      for (const [key, value] of Object.entries(obj)) {
        const valueText = this.jsonToText(value, depth + 1);
        lines.push(`${indent}${key}: ${valueText}`);
      }
      return lines.join('\n');
    }

    return String(obj);
  }

  private extractSections(jsonData: any): any[] {
    const sections = [];
    let sectionIndex = 0;

    if (typeof jsonData === 'object' && !Array.isArray(jsonData)) {
      for (const [key, value] of Object.entries(jsonData)) {
        sections.push({
          id: `section_${sectionIndex++}`,
          title: key,
          content: this.jsonToText(value),
          level: 1,
          type: Array.isArray(value) ? 'array' : typeof value,
          itemCount: Array.isArray(value) ? value.length : undefined,
        });
      }
    } else if (Array.isArray(jsonData)) {
      jsonData.forEach((item, index) => {
        sections.push({
          id: `section_${sectionIndex++}`,
          title: `Item ${index + 1}`,
          content: this.jsonToText(item),
          level: 1,
          type: typeof item,
          index,
        });
      });
    }

    return sections;
  }

  private extractTables(jsonData: any): any[] {
    const tables: any[] = [];

    // Look for array of objects that could represent tabular data
    const findTables = (obj: any, path: string = '') => {
      if (Array.isArray(obj) && obj.length > 0) {
        // Check if all items are objects with similar keys
        const firstItem = obj[0];
        if (
          typeof firstItem === 'object' &&
          !Array.isArray(firstItem)
        ) {
          const keys = Object.keys(firstItem);
          const isTabular = obj.every(
            (item) =>
              typeof item === 'object' &&
              !Array.isArray(item) &&
              keys.every((key) => key in item)
          );

          if (isTabular && keys.length >= 2) {
            tables.push({
              id: `table_${tables.length}`,
              path,
              columns: keys.length,
              rows: obj.length,
              headers: keys,
              data: obj,
            });
          }
        }
      }

      if (typeof obj === 'object' && !Array.isArray(obj)) {
        for (const [key, value] of Object.entries(obj)) {
          findTables(value, path ? `${path}.${key}` : key);
        }
      }
    };

    findTables(jsonData);
    return tables;
  }

  private extractFigures(jsonData: any): any[] {
    const figures: any[] = [];

    // Look for objects that might represent charts, graphs, or images
    const findFigures = (obj: any, path: string = '') => {
      if (typeof obj === 'object' && !Array.isArray(obj)) {
        const keys = Object.keys(obj).map((k) => k.toLowerCase());

        if (
          keys.some((key) =>
            ['chart', 'graph', 'image', 'figure', 'plot'].includes(
              key
            )
          )
        ) {
          figures.push({
            id: `figure_${figures.length}`,
            path,
            type: this.determineFigureTypeFromKeys(keys),
            properties: Object.keys(obj),
          });
        }

        for (const [key, value] of Object.entries(obj)) {
          findFigures(value, path ? `${path}.${key}` : key);
        }
      }
    };

    findFigures(jsonData);
    return figures;
  }

  private determineFigureTypeFromKeys(keys: string[]): string {
    if (keys.includes('chart')) return 'chart';
    if (keys.includes('graph')) return 'graph';
    if (keys.includes('image')) return 'image';
    if (keys.includes('plot')) return 'plot';
    return 'figure';
  }

  private extractReferences(jsonData: any): any[] {
    const references: any[] = [];

    // Look for URL patterns, IDs, or reference-like structures
    const findReferences = (obj: any, path: string = '') => {
      if (typeof obj === 'string') {
        if (this.isURL(obj) || this.isReference(obj)) {
          references.push({
            id: `ref_${references.length}`,
            text: obj,
            path,
            type: this.determineReferenceType(obj),
          });
        }
      } else if (typeof obj === 'object' && !Array.isArray(obj)) {
        for (const [key, value] of Object.entries(obj)) {
          if (
            key.toLowerCase().includes('ref') ||
            key.toLowerCase().includes('link') ||
            key.toLowerCase().includes('url')
          ) {
            references.push({
              id: `ref_${references.length}`,
              text: String(value),
              path: path ? `${path}.${key}` : key,
              type: this.determineReferenceType(String(value)),
            });
          }
          findReferences(value, path ? `${path}.${key}` : key);
        }
      } else if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          findReferences(item, `${path}[${index}]`);
        });
      }
    };

    findReferences(jsonData);
    return references;
  }

  private isURL(str: string): boolean {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  }

  private isReference(str: string): boolean {
    return (
      /^(ref|id|uuid|guid)[-_]?\w+$/i.test(str) ||
      /^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(str)
    );
  }

  private determineReferenceType(ref: string): string {
    if (this.isURL(ref)) return 'url';
    if (/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(ref)) return 'uuid';
    if (/^(ref|id)[-_]?\w+$/i.test(ref)) return 'id';
    return 'reference';
  }

  private async extractEntities(
    text: string,
    jsonData: any
  ): Promise<ExtractedEntity[]> {
    const entities: ExtractedEntity[] = [];

    // Extract from the text representation
    await this.extractTextEntities(text, entities);

    // Extract structured entities from JSON data
    await this.extractJSONEntities(jsonData, entities);

    return entities;
  }

  private async extractTextEntities(
    text: string,
    entities: ExtractedEntity[]
  ): Promise<void> {
    // Extract dates
    const dateRegex =
      /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?\b|\b\d{4}-\d{2}-\d{2}\b/g;
    let match;
    while ((match = dateRegex.exec(text)) !== null) {
      entities.push({
        type: 'date',
        value: match[0],
        confidence: 0.95,
        location: {
          start: match.index,
          end: match.index + match[0].length,
          line: this.getLineNumber(text, match.index),
        },
        context: this.getContext(text, match.index),
      });
    }

    // Extract amounts
    const amountRegex = /\b\d+\.?\d*\b/g;
    while ((match = amountRegex.exec(text)) !== null) {
      const value = parseFloat(match[0]);
      if (!isNaN(value) && value > 0) {
        entities.push({
          type: 'amount',
          value: match[0],
          confidence: 0.7,
          location: {
            start: match.index,
            end: match.index + match[0].length,
            line: this.getLineNumber(text, match.index),
          },
          context: this.getContext(text, match.index),
        });
      }
    }
  }

  private async extractJSONEntities(
    jsonData: any,
    entities: ExtractedEntity[],
    path: string = ''
  ): Promise<void> {
    if (typeof jsonData === 'object' && !Array.isArray(jsonData)) {
      for (const [key, value] of Object.entries(jsonData)) {
        const currentPath = path ? `${path}.${key}` : key;

        // Check for specific entity types based on key names
        if (this.isDateKey(key) && typeof value === 'string') {
          entities.push({
            type: 'date',
            value: String(value),
            confidence: 0.9,
            location: { start: 0, end: 0, line: 0 },
            context: `${key}: ${value}`,
          });
        } else if (
          this.isAmountKey(key) &&
          (typeof value === 'number' || typeof value === 'string')
        ) {
          entities.push({
            type: 'amount',
            value: String(value),
            confidence: 0.8,
            location: { start: 0, end: 0, line: 0 },
            context: `${key}: ${value}`,
          });
        } else if (
          this.isPersonKey(key) &&
          typeof value === 'string'
        ) {
          entities.push({
            type: 'person',
            value: String(value),
            confidence: 0.7,
            location: { start: 0, end: 0, line: 0 },
            context: `${key}: ${value}`,
          });
        } else if (
          this.isOrganizationKey(key) &&
          typeof value === 'string'
        ) {
          entities.push({
            type: 'organization',
            value: String(value),
            confidence: 0.7,
            location: { start: 0, end: 0, line: 0 },
            context: `${key}: ${value}`,
          });
        }

        // Recursively process nested objects
        if (typeof value === 'object') {
          await this.extractJSONEntities(
            value,
            entities,
            currentPath
          );
        }
      }
    } else if (Array.isArray(jsonData)) {
      for (let i = 0; i < jsonData.length; i++) {
        await this.extractJSONEntities(
          jsonData[i],
          entities,
          `${path}[${i}]`
        );
      }
    }
  }

  private isDateKey(key: string): boolean {
    const dateKeys = [
      'date',
      'created',
      'updated',
      'timestamp',
      'time',
      'when',
      'start',
      'end',
    ];
    return dateKeys.some((dateKey) =>
      key.toLowerCase().includes(dateKey)
    );
  }

  private isAmountKey(key: string): boolean {
    const amountKeys = [
      'amount',
      'price',
      'cost',
      'value',
      'total',
      'sum',
      'balance',
      'fee',
      'charge',
    ];
    return amountKeys.some((amountKey) =>
      key.toLowerCase().includes(amountKey)
    );
  }

  private isPersonKey(key: string): boolean {
    const personKeys = [
      'name',
      'author',
      'user',
      'person',
      'contact',
      'owner',
      'creator',
    ];
    return personKeys.some((personKey) =>
      key.toLowerCase().includes(personKey)
    );
  }

  private isOrganizationKey(key: string): boolean {
    const orgKeys = [
      'company',
      'organization',
      'org',
      'business',
      'corporation',
      'firm',
    ];
    return orgKeys.some((orgKey) =>
      key.toLowerCase().includes(orgKey)
    );
  }

  private analyzeJSONStructure(jsonData: any): any {
    return {
      type: Array.isArray(jsonData) ? 'array' : typeof jsonData,
      depth: this.getMaxDepth(jsonData),
      objectCount: this.countObjects(jsonData),
      arrayCount: this.countArrays(jsonData),
      keyCount: this.countKeys(jsonData),
    };
  }

  private getMaxDepth(obj: any, currentDepth: number = 0): number {
    if (typeof obj !== 'object' || obj === null) {
      return currentDepth;
    }

    let maxDepth = currentDepth;
    const values = Array.isArray(obj) ? obj : Object.values(obj);

    for (const value of values) {
      const depth = this.getMaxDepth(value, currentDepth + 1);
      maxDepth = Math.max(maxDepth, depth);
    }

    return maxDepth;
  }

  private countObjects(obj: any): number {
    if (typeof obj !== 'object' || obj === null) {
      return 0;
    }

    let count = Array.isArray(obj) ? 0 : 1;
    const values = Array.isArray(obj) ? obj : Object.values(obj);

    for (const value of values) {
      count += this.countObjects(value);
    }

    return count;
  }

  private countArrays(obj: any): number {
    if (typeof obj !== 'object' || obj === null) {
      return 0;
    }

    let count = Array.isArray(obj) ? 1 : 0;
    const values = Array.isArray(obj) ? obj : Object.values(obj);

    for (const value of values) {
      count += this.countArrays(value);
    }

    return count;
  }

  private countKeys(obj: any): number {
    if (
      typeof obj !== 'object' ||
      obj === null ||
      Array.isArray(obj)
    ) {
      return 0;
    }

    let count = Object.keys(obj).length;

    for (const value of Object.values(obj)) {
      count += this.countKeys(value);
    }

    return count;
  }

  private getLineNumber(text: string, position: number): number {
    return text.substring(0, position).split('\n').length;
  }

  private getContext(
    text: string,
    position: number,
    contextLength: number = 50
  ): string {
    const start = Math.max(0, position - contextLength);
    const end = Math.min(text.length, position + contextLength);
    return text.substring(start, end);
  }
}
