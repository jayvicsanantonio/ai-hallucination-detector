"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOCXParser = void 0;
const mammoth = __importStar(require("mammoth"));
const uuid_1 = require("uuid");
class DOCXParser {
    supports(contentType) {
        return contentType === 'docx';
    }
    getSupportedTypes() {
        return ['docx'];
    }
    async parse(content, metadata = {}) {
        try {
            const result = await mammoth.extractRawText({
                buffer: content,
            });
            const text = result.value;
            const parsingResult = await this.extractStructuredContent(text);
            return {
                id: (0, uuid_1.v4)(),
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
        }
        catch (error) {
            throw new Error(`DOCX parsing failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async extractStructuredContent(text) {
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
        return (line.length > 0 &&
            line.length < 100 &&
            (line === line.toUpperCase() ||
                /^\d+\.?\s/.test(line) ||
                /^[A-Z][A-Z\s]+$/.test(line) ||
                line.endsWith(':')));
    }
    getSectionLevel(line) {
        if (/^\d+\.\d+\.\d+/.test(line))
            return 3;
        if (/^\d+\.\d+/.test(line))
            return 2;
        if (/^\d+\./.test(line))
            return 1;
        return 1;
    }
    extractTables(text) {
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
    extractFigures(text) {
        const figures = [];
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toLowerCase();
            if (line.includes('figure') ||
                line.includes('chart') ||
                line.includes('image')) {
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
        if (line.includes('image'))
            return 'image';
        return 'figure';
    }
    extractReferences(text) {
        const references = [];
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
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
        // Extract amounts
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
        // Extract organizations (simple pattern matching)
        const orgRegex = /\b[A-Z][a-z]+ (?:Inc|Corp|LLC|Ltd|Company|Corporation)\b/g;
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
    getLineNumber(text, position) {
        return text.substring(0, position).split('\n').length;
    }
    getContext(text, position, contextLength = 50) {
        const start = Math.max(0, position - contextLength);
        const end = Math.min(text.length, position + contextLength);
        return text.substring(start, end);
    }
}
exports.DOCXParser = DOCXParser;
//# sourceMappingURL=DOCXParser.js.map