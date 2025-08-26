"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gdprComplianceService = exports.GDPRComplianceService = exports.GDPRRight = exports.DataCategory = void 0;
var DataCategory;
(function (DataCategory) {
    DataCategory["PERSONAL_IDENTIFIERS"] = "personal_identifiers";
    DataCategory["CONTACT_INFORMATION"] = "contact_information";
    DataCategory["DEMOGRAPHIC_DATA"] = "demographic_data";
    DataCategory["BEHAVIORAL_DATA"] = "behavioral_data";
    DataCategory["TECHNICAL_DATA"] = "technical_data";
    DataCategory["USAGE_DATA"] = "usage_data";
    DataCategory["SPECIAL_CATEGORIES"] = "special_categories";
})(DataCategory || (exports.DataCategory = DataCategory = {}));
var GDPRRight;
(function (GDPRRight) {
    GDPRRight["ACCESS"] = "access";
    GDPRRight["RECTIFICATION"] = "rectification";
    GDPRRight["ERASURE"] = "erasure";
    GDPRRight["RESTRICT_PROCESSING"] = "restrict_processing";
    GDPRRight["DATA_PORTABILITY"] = "data_portability";
    GDPRRight["OBJECT"] = "object";
    GDPRRight["WITHDRAW_CONSENT"] = "withdraw_consent";
})(GDPRRight || (exports.GDPRRight = GDPRRight = {}));
class GDPRComplianceService {
    constructor() {
        this.dataSubjects = new Map();
        this.dataSubjectRequests = new Map();
        this.retentionPolicies = new Map();
        this.dataBreaches = [];
        this.initializeRetentionPolicies();
    }
    /**
     * Initialize default data retention policies
     */
    initializeRetentionPolicies() {
        const defaultPolicies = [
            {
                dataCategory: DataCategory.PERSONAL_IDENTIFIERS,
                retentionPeriod: 2555, // 7 years
                legalBasis: 'Legal obligation for audit purposes',
                deletionMethod: 'hard_delete',
                reviewFrequency: 'annually',
            },
            {
                dataCategory: DataCategory.CONTACT_INFORMATION,
                retentionPeriod: 1095, // 3 years
                legalBasis: 'Legitimate interest for customer service',
                deletionMethod: 'soft_delete',
                reviewFrequency: 'annually',
            },
            {
                dataCategory: DataCategory.BEHAVIORAL_DATA,
                retentionPeriod: 730, // 2 years
                legalBasis: 'Consent for analytics',
                deletionMethod: 'anonymize',
                reviewFrequency: 'quarterly',
            },
            {
                dataCategory: DataCategory.TECHNICAL_DATA,
                retentionPeriod: 365, // 1 year
                legalBasis: 'Legitimate interest for security',
                deletionMethod: 'hard_delete',
                reviewFrequency: 'quarterly',
            },
            {
                dataCategory: DataCategory.USAGE_DATA,
                retentionPeriod: 365, // 1 year
                legalBasis: 'Legitimate interest for service improvement',
                deletionMethod: 'anonymize',
                reviewFrequency: 'quarterly',
            },
        ];
        defaultPolicies.forEach((policy) => {
            this.retentionPolicies.set(policy.dataCategory, policy);
        });
    }
    /**
     * Registers a new data subject with consent
     */
    registerDataSubject(id, email, consent, dataCategories, name) {
        const dataSubject = {
            id,
            email,
            name,
            consentStatus: consent,
            consentDate: consent.consentDate,
            dataCategories,
            lastActivity: new Date(),
        };
        this.dataSubjects.set(id, dataSubject);
        return dataSubject;
    }
    /**
     * Updates consent for a data subject
     */
    updateConsent(subjectId, consent) {
        const subject = this.dataSubjects.get(subjectId);
        if (!subject) {
            return false;
        }
        subject.consentStatus = {
            ...subject.consentStatus,
            ...consent,
            consentDate: new Date(),
        };
        subject.lastActivity = new Date();
        this.dataSubjects.set(subjectId, subject);
        return true;
    }
    /**
     * Processes a data subject rights request
     */
    async processDataSubjectRequest(subjectId, requestType, requestDetails) {
        const requestId = `GDPR-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`;
        const request = {
            requestId,
            subjectId,
            requestType,
            requestDate: new Date(),
            status: 'pending',
            requestDetails,
        };
        this.dataSubjectRequests.set(requestId, request);
        // Auto-process certain request types
        switch (requestType) {
            case GDPRRight.ACCESS:
                await this.processAccessRequest(request);
                break;
            case GDPRRight.ERASURE:
                await this.processErasureRequest(request);
                break;
            case GDPRRight.DATA_PORTABILITY:
                await this.processPortabilityRequest(request);
                break;
            case GDPRRight.WITHDRAW_CONSENT:
                await this.processConsentWithdrawal(request);
                break;
            default:
                // Manual processing required
                request.status = 'in_progress';
        }
        this.dataSubjectRequests.set(requestId, request);
        return request;
    }
    /**
     * Processes access request (Article 15)
     */
    async processAccessRequest(request) {
        const subject = this.dataSubjects.get(request.subjectId);
        if (!subject) {
            request.status = 'rejected';
            request.rejectionReason = 'Data subject not found';
            return;
        }
        const accessData = {
            personalData: {
                id: subject.id,
                email: subject.email,
                name: subject.name,
                registrationDate: subject.consentDate,
                lastActivity: subject.lastActivity,
            },
            consentStatus: subject.consentStatus,
            dataCategories: subject.dataCategories,
            retentionPeriods: subject.dataCategories.map((category) => ({
                category,
                retentionPeriod: this.retentionPolicies.get(category)?.retentionPeriod,
            })),
            processingPurposes: this.getProcessingPurposes(subject.dataCategories),
            dataRecipients: ['Internal systems', 'Authorized personnel'],
            dataTransfers: 'No international transfers',
        };
        request.responseData = accessData;
        request.status = 'completed';
        request.completionDate = new Date();
    }
    /**
     * Processes erasure request (Article 17 - Right to be forgotten)
     */
    async processErasureRequest(request) {
        const subject = this.dataSubjects.get(request.subjectId);
        if (!subject) {
            request.status = 'rejected';
            request.rejectionReason = 'Data subject not found';
            return;
        }
        // Check if erasure is legally required or if there are legitimate grounds to retain
        const canErase = this.canEraseData(subject);
        if (!canErase.allowed) {
            request.status = 'rejected';
            request.rejectionReason = canErase.reason;
            return;
        }
        // Perform erasure based on retention policies
        for (const category of subject.dataCategories) {
            const policy = this.retentionPolicies.get(category);
            if (policy) {
                await this.eraseDataByCategory(subject.id, category, policy.deletionMethod);
            }
        }
        // Remove from active data subjects
        this.dataSubjects.delete(request.subjectId);
        request.status = 'completed';
        request.completionDate = new Date();
        request.responseData = { message: 'Data successfully erased' };
    }
    /**
     * Processes data portability request (Article 20)
     */
    async processPortabilityRequest(request) {
        const subject = this.dataSubjects.get(request.subjectId);
        if (!subject) {
            request.status = 'rejected';
            request.rejectionReason = 'Data subject not found';
            return;
        }
        // Only data processed based on consent or contract can be ported
        const portableData = this.getPortableData(subject);
        request.responseData = {
            format: 'JSON',
            data: portableData,
            exportDate: new Date().toISOString(),
            instructions: 'This data can be imported into compatible systems',
        };
        request.status = 'completed';
        request.completionDate = new Date();
    }
    /**
     * Processes consent withdrawal
     */
    async processConsentWithdrawal(request) {
        const success = this.updateConsent(request.subjectId, {
            marketing: false,
            analytics: false,
            functional: false,
            necessary: true, // Necessary cookies cannot be withdrawn
            consentDate: new Date(),
        });
        if (success) {
            request.status = 'completed';
            request.completionDate = new Date();
            request.responseData = {
                message: 'Consent successfully withdrawn',
            };
        }
        else {
            request.status = 'rejected';
            request.rejectionReason =
                'Unable to process consent withdrawal';
        }
    }
    /**
     * Checks if data can be erased
     */
    canEraseData(subject) {
        // Check for legal obligations that prevent erasure
        const hasLegalObligation = subject.dataCategories.some((category) => {
            const policy = this.retentionPolicies.get(category);
            return policy?.legalBasis.includes('Legal obligation');
        });
        if (hasLegalObligation) {
            return {
                allowed: false,
                reason: 'Data retention required by legal obligation',
            };
        }
        // Check if data is still within retention period for legitimate interests
        const now = new Date();
        const registrationDate = subject.consentDate || new Date();
        for (const category of subject.dataCategories) {
            const policy = this.retentionPolicies.get(category);
            if (policy &&
                policy.legalBasis.includes('Legitimate interest')) {
                const retentionEndDate = new Date(registrationDate.getTime() +
                    policy.retentionPeriod * 24 * 60 * 60 * 1000);
                if (now < retentionEndDate) {
                    return {
                        allowed: false,
                        reason: `Data retention period not yet expired for ${category}`,
                    };
                }
            }
        }
        return { allowed: true };
    }
    /**
     * Erases data by category using specified method
     */
    async eraseDataByCategory(subjectId, category, method) {
        // This would integrate with actual data storage systems
        console.log(`Erasing ${category} data for subject ${subjectId} using ${method}`);
        switch (method) {
            case 'soft_delete':
                // Mark as deleted but keep for audit
                break;
            case 'hard_delete':
                // Permanently remove from all systems
                break;
            case 'anonymize':
                // Remove identifying information but keep aggregated data
                break;
        }
    }
    /**
     * Gets processing purposes for data categories
     */
    getProcessingPurposes(categories) {
        const purposes = [];
        if (categories.includes(DataCategory.PERSONAL_IDENTIFIERS)) {
            purposes.push('User identification and authentication');
        }
        if (categories.includes(DataCategory.CONTACT_INFORMATION)) {
            purposes.push('Communication and customer service');
        }
        if (categories.includes(DataCategory.BEHAVIORAL_DATA)) {
            purposes.push('Service improvement and analytics');
        }
        if (categories.includes(DataCategory.TECHNICAL_DATA)) {
            purposes.push('Security and system operation');
        }
        return purposes;
    }
    /**
     * Gets portable data for a subject
     */
    getPortableData(subject) {
        return {
            profile: {
                id: subject.id,
                email: subject.email,
                name: subject.name,
                registrationDate: subject.consentDate,
            },
            preferences: subject.consentStatus,
            activityData: {
                lastActivity: subject.lastActivity,
                dataCategories: subject.dataCategories,
            },
        };
    }
    /**
     * Performs automated data retention cleanup
     */
    async performRetentionCleanup() {
        const results = {
            processed: 0,
            deleted: 0,
            anonymized: 0,
            errors: [],
        };
        const now = new Date();
        for (const [subjectId, subject] of this.dataSubjects) {
            try {
                results.processed++;
                const registrationDate = subject.consentDate || new Date();
                let shouldDelete = false;
                let shouldAnonymize = false;
                // Check each data category against retention policy
                for (const category of subject.dataCategories) {
                    const policy = this.retentionPolicies.get(category);
                    if (policy) {
                        const retentionEndDate = new Date(registrationDate.getTime() +
                            policy.retentionPeriod * 24 * 60 * 60 * 1000);
                        if (now > retentionEndDate) {
                            if (policy.deletionMethod === 'hard_delete') {
                                shouldDelete = true;
                            }
                            else if (policy.deletionMethod === 'anonymize') {
                                shouldAnonymize = true;
                            }
                        }
                    }
                }
                if (shouldDelete) {
                    this.dataSubjects.delete(subjectId);
                    results.deleted++;
                }
                else if (shouldAnonymize) {
                    // Anonymize the subject data
                    subject.email = `anonymized-${subjectId}@example.com`;
                    subject.name = undefined;
                    results.anonymized++;
                }
            }
            catch (error) {
                results.errors.push(`Error processing subject ${subjectId}: ${error?.message || 'Unknown error'}`);
            }
        }
        return results;
    }
    /**
     * Generates GDPR compliance report
     */
    generateComplianceReport() {
        const reportId = `GDPR-REPORT-${Date.now()}`;
        const totalDataSubjects = this.dataSubjects.size;
        const activeConsents = Array.from(this.dataSubjects.values()).filter((s) => s.consentStatus.functional ||
            s.consentStatus.marketing ||
            s.consentStatus.analytics).length;
        const now = new Date();
        const expiredData = Array.from(this.dataSubjects.values()).filter((subject) => {
            const registrationDate = subject.consentDate || new Date();
            return subject.dataCategories.some((category) => {
                const policy = this.retentionPolicies.get(category);
                if (policy) {
                    const retentionEndDate = new Date(registrationDate.getTime() +
                        policy.retentionPeriod * 24 * 60 * 60 * 1000);
                    return now > retentionEndDate;
                }
                return false;
            });
        }).length;
        const pendingRequests = Array.from(this.dataSubjectRequests.values()).filter((r) => r.status === 'pending' || r.status === 'in_progress').length;
        const completedRequests = Array.from(this.dataSubjectRequests.values()).filter((r) => r.status === 'completed').length;
        // Calculate compliance score (0-100)
        let complianceScore = 100;
        if (expiredData > 0)
            complianceScore -= 20;
        if (pendingRequests > 5)
            complianceScore -= 15;
        if (this.dataBreaches.length > 0)
            complianceScore -= 30;
        const recommendations = [];
        if (expiredData > 0) {
            recommendations.push('Perform data retention cleanup to remove expired data');
        }
        if (pendingRequests > 5) {
            recommendations.push('Process pending data subject requests within 30 days');
        }
        if (activeConsents / totalDataSubjects < 0.5) {
            recommendations.push('Review consent collection processes');
        }
        return {
            reportId,
            generatedDate: new Date(),
            totalDataSubjects,
            activeConsents,
            expiredData,
            pendingRequests,
            completedRequests,
            dataBreaches: this.dataBreaches.length,
            complianceScore,
            recommendations,
        };
    }
    /**
     * Gets all data subjects
     */
    getDataSubjects() {
        return Array.from(this.dataSubjects.values());
    }
    /**
     * Gets data subject requests
     */
    getDataSubjectRequests() {
        return Array.from(this.dataSubjectRequests.values());
    }
    /**
     * Gets retention policies
     */
    getRetentionPolicies() {
        return Array.from(this.retentionPolicies.values());
    }
    /**
     * Updates retention policy
     */
    updateRetentionPolicy(category, policy) {
        this.retentionPolicies.set(category, policy);
    }
}
exports.GDPRComplianceService = GDPRComplianceService;
exports.gdprComplianceService = new GDPRComplianceService();
//# sourceMappingURL=GDPRComplianceService.js.map