import { ComplianceRule } from '../../models/knowledge/ComplianceRule';

export class RulesEngine {
  private rules: Map<string, ComplianceRule[]> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  async getApplicableRules(
    domain: 'legal' | 'financial' | 'healthcare' | 'insurance',
    jurisdiction: string = 'US'
  ): Promise<ComplianceRule[]> {
    const domainRules = this.rules.get(domain) || [];

    return domainRules.filter(
      (rule) =>
        rule.isActive &&
        (rule.jurisdiction === jurisdiction ||
          rule.jurisdiction === 'GLOBAL')
    );
  }

  async addRule(rule: ComplianceRule): Promise<void> {
    const domainRules = this.rules.get(rule.domain) || [];
    domainRules.push(rule);
    this.rules.set(rule.domain, domainRules);
  }

  async updateRule(
    ruleId: string,
    updates: Partial<ComplianceRule>
  ): Promise<void> {
    for (const [domain, rules] of this.rules.entries()) {
      const ruleIndex = rules.findIndex((r) => r.id === ruleId);
      if (ruleIndex !== -1) {
        this.rules.get(domain)![ruleIndex] = {
          ...rules[ruleIndex],
          ...updates,
        };
        break;
      }
    }
  }

  async deactivateRule(ruleId: string): Promise<void> {
    await this.updateRule(ruleId, { isActive: false });
  }

  private initializeDefaultRules(): void {
    // Healthcare/HIPAA rules
    const hipaaRules: ComplianceRule[] = [
      {
        id: 'hipaa-phi-001',
        ruleText:
          'Protected Health Information (PHI) must not be disclosed without proper authorization',
        regulation: 'HIPAA',
        jurisdiction: 'US',
        domain: 'healthcare',
        severity: 'critical',
        examples: [
          'Patient John Doe has diabetes',
          'SSN: 123-45-6789 diagnosed with cancer',
        ],
        keywords: [
          'ssn',
          'social security',
          'patient',
          'diagnosis',
          'medical record',
          'health information',
        ],
        patterns: [
          '\\b\\d{3}-\\d{2}-\\d{4}\\b', // SSN pattern
          '\\b[A-Z][a-z]+ [A-Z][a-z]+ (has|diagnosed with|suffers from)\\b', // Patient diagnosis pattern
        ],
        lastUpdated: new Date(),
        isActive: true,
      },
    ];

    // Financial/SOX rules
    const soxRules: ComplianceRule[] = [
      {
        id: 'sox-financial-001',
        ruleText:
          'Financial statements must be accurate and not contain material misstatements',
        regulation: 'SOX',
        jurisdiction: 'US',
        domain: 'financial',
        severity: 'critical',
        examples: [
          'Revenue increased by 500% (unrealistic)',
          'No material weaknesses identified (when there are known issues)',
        ],
        keywords: [
          'revenue',
          'profit',
          'loss',
          'material weakness',
          'internal controls',
          'financial statement',
        ],
        patterns: [
          '\\b(revenue|profit|earnings)\\s+(increased|decreased)\\s+by\\s+\\d{3,}%\\b', // Extreme percentage changes
          '\\bno\\s+material\\s+weaknesses?\\b', // Absolute statements about controls
        ],
        lastUpdated: new Date(),
        isActive: true,
      },
    ];

    // Legal/GDPR rules
    const gdprRules: ComplianceRule[] = [
      {
        id: 'gdpr-privacy-001',
        ruleText:
          'Personal data processing must have lawful basis and data subject consent',
        regulation: 'GDPR',
        jurisdiction: 'EU',
        domain: 'legal',
        severity: 'high',
        examples: [
          'We collect your email without consent',
          'Personal data is shared with third parties automatically',
        ],
        keywords: [
          'personal data',
          'consent',
          'data subject',
          'processing',
          'third party',
          'data sharing',
        ],
        patterns: [
          '\\b(collect|process|share)\\s+.*\\s+(without|no)\\s+consent\\b',
          '\\bpersonal\\s+data\\s+.*\\s+automatically\\s+(shared|processed)\\b',
        ],
        lastUpdated: new Date(),
        isActive: true,
      },
    ];

    // Insurance rules
    const insuranceRules: ComplianceRule[] = [
      {
        id: 'insurance-claim-001',
        ruleText:
          'Insurance claims must be processed fairly and without discrimination',
        regulation: 'State Insurance Code',
        jurisdiction: 'US',
        domain: 'insurance',
        severity: 'high',
        examples: [
          'Claims from certain zip codes are automatically denied',
          'Age-based claim rejection without medical justification',
        ],
        keywords: [
          'claim denial',
          'discrimination',
          'unfair practice',
          'automatic rejection',
          'bias',
        ],
        patterns: [
          '\\b(automatically|always)\\s+(deny|reject)\\s+claims?\\b',
          '\\b(age|race|gender|zip\\s+code)\\s+based\\s+(denial|rejection)\\b',
        ],
        lastUpdated: new Date(),
        isActive: true,
      },
    ];

    this.rules.set('healthcare', hipaaRules);
    this.rules.set('financial', soxRules);
    this.rules.set('legal', gdprRules);
    this.rules.set('insurance', insuranceRules);
  }

  async getRuleById(ruleId: string): Promise<ComplianceRule | null> {
    for (const rules of this.rules.values()) {
      const rule = rules.find((r) => r.id === ruleId);
      if (rule) return rule;
    }
    return null;
  }

  async getAllRules(): Promise<ComplianceRule[]> {
    const allRules: ComplianceRule[] = [];
    for (const rules of this.rules.values()) {
      allRules.push(...rules);
    }
    return allRules;
  }
}
