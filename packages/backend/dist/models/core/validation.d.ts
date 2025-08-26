import { ParsedContent } from './ParsedContent';
import { VerificationResult, Issue } from './VerificationResult';
export declare class ValidationError extends Error {
    field?: string | undefined;
    constructor(message: string, field?: string | undefined);
}
export declare class ParsedContentValidator {
    static validate(content: ParsedContent): void;
    private static isValidContentType;
    private static validateExtractedEntity;
    private static isValidEntityType;
    private static validateTextLocation;
    private static validateContentMetadata;
}
export declare class VerificationResultValidator {
    static validate(result: VerificationResult): void;
    private static isValidRiskLevel;
    private static validateIssue;
    private static isValidIssueType;
    private static isValidIssueSeverity;
}
export declare class ModelFactory {
    static createParsedContent(data: Partial<ParsedContent>): ParsedContent;
    static createVerificationResult(data: Partial<VerificationResult>): VerificationResult;
    static createIssue(data: Partial<Issue>): Issue;
    private static generateId;
}
export declare class ModelSerializer {
    static serializeParsedContent(content: ParsedContent): string;
    static deserializeParsedContent(json: string): ParsedContent;
    static serializeVerificationResult(result: VerificationResult): string;
    static deserializeVerificationResult(json: string): VerificationResult;
    private static dateReplacer;
    private static dateReviver;
}
//# sourceMappingURL=validation.d.ts.map