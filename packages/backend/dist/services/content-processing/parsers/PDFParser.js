"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PDFParser = void 0;
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const uuid_1 = require("uuid");
class PDFParser {
    supports(contentType) {
        return contentType === 'pdf';
    }
    getSupportedTypes() {
        return ['pdf'];
    }
    async parse(content, metadata = {}) {
        try {
            const pdfData = await (0, pdf_parse_1.default)(content);
            const parsingResult = await this.extractStructuredContent(pdfData);
            return {
                id: (0, uuid_1.v4)(),
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
        }
        catch (error) {
            throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async extractStructuredContent(pdfData) {
        const text = pdfData.text;
        // Extract basic structure
        const structure = {
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
    extractSections(text) {
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
            }
            else if (currentSection && line) {
                currentSection.content += line + '\n';
                currentSection.endLine = i;
            }
        }
        if (currentSection) {
            sections.push(currentSection);
        }
        return sections;
    }
    isSectionHeader(line) {
        // Simple heuristics for identifying section headers
        return (line.length > 0 &&
            line.length < 100 &&
            (line === line.toUpperCase() ||
                /^\d+\.?\s/.test(line) ||
                /^[A-Z][A-Z\s]+$/.test(line)));
    }
    getSectionLevel(line) {
        // Determine section level based on formatting
        if (/^\d+\.\d+\.\d+/.test(line))
            return 3;
        if (/^\d+\.\d+/.test(line))
            return 2;
        if (/^\d+\./.test(line))
            return 1;
        return 1;
    }
    extractTables(text) {
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
    extractFigures(text) {
        const figures = [];
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toLowerCase();
            if (line.includes('figure') ||
                line.includes('chart') ||
                line.includes('graph')) {
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
    determineFigureType(line) {
        if (line.includes('chart'))
            return 'chart';
        if (line.includes('graph'))
            return 'graph';
        if (line.includes('table'))
            return 'table';
        return 'figure';
    }
    extractReferences(text) {
        const references = [];
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Look for reference patterns like [1], (Smith, 2020), etc.
            const refMatches = line.match(/\[(\d+)\]|\(([^)]+,\s*\d{4})\)/g);
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
    async extractEntities(text) {
        const entities = [];
        // Extract dates
        const dateRegex = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/g;
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
        const amountRegex = /\$[\d,]+\.?\d*|\b\d{1,3}(,\d{3})*(\.\d{2})?\b/g;
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
    getLineNumber(text, position) {
        return text.substring(0, position).split('\n').length;
    }
    getContext(text, position, contextLength = 50) {
        const start = Math.max(0, position - contextLength);
        const end = Math.min(text.length, position + contextLength);
        return text.substring(start, end);
    }
}
exports.PDFParser = PDFParser;
//# sourceMappingURL=PDFParser.js.map