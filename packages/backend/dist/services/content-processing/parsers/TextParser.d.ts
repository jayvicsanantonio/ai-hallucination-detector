import { DocumentParser } from '../interfaces/DocumentParser';
import { ParsedContent, ContentType } from '../../../models/core';
export declare class TextParser implements DocumentParser {
    supports(contentType: ContentType): boolean;
    getSupportedTypes(): ContentType[];
    parse(content: Buffer | string, metadata?: Record<string, any>): Promise<ParsedContent>;
    private extractStructuredContent;
    private extractSections;
    private isSectionHeader;
    private getSectionLevel;
    private extractTables;
    private isTableRow;
    private parseTableRow;
    private extractFigures;
    private isFigureReference;
    private determineFigureType;
    private extractReferences;
    private determineReferenceType;
    private extractEntities;
    private isLikelyPersonName;
    private getLineNumber;
    private getContext;
}
//# sourceMappingURL=TextParser.d.ts.map