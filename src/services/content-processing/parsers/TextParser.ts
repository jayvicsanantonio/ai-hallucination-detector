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

export class TextParser implements DocumentParser {
  supports(contentType: ContentType): boolean {
    return contentType === 'text';
  }

  getSupportedTypes(): ContentType[] {
    return ['text'];
  }

  async parse(
    content: Buffer | string,
    metadata: Record<string, any> = {}
  ): Promise<ParsedContent> {
    try {
      const text =
        typeof content === 'string'
          ? content
          : content.toString('utf-8');

      const parsingResult = await this.extractStructuredContent(text);

      return {
        id: uuidv4(),
        originalContent: text,
        extractedText: parsingResult.extractedText,
        contentType: 'text',
        structure: parsingResult.structure,
        entities: parsingResult.entities,
        metadata: {
          ...metadata,
          ...parsingResult.metadata,
        },
        createdAt: new Date(),
      };
    } catch (error) {
      throw new Error(
        `Text parsing failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private async extractStructuredContent(
    text: string
  ): Promise<ParsingResult> {
    // Extract basic structure
    const structure: DocumentStructure = {
      sections: this.extractSections(text),
      tables: this.extractTables(text),
      figures: this.extractFigures(text),
      references: this.extractReferences(text),
    };

    // Extract entities
    const entities = await this.extractEntities(text);

    return {
      extractedText: text,
      structure,
      entities,
      metadata: {
        wordCount: text.split(/\s+/).filter((word) => word.length > 0)
          .length,
        characterCount: text.length,
        lineCount: text.split('\n').length,
        paragraphCount: text.split(/\n\s*\n/).length,
        extractedAt: new Date().toISOString(),
      },
    };
  }

  private extractSections(text: string) {
    const sections = [];
    const lines = text.split('\n');
    let currentSection = null;
    let sectionIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (this.isSectionHeader(line)) {
        if (currentSection) {
          sections.push(currentSection);
        }

        currentSection = {
          id: `section_${sectionIndex++}`,
          title: line,
          content: '',
          level: this.getSectionLevel(line),
          startLine: i,
          endLine: i,
        };
      } else if (currentSection && line) {
        currentSection.content += line + '\n';
        currentSection.endLine = i;
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  private isSectionHeader(line: string): boolean {
    // Enhanced heuristics for text files
    return (
      line.length > 0 &&
      line.length < 100 &&
      // All caps headers
      (line === line.toUpperCase() ||
        // Numbered sections
        /^\d+\.?\s/.test(line) ||
        // Headers with special characters
        /^[=\-#*]{3,}/.test(line) ||
        // Headers ending with colon
        /^[A-Z][^.!?]*:$/.test(line) ||
        // Markdown-style headers
        /^#{1,6}\s/.test(line))
    );
  }

  private getSectionLevel(line: string): number {
    // Check markdown headers first
    const markdownMatch = line.match(/^(#{1,6})\s/);
    if (markdownMatch) {
      return markdownMatch[1].length; // Return the actual number of # characters
    }

    // Check numbered sections
    if (/^\d+\.\d+\.\d+/.test(line)) return 3;
    if (/^\d+\.\d+/.test(line)) return 2;
    if (/^\d+\./.test(line)) return 1;
    return 1;
  }

  private extractTables(text: string) {
    const tables = [];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect various table formats
      if (this.isTableRow(line)) {
        const columns = this.parseTableRow(line);
        if (columns.length >= 2) {
          tables.push({
            id: `table_${tables.length}`,
            startLine: i,
            endLine: i,
            columns: columns.length,
            data: [columns],
          });
        }
      }
    }

    return tables;
  }

  private isTableRow(line: string): boolean {
    // Check for common table separators
    return (
      line.includes('\t') ||
      line.includes('|') ||
      (line.includes(',') && line.split(',').length >= 3) ||
      /\s{3,}/.test(line) // Multiple spaces as separators
    );
  }

  private parseTableRow(line: string): string[] {
    if (line.includes('\t')) {
      return line
        .split('\t')
        .map((col) => col.trim())
        .filter((col) => col);
    }
    if (line.includes('|')) {
      return line
        .split('|')
        .map((col) => col.trim())
        .filter((col) => col);
    }
    if (line.includes(',')) {
      return line
        .split(',')
        .map((col) => col.trim())
        .filter((col) => col);
    }
    // Split on multiple spaces
    return line
      .split(/\s{3,}/)
      .map((col) => col.trim())
      .filter((col) => col);
  }

  private extractFigures(text: string) {
    const figures = [];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (this.isFigureReference(line)) {
        figures.push({
          id: `figure_${figures.length}`,
          caption: lines[i].trim(),
          line: i,
          type: this.determineFigureType(line),
        });
      }
    }

    return figures;
  }

  private isFigureReference(line: string): boolean {
    return (
      line.includes('figure') ||
      line.includes('chart') ||
      line.includes('graph') ||
      line.includes('diagram') ||
      line.includes('image') ||
      line.includes('table')
    );
  }

  private determineFigureType(line: string): string {
    if (line.includes('chart')) return 'chart';
    if (line.includes('graph')) return 'graph';
    if (line.includes('diagram')) return 'diagram';
    if (line.includes('image')) return 'image';
    if (line.includes('table')) return 'table';
    return 'figure';
  }

  private extractReferences(text: string) {
    const references: any[] = [];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Look for various reference patterns
      const refPatterns = [
        /\[(\d+)\]/g, // [1]
        /\(([^)]+,\s*\d{4})\)/g, // (Author, 2020)
        /\b\d{4}\b/g, // Year references
        /https?:\/\/[^\s]+/g, // URLs
        /doi:\s*[\w\/.]+/gi, // DOI references
      ];

      refPatterns.forEach((pattern) => {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          references.push({
            id: `ref_${references.length}`,
            text: match[0],
            line: i,
            context: line.trim(),
            type: this.determineReferenceType(match[0]),
          });
        }
      });
    }

    return references;
  }

  private determineReferenceType(ref: string): string {
    if (ref.startsWith('http')) return 'url';
    if (ref.startsWith('doi:')) return 'doi';
    if (/^\[\d+\]$/.test(ref)) return 'numbered';
    if (/\d{4}/.test(ref)) return 'year';
    return 'citation';
  }

  private async extractEntities(
    text: string
  ): Promise<ExtractedEntity[]> {
    const entities: ExtractedEntity[] = [];

    // Extract dates with various formats
    const datePatterns = [
      /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
      /\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/g,
      /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi,
      /\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b/gi,
    ];

    datePatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          type: 'date',
          value: match[0],
          confidence: 0.9,
          location: {
            start: match.index,
            end: match.index + match[0].length,
            line: this.getLineNumber(text, match.index),
          },
          context: this.getContext(text, match.index),
        });
      }
    });

    // Extract monetary amounts
    const amountPatterns = [
      /\$[\d,]+\.?\d*/g,
      /\b\d{1,3}(,\d{3})*(\.\d{2})?\s*(?:USD|EUR|GBP|dollars?|euros?|pounds?)\b/gi,
      /\b(?:USD|EUR|GBP|\$)\s*\d{1,3}(,\d{3})*(\.\d{2})?\b/gi,
    ];

    amountPatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          type: 'amount',
          value: match[0],
          confidence: 0.8,
          location: {
            start: match.index,
            end: match.index + match[0].length,
            line: this.getLineNumber(text, match.index),
          },
          context: this.getContext(text, match.index),
        });
      }
    });

    // Extract organizations
    const orgPattern =
      /\b[A-Z][a-z]+ (?:Inc|Corp|LLC|Ltd|Company|Corporation|Group|Holdings|Partners)\b/g;
    let match;
    while ((match = orgPattern.exec(text)) !== null) {
      entities.push({
        type: 'organization',
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

    // Extract email addresses
    const emailPattern =
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    while ((match = emailPattern.exec(text)) !== null) {
      entities.push({
        type: 'email',
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

    // Extract phone numbers
    const phonePattern =
      /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g;
    while ((match = phonePattern.exec(text)) !== null) {
      entities.push({
        type: 'phone',
        value: match[0],
        confidence: 0.9,
        location: {
          start: match.index,
          end: match.index + match[0].length,
          line: this.getLineNumber(text, match.index),
        },
        context: this.getContext(text, match.index),
      });
    }

    // Extract person names (simple pattern)
    const personPattern = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;
    while ((match = personPattern.exec(text)) !== null) {
      // Filter out common false positives
      if (!this.isLikelyPersonName(match[0])) continue;

      entities.push({
        type: 'person',
        value: match[0],
        confidence: 0.6,
        location: {
          start: match.index,
          end: match.index + match[0].length,
          line: this.getLineNumber(text, match.index),
        },
        context: this.getContext(text, match.index),
      });
    }

    return entities;
  }

  private isLikelyPersonName(name: string): boolean {
    const commonWords = [
      'New York',
      'United States',
      'North America',
      'South America',
      'East Coast',
      'West Coast',
    ];
    return !commonWords.includes(name);
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
