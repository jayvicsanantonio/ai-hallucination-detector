import { DocumentParser } from '../interfaces/DocumentParser';
import { ParsedContent, ContentType } from '../../../models/core';
export declare class PDFParser implements DocumentParser {
    supports(contentType: ContentType): boolean;
    getSupportedTypes(): ContentType[];
    parse(content: Buffer, metadata?: Record<string, any>): Promise<ParsedContent>;
    private extractStructuredContent;
    private extractSections;
    private isSectionHeader;
    private getSectionLevel;
    private extractTables;
    private extractFigures;
    private determineFigureType;
    private extractReferences;
    private extractEntities;
    private getLineNumber;
    private getContext;
}
//# sourceMappingURL=PDFParser.d.ts.map