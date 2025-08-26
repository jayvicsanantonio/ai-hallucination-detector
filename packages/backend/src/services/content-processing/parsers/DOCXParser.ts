import * as mammoth from 'mammoth';
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

export class DOCXParser implements DocumentParser {
  supports(contentType: ContentType): boolean {
    return contentType === 'docx';
  }

  getSupportedTypes(): ContentType[] {
    return ['docx'];
  }

  async parse(
    content: Buffer,
    metadata: Record<string, any> = {}
  ): Promise<ParsedContent> {
    try {
      const result = await mammoth.extractRawText({
        buffer: content,
      });
      const text = result.value;

      const parsingResult = await this.extractStructuredContent(text);

      return {
        id: uuidv4(),
        originalContent: content.toString('base64'),
        extractedText: parsingResult.extractedText,
        contentType: 'docx',
        structure: parsingResult.structure,
        entities: parsingResult.entities,
        metadata: {
          ...metadata,
          ...parsingResult.metadata,
          warnings: result.messages,
        },
        createdAt: new Date(),
      };
    } catch (error) {
      throw new Error(
        `DOCX parsing failed: ${
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
        wordCount: text.split(/\s+/).length,
        characterCount: text.length,
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
    return (
      line.length > 0 &&
      line.length < 100 &&
      (line === line.toUpperCase() ||
        /^\d+\.?\s/.test(line) ||
        /^[A-Z][A-Z\s]+$/.test(line) ||
        line.endsWith(':'))
    );
  }

  private getSectionLevel(line: string): number {
    if (/^\d+\.\d+\.\d+/.test(line)) return 3;
    if (/^\d+\.\d+/.test(line)) return 2;
    if (/^\d+\./.test(line)) return 1;
    return 1;
  }

  private extractTables(text: string) {
    // DOCX tables are often converted to tab-separated values
    const tables = [];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('\t')) {
        const columns = line
          .split('\t')
          .map((col) => col.trim())
          .filter((col) => col);
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

  private extractFigures(text: string) {
    const figures = [];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (
        line.includes('figure') ||
        line.includes('chart') ||
        line.includes('image')
      ) {
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

  private determineFigureType(line: string): string {
    if (line.includes('chart')) return 'chart';
    if (line.includes('graph')) return 'graph';
    if (line.includes('image')) return 'image';
    return 'figure';
  }

  private extractReferences(text: string): any[] {
    const references: any[] = [];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const refMatches = line.match(
        /\[(\d+)\]|\(([^)]+,\s*\d{4})\)/g
      );
      if (refMatches) {
        refMatches.forEach((match) => {
          references.push({
            id: `ref_${references.length}`,
            text: match,
            line: i,
            context: line.trim(),
          });
        });
      }
    }

    return references;
  }

  private async extractEntities(
    text: string
  ): Promise<ExtractedEntity[]> {
    const entities: ExtractedEntity[] = [];

    // Extract dates
    const dateRegex =
      /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/g;
    let match;
    while ((match = dateRegex.exec(text)) !== null) {
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

    // Extract amounts
    const amountRegex =
      /\$[\d,]+\.?\d*|\b\d{1,3}(,\d{3})*(\.\d{2})?\b/g;
    while ((match = amountRegex.exec(text)) !== null) {
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

    // Extract organizations (simple pattern matching)
    const orgRegex =
      /\b[A-Z][a-z]+ (?:Inc|Corp|LLC|Ltd|Company|Corporation)\b/g;
    while ((match = orgRegex.exec(text)) !== null) {
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

    return entities;
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
