import pdfParse from 'pdf-parse';
import {
  DocumentParser,
  ParsingResult,
  ParsingOptions,
} from '../interfaces/DocumentParser';
import {
  ParsedContent,
  ContentType,
  DocumentStructure,
  ExtractedEntity,
  TextLocation,
} from '../../../models/core';
import { v4 as uuidv4 } from 'uuid';

export class PDFParser implements DocumentParser {
  supports(contentType: ContentType): boolean {
    return contentType === 'pdf';
  }

  getSupportedTypes(): ContentType[] {
    return ['pdf'];
  }

  async parse(
    content: Buffer,
    metadata: Record<string, any> = {}
  ): Promise<ParsedContent> {
    try {
      const pdfData = await pdfParse(content);

      const parsingResult = await this.extractStructuredContent(
        pdfData
      );

      return {
        id: uuidv4(),
        originalContent: content.toString('base64'),
        extractedText: parsingResult.extractedText,
        contentType: 'pdf',
        structure: parsingResult.structure,
        entities: parsingResult.entities,
        metadata: {
          ...metadata,
          ...parsingResult.metadata,
          pageCount: pdfData.numpages,
          info: pdfData.info,
        },
        createdAt: new Date(),
      };
    } catch (error) {
      throw new Error(
        `PDF parsing failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private async extractStructuredContent(
    pdfData: any
  ): Promise<ParsingResult> {
    const text = pdfData.text;

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

      // Simple heuristic for section headers (all caps, short lines, etc.)
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
    // Simple heuristics for identifying section headers
    return (
      line.length > 0 &&
      line.length < 100 &&
      (line === line.toUpperCase() ||
        /^\d+\.?\s/.test(line) ||
        /^[A-Z][A-Z\s]+$/.test(line))
    );
  }

  private getSectionLevel(line: string): number {
    // Determine section level based on formatting
    if (/^\d+\.\d+\.\d+/.test(line)) return 3;
    if (/^\d+\.\d+/.test(line)) return 2;
    if (/^\d+\./.test(line)) return 1;
    return 1;
  }

  private extractTables(text: string) {
    // Basic table detection - look for patterns with multiple columns
    const tables = [];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Simple heuristic: lines with multiple tab separations or pipe characters
      if (line.includes('\t') || line.includes('|')) {
        const columns = line
          .split(/\t|\|/)
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
        line.includes('graph')
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
    if (line.includes('table')) return 'table';
    return 'figure';
  }

  private extractReferences(text: string): any[] {
    const references: any[] = [];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Look for reference patterns like [1], (Smith, 2020), etc.
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

    // Extract amounts/numbers
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
