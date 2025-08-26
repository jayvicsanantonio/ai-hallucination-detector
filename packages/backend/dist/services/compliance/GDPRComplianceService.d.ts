export interface DataSubject {
    id: string;
    email: string;
    name?: string;
    consentStatus: ConsentStatus;
    consentDate?: Date;
    dataCategories: DataCategory[];
    retentionPeriod?: number;
    lastActivity?: Date;
}
export interface ConsentStatus {
    marketing: boolean;
    analytics: boolean;
    functional: boolean;
    necessary: boolean;
    consentDate: Date;
    ipAddress?: string;
    userAgent?: string;
}
export declare enum DataCategory {
    PERSONAL_IDENTIFIERS = "personal_identifiers",
    CONTACT_INFORMATION = "contact_information",
    DEMOGRAPHIC_DATA = "demographic_data",
    BEHAVIORAL_DATA = "behavioral_data",
    TECHNICAL_DATA = "technical_data",
    USAGE_DATA = "usage_data",
    SPECIAL_CATEGORIES = "special_categories"
}
export declare enum GDPRRight {
    ACCESS = "access",
    RECTIFICATION = "rectification",
    ERASURE = "erasure",
    RESTRICT_PROCESSING = "restrict_processing",
    DATA_PORTABILITY = "data_portability",
    OBJECT = "object",
    WITHDRAW_CONSENT = "withdraw_consent"
}
export interface DataSubjectRequest {
    requestId: string;
    subjectId: string;
    requestType: GDPRRight;
    requestDate: Date;
    status: 'pending' | 'in_progress' | 'completed' | 'rejected';
    completionDate?: Date;
    requestDetails?: string;
    responseData?: any;
    rejectionReason?: string;
}
export interface DataRetentionPolicy {
    dataCategory: DataCategory;
    retentionPeriod: number;
    legalBasis: string;
    deletionMethod: 'soft_delete' | 'hard_delete' | 'anonymize';
    reviewFrequency: 'monthly' | 'quarterly' | 'annually';
}
export interface GDPRComplianceReport {
    reportId: string;
    generatedDate: Date;
    totalDataSubjects: number;
    activeConsents: number;
    expiredData: number;
    pendingRequests: number;
    completedRequests: number;
    dataBreaches: number;
    complianceScore: number;
    recommendations: string[];
}
export declare class GDPRComplianceService {
    private dataSubjects;
    private dataSubjectRequests;
    private retentionPolicies;
    private dataBreaches;
    constructor();
    /**
     * Initialize default data retention policies
     */
    private initializeRetentionPolicies;
    /**
     * Registers a new data subject with consent
     */
    registerDataSubject(id: string, email: string, consent: ConsentStatus, dataCategories: DataCategory[], name?: string): DataSubject;
    /**
     * Updates consent for a data subject
     */
    updateConsent(subjectId: string, consent: Partial<ConsentStatus>): boolean;
    /**
     * Processes a data subject rights request
     */
    processDataSubjectRequest(subjectId: string, requestType: GDPRRight, requestDetails?: string): Promise<DataSubjectRequest>;
    /**
     * Processes access request (Article 15)
     */
    private processAccessRequest;
    /**
     * Processes erasure request (Article 17 - Right to be forgotten)
     */
    private processErasureRequest;
    /**
     * Processes data portability request (Article 20)
     */
    private processPortabilityRequest;
    /**
     * Processes consent withdrawal
     */
    private processConsentWithdrawal;
    /**
     * Checks if data can be erased
     */
    private canEraseData;
    /**
     * Erases data by category using specified method
     */
    private eraseDataByCategory;
    /**
     * Gets processing purposes for data categories
     */
    private getProcessingPurposes;
    /**
     * Gets portable data for a subject
     */
    private getPortableData;
    /**
     * Performs automated data retention cleanup
     */
    performRetentionCleanup(): Promise<{
        processed: number;
        deleted: number;
        anonymized: number;
        errors: string[];
    }>;
    /**
     * Generates GDPR compliance report
     */
    generateComplianceReport(): GDPRComplianceReport;
    /**
     * Gets all data subjects
     */
    getDataSubjects(): DataSubject[];
    /**
     * Gets data subject requests
     */
    getDataSubjectRequests(): DataSubjectRequest[];
    /**
     * Gets retention policies
     */
    getRetentionPolicies(): DataRetentionPolicy[];
    /**
     * Updates retention policy
     */
    updateRetentionPolicy(category: DataCategory, policy: DataRetentionPolicy): void;
}
export declare const gdprComplianceService: GDPRComplianceService;
//# sourceMappingURL=GDPRComplianceService.d.ts.map