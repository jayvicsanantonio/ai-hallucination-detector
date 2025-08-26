export interface PIIMatch {
    type: PIIType;
    value: string;
    start: number;
    end: number;
    confidence: number;
}
export declare enum PIIType {
    EMAIL = "email",
    PHONE = "phone",
    SSN = "ssn",
    CREDIT_CARD = "credit_card",
    IP_ADDRESS = "ip_address",
    NAME = "name",
    ADDRESS = "address",
    DATE_OF_BIRTH = "date_of_birth",
    MEDICAL_ID = "medical_id",
    BANK_ACCOUNT = "bank_account"
}
export interface PIIDetectionConfig {
    enabledTypes: PIIType[];
    confidenceThreshold: number;
    customPatterns?: Map<string, RegExp>;
}
export declare class PIIDetector {
    private readonly config;
    private readonly patterns;
    constructor(config?: Partial<PIIDetectionConfig>);
    /**
     * Detects PII in the given text
     */
    detectPII(text: string): PIIMatch[];
    /**
     * Anonymizes PII in text by replacing with placeholders
     */
    anonymize(text: string, replacementMap?: Map<PIIType, string>): string;
    /**
     * Masks PII by showing only partial information
     */
    mask(text: string): string;
    private detectNames;
    private isLikelyName;
    private calculateConfidence;
    private maskValue;
    private isValidCreditCard;
}
export declare const piiDetector: PIIDetector;
//# sourceMappingURL=PIIDetector.d.ts.map