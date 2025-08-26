import { DocumentParser } from '../interfaces/DocumentParser';
import { ParsedContent, ContentType } from '../../../models/core';
export declare class JSONParser implements DocumentParser {
    supports(contentType: ContentType): boolean;
    getSupportedTypes(): ContentType[];
    parse(content: Buffer | string, metadata?: Record<string, any>): Promise<ParsedContent>;
    private extractStructuredContent;
    private jsonToText;
    private extractSections;
    private extractTables;
    private extractFigures;
    private determineFigureTypeFromKeys;
    private extractReferences;
    private isURL;
    private isReference;
    private determineReferenceType;
    private extractEntities;
    private extractTextEntities;
    private extractJSONEntities;
    private isDateKey;
    private isAmountKey;
    private isPersonKey;
    private isOrganizationKey;
    private analyzeJSONStructure;
    private getMaxDepth;
    private countObjects;
    private countArrays;
    private countKeys;
    private getLineNumber;
    private getContext;
}
//# sourceMappingURL=JSONParser.d.ts.map