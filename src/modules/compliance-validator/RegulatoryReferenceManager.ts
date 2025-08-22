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
  documentType:
    | 'law'
    | 'regulation'
    | 'guidance'
    | 'standard'
    | 'policy';
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
  applicabilityScore: number; // 0-100, how relevant this reference is
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
  updateType:
    | 'new_rule'
    | 'rule_change'
    | 'interpretation'
    | 'enforcement_action';
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
export class RegulatoryReferenceManager {
  private documents: Map<string, RegulatoryDocument> = new Map();
  private guidance: Map<string, ComplianceGuidance> = new Map();
  private updates: RegulatoryUpdate[] = [];

  constructor() {
    this.initializeRegulatoryDocuments();
    this.initializeComplianceGuidance();
  }

  /**
   * Get regulatory references for a compliance rule
   */
  async getRegulatoryReferences(
    rule: ComplianceRule
  ): Promise<RegulatoryReference[]> {
    const references: RegulatoryReference[] = [];

    // Find documents that match the rule's regulation and domain
    for (const [docId, document] of this.documents) {
      if (this.isDocumentApplicable(document, rule)) {
        const relevantSections = this.findRelevantSections(
          document,
          rule
        );
        const applicabilityScore = this.calculateApplicabilityScore(
          document,
          rule
        );

        if (applicabilityScore > 30) {
          // Only include reasonably relevant references
          references.push({
            documentId: docId,
            document,
            relevantSections,
            citationText: this.generateCitation(
              document,
              relevantSections
            ),
            context: this.generateContext(document, rule),
            applicabilityScore,
          });
        }
      }
    }

    // Sort by applicability score (most relevant first)
    return references.sort(
      (a, b) => b.applicabilityScore - a.applicabilityScore
    );
  }

  /**
   * Get compliance guidance for a rule
   */
  async getComplianceGuidance(
    ruleId: string
  ): Promise<ComplianceGuidance | null> {
    return this.guidance.get(ruleId) || null;
  }

  /**
   * Generate a comprehensive regulatory context for a violation
   */
  async generateRegulatoryContext(
    rule: ComplianceRule,
    violationContext: string
  ): Promise<{
    primaryReferences: RegulatoryReference[];
    guidance: ComplianceGuidance | null;
    relatedUpdates: RegulatoryUpdate[];
    enforcementHistory: string[];
    penalties: string[];
  }> {
    const primaryReferences = await this.getRegulatoryReferences(
      rule
    );
    const guidance = await this.getComplianceGuidance(rule.id);
    const relatedUpdates = this.getRelatedUpdates(rule.regulation);
    const enforcementHistory = this.getEnforcementHistory(
      rule.regulation
    );
    const penalties = this.getPenalties(rule.regulation, rule.domain);

    return {
      primaryReferences: primaryReferences.slice(0, 3), // Top 3 most relevant
      guidance,
      relatedUpdates,
      enforcementHistory,
      penalties,
    };
  }

  /**
   * Add a new regulatory document
   */
  async addRegulatoryDocument(
    document: Omit<RegulatoryDocument, 'id'>
  ): Promise<RegulatoryDocument> {
    const id = this.generateDocumentId(document);
    const fullDocument: RegulatoryDocument = {
      ...document,
      id,
    };

    this.documents.set(id, fullDocument);
    return fullDocument;
  }

  /**
   * Update compliance guidance for a rule
   */
  async updateComplianceGuidance(
    ruleId: string,
    guidance: Omit<ComplianceGuidance, 'ruleId' | 'lastReviewed'>
  ): Promise<ComplianceGuidance> {
    const fullGuidance: ComplianceGuidance = {
      ...guidance,
      ruleId,
      lastReviewed: new Date(),
    };

    this.guidance.set(ruleId, fullGuidance);
    return fullGuidance;
  }

  /**
   * Add a regulatory update
   */
  async addRegulatoryUpdate(
    update: Omit<RegulatoryUpdate, 'id'>
  ): Promise<RegulatoryUpdate> {
    const id = `update-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const fullUpdate: RegulatoryUpdate = {
      ...update,
      id,
    };

    this.updates.push(fullUpdate);
    return fullUpdate;
  }

  /**
   * Get recent regulatory updates for a regulation
   */
  getRelatedUpdates(
    regulation: string,
    limit: number = 5
  ): RegulatoryUpdate[] {
    return this.updates
      .filter(
        (update) =>
          update.regulation === regulation ||
          update.title
            .toLowerCase()
            .includes(regulation.toLowerCase())
      )
      .sort(
        (a, b) =>
          b.effectiveDate.getTime() - a.effectiveDate.getTime()
      )
      .slice(0, limit);
  }

  /**
   * Search regulatory documents by keywords
   */
  searchDocuments(
    keywords: string[],
    domain?: string,
    jurisdiction?: string
  ): RegulatoryDocument[] {
    const results: Array<{
      document: RegulatoryDocument;
      score: number;
    }> = [];

    for (const [, document] of this.documents) {
      let score = 0;

      // Check domain match
      if (domain && document.applicableDomains.includes(domain)) {
        score += 20;
      }

      // Check jurisdiction match
      if (jurisdiction && document.jurisdiction === jurisdiction) {
        score += 15;
      }

      // Check keyword matches
      for (const keyword of keywords) {
        const lowerKeyword = keyword.toLowerCase();

        if (document.title.toLowerCase().includes(lowerKeyword)) {
          score += 10;
        }
        if (
          document.description.toLowerCase().includes(lowerKeyword)
        ) {
          score += 5;
        }
        if (
          document.keywords.some((k) =>
            k.toLowerCase().includes(lowerKeyword)
          )
        ) {
          score += 8;
        }
      }

      if (score > 0) {
        results.push({ document, score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .map((result) => result.document);
  }

  /**
   * Generate a formatted citation for a regulatory document
   */
  generateCitation(
    document: RegulatoryDocument,
    sections?: string[]
  ): string {
    let citation = document.title;

    if (document.section) {
      citation += `, Section ${document.section}`;
    }

    if (sections && sections.length > 0) {
      citation += `, ${sections.join(', ')}`;
    }

    if (document.effectiveDate) {
      citation += ` (${document.effectiveDate.getFullYear()})`;
    }

    if (document.url) {
      citation += `. Available at: ${document.url}`;
    }

    return citation;
  }

  private initializeRegulatoryDocuments(): void {
    // Initialize with common regulatory documents
    const documents: Omit<RegulatoryDocument, 'id'>[] = [
      {
        title:
          'Health Insurance Portability and Accountability Act (HIPAA)',
        regulation: 'HIPAA',
        section: '164.502',
        url: 'https://www.hhs.gov/hipaa/for-professionals/privacy/laws-regulations/index.html',
        description:
          'Federal law that provides data privacy and security provisions for safeguarding medical information',
        effectiveDate: new Date('1996-08-21'),
        lastUpdated: new Date('2013-01-25'),
        jurisdiction: 'US',
        applicableDomains: ['healthcare'],
        documentType: 'law',
        status: 'active',
        keywords: [
          'privacy',
          'medical records',
          'protected health information',
          'PHI',
        ],
        relatedDocuments: [],
      },
      {
        title: 'Sarbanes-Oxley Act (SOX)',
        regulation: 'SOX',
        section: '302',
        url: 'https://www.sec.gov/about/laws/soa2002.pdf',
        description:
          'Federal law that establishes auditing and financial regulations for public companies',
        effectiveDate: new Date('2002-07-30'),
        lastUpdated: new Date('2010-07-21'),
        jurisdiction: 'US',
        applicableDomains: ['financial'],
        documentType: 'law',
        status: 'active',
        keywords: [
          'financial reporting',
          'internal controls',
          'auditing',
          'corporate governance',
        ],
        relatedDocuments: [],
      },
      {
        title: 'General Data Protection Regulation (GDPR)',
        regulation: 'GDPR',
        section: 'Article 6',
        url: 'https://gdpr-info.eu/',
        description:
          'European Union regulation on data protection and privacy',
        effectiveDate: new Date('2018-05-25'),
        lastUpdated: new Date('2018-05-25'),
        jurisdiction: 'EU',
        applicableDomains: [
          'legal',
          'healthcare',
          'financial',
          'insurance',
        ],
        documentType: 'regulation',
        status: 'active',
        keywords: [
          'data protection',
          'privacy',
          'consent',
          'personal data',
        ],
        relatedDocuments: [],
      },
    ];

    documents.forEach((doc) => {
      const id = this.generateDocumentId(doc);
      this.documents.set(id, { ...doc, id });
    });
  }

  private initializeComplianceGuidance(): void {
    // Initialize with sample compliance guidance
    const guidanceItems: ComplianceGuidance[] = [
      {
        ruleId: 'hipaa-phi-disclosure',
        regulation: 'HIPAA',
        guidance:
          'Protected Health Information (PHI) must not be disclosed without proper authorization or legal basis.',
        examples: [
          'Patient names, addresses, and medical record numbers',
          'Diagnosis and treatment information',
          'Insurance information and billing records',
        ],
        commonViolations: [
          'Unauthorized disclosure of patient information',
          'Inadequate access controls',
          'Improper disposal of PHI',
        ],
        bestPractices: [
          'Implement role-based access controls',
          'Use encryption for PHI transmission',
          'Conduct regular privacy training',
          'Maintain audit logs of PHI access',
        ],
        relatedRules: [
          'hipaa-minimum-necessary',
          'hipaa-security-rule',
        ],
        lastReviewed: new Date(),
        reviewedBy: 'Compliance Team',
      },
    ];

    guidanceItems.forEach((guidance) => {
      this.guidance.set(guidance.ruleId, guidance);
    });
  }

  private isDocumentApplicable(
    document: RegulatoryDocument,
    rule: ComplianceRule
  ): boolean {
    // Check if regulation matches
    if (document.regulation !== rule.regulation) {
      return false;
    }

    // Check if domain is applicable
    if (!document.applicableDomains.includes(rule.domain)) {
      return false;
    }

    // Check if document is active
    if (document.status !== 'active') {
      return false;
    }

    return true;
  }

  private findRelevantSections(
    document: RegulatoryDocument,
    rule: ComplianceRule
  ): string[] {
    const sections: string[] = [];

    // If document has a specific section, include it
    if (document.section) {
      sections.push(document.section);
    }

    // Look for keyword matches in document description to suggest relevant sections
    const ruleKeywords = rule.keywords.map((k) => k.toLowerCase());
    const docKeywords = document.keywords.map((k) => k.toLowerCase());

    const matchingKeywords = ruleKeywords.filter((rk) =>
      docKeywords.some((dk) => dk.includes(rk) || rk.includes(dk))
    );

    if (matchingKeywords.length > 0) {
      // This is a simplified approach - in practice, you'd have a more sophisticated
      // mapping of keywords to document sections
      sections.push('General Provisions');
    }

    return sections;
  }

  private calculateApplicabilityScore(
    document: RegulatoryDocument,
    rule: ComplianceRule
  ): number {
    let score = 0;

    // Base score for regulation match
    if (document.regulation === rule.regulation) {
      score += 40;
    }

    // Score for domain match
    if (document.applicableDomains.includes(rule.domain)) {
      score += 20;
    }

    // Score for jurisdiction match
    if (document.jurisdiction === rule.jurisdiction) {
      score += 15;
    }

    // Score for keyword matches
    const ruleKeywords = rule.keywords.map((k) => k.toLowerCase());
    const docKeywords = document.keywords.map((k) => k.toLowerCase());

    const keywordMatches = ruleKeywords.filter((rk) =>
      docKeywords.some((dk) => dk.includes(rk) || rk.includes(dk))
    );

    score += keywordMatches.length * 5;

    // Bonus for recent documents
    const daysSinceUpdate =
      (Date.now() - document.lastUpdated.getTime()) /
      (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 365) {
      score += 10;
    }

    return Math.min(100, score);
  }

  private generateContext(
    document: RegulatoryDocument,
    rule: ComplianceRule
  ): string {
    return `This rule is based on ${document.title}, which applies to ${rule.domain} organizations in ${document.jurisdiction}. The regulation requires compliance with ${rule.regulation} standards.`;
  }

  private getEnforcementHistory(regulation: string): string[] {
    // This would typically come from a database of enforcement actions
    const enforcementHistory: Record<string, string[]> = {
      HIPAA: [
        '2023: $240,000 fine for unauthorized PHI disclosure',
        '2022: $1.2M settlement for inadequate security measures',
        '2021: $400,000 penalty for improper disposal of PHI',
      ],
      SOX: [
        '2023: $50M fine for financial reporting violations',
        '2022: $25M penalty for inadequate internal controls',
        '2021: $75M settlement for accounting irregularities',
      ],
      GDPR: [
        '2023: €1.2B fine for data processing violations',
        '2022: €405M penalty for inadequate consent mechanisms',
        '2021: €746M fine for privacy policy violations',
      ],
    };

    return enforcementHistory[regulation] || [];
  }

  private getPenalties(regulation: string, domain: string): string[] {
    // This would typically come from a regulatory database
    const penalties: Record<string, string[]> = {
      HIPAA: [
        'Tier 1: $100-$50,000 per violation',
        'Tier 2: $1,000-$50,000 per violation',
        'Tier 3: $10,000-$50,000 per violation',
        'Tier 4: $50,000+ per violation',
        'Maximum annual penalty: $1.5M per violation category',
      ],
      SOX: [
        'Civil penalties up to $5M for individuals',
        'Civil penalties up to $25M for entities',
        'Criminal penalties up to 20 years imprisonment',
        'Disgorgement of profits',
      ],
      GDPR: [
        'Administrative fines up to €20M',
        'Administrative fines up to 4% of annual global turnover',
        'Compensation for damages',
        'Corrective measures and compliance orders',
      ],
    };

    return (
      penalties[regulation] || ['Regulatory penalties may apply']
    );
  }

  private generateDocumentId(
    document: Omit<RegulatoryDocument, 'id'>
  ): string {
    const regulation = document.regulation
      .toLowerCase()
      .replace(/\s+/g, '-');
    const section = document.section
      ? `-${document.section.replace(/\./g, '-')}`
      : '';
    return `${regulation}${section}-${Date.now()}`;
  }
}
