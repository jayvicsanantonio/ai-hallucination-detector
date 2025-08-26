import { VerificationSession } from './VerificationSession';
import { FeedbackData } from './FeedbackData';
import { AuditEntry } from './AuditEntry';
export declare class AuditValidationError extends Error {
    field?: string | undefined;
    constructor(message: string, field?: string | undefined);
}
export declare class VerificationSessionValidator {
    static validate(session: VerificationSession): void;
    private static isValidDomain;
    private static isValidVerificationStatus;
}
export declare class FeedbackDataValidator {
    static validate(feedback: FeedbackData): void;
    private static isValidFeedbackType;
}
export declare class AuditEntryValidator {
    static validate(entry: AuditEntry): void;
    private static isValidAuditAction;
    private static isValidAuditSeverity;
}
export declare class AuditModelFactory {
    static createVerificationSession(data: Partial<VerificationSession>): VerificationSession;
    static createFeedbackData(data: Partial<FeedbackData>): FeedbackData;
    static createAuditEntry(data: Partial<AuditEntry>): AuditEntry;
    private static generateId;
}
export declare class AuditModelSerializer {
    static serializeVerificationSession(session: VerificationSession): string;
    static deserializeVerificationSession(json: string): VerificationSession;
    static serializeFeedbackData(feedback: FeedbackData): string;
    static deserializeFeedbackData(json: string): FeedbackData;
    static serializeAuditEntry(entry: AuditEntry): string;
    static deserializeAuditEntry(json: string): AuditEntry;
    private static dateReplacer;
    private static dateReviver;
}
//# sourceMappingURL=validation.d.ts.map