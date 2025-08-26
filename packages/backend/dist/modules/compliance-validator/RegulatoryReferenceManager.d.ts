import { ComplianceRule } from '../../models/knowledge/ComplianceRule';
export interface RegulatoryDocument {
    id: string;
    title: string;
    regulation: string;
    section?: string;
    subsection?: string;
    url?: string;
    localPath?: string;
    description: string;
    effectiveDate: Date;
    lastUpdated: Date;
    jurisdiction: string;
    applicableDomains: string[];
    documentType: 'law' | 'regulation' | 'guidance' | 'standard' | 'policy';
    status: 'active' | 'superseded' | 'proposed' | 'withdrawn';
    keywords: string[];
    relatedDocuments: string[];
}
export interface RegulatoryReference {
    documentId: string;
    document: RegulatoryDocument;
    relevantSections: string[];
    citationText: string;
    context: string;
    applicabilityScore: number;
}
export interface ComplianceGuidance {
    ruleId: string;
    regulation: string;
    guidance: string;
    examples: string[];
    commonViolations: string[];
    bestPractices: string[];
    relatedRules: string[];
    lastReviewed: Date;
    reviewedBy: string;
}
export interface RegulatoryUpdate {
    id: string;
    regulation: string;
    updateType: 'new_rule' | 'rule_change' | 'interpretation' | 'enforcement_action';
    title: string;
    description: string;
    effectiveDate: Date;
    impactedRules: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    actionRequired: boolean;
    deadline?: Date;
    source: string;
    url?: string;
}
/**
 * Manages regulatory references, documentation, and compliance guidance
 * Provides linking between compliance rules and regulatory sources
 */
export declare class RegulatoryReferenceManager {
    private documents;
    private guidance;
    private updates;
    constructor();
    /**
     * Get regulatory references for a compliance rule
     */
    getRegulatoryReferences(rule: ComplianceRule): Promise<RegulatoryReference[]>;
    /**
     * Get compliance guidance for a rule
     */
    getComplianceGuidance(ruleId: string): Promise<ComplianceGuidance | null>;
    /**
     * Generate a comprehensive regulatory context for a violation
     */
    generateRegulatoryContext(rule: ComplianceRule, violationContext: string): Promise<{
        primaryReferences: RegulatoryReference[];
        guidance: ComplianceGuidance | null;
        relatedUpdates: RegulatoryUpdate[];
        enforcementHistory: string[];
        penalties: string[];
    }>;
    /**
     * Add a new regulatory document
     */
    addRegulatoryDocument(document: Omit<RegulatoryDocument, 'id'>): Promise<RegulatoryDocument>;
    /**
     * Update compliance guidance for a rule
     */
    updateComplianceGuidance(ruleId: string, guidance: Omit<ComplianceGuidance, 'ruleId' | 'lastReviewed'>): Promise<ComplianceGuidance>;
    /**
     * Add a regulatory update
     */
    addRegulatoryUpdate(update: Omit<RegulatoryUpdate, 'id'>): Promise<RegulatoryUpdate>;
    /**
     * Get recent regulatory updates for a regulation
     */
    getRelatedUpdates(regulation: string, limit?: number): RegulatoryUpdate[];
    /**
     * Search regulatory documents by keywords
     */
    searchDocuments(keywords: string[], domain?: string, jurisdiction?: string): RegulatoryDocument[];
    /**
     * Generate a formatted citation for a regulatory document
     */
    generateCitation(document: RegulatoryDocument, sections?: string[]): string;
    private initializeRegulatoryDocuments;
    private initializeComplianceGuidance;
    private isDocumentApplicable;
    private findRelevantSections;
    private calculateApplicabilityScore;
    private generateContext;
    private getEnforcementHistory;
    private getPenalties;
    private generateDocumentId;
}
//# sourceMappingURL=RegulatoryReferenceManager.d.ts.map