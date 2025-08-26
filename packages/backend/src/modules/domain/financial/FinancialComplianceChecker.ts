import { ParsedContent } from '@/models/core/ParsedContent';
import { Issue } from '@/models/core/VerificationResult';
import {
  DomainRule,
  ComplianceResult,
  ComplianceViolation,
} from '@/modules/interfaces/DomainModule';
import { FinancialData } from './FinancialModule';

export class FinancialComplianceChecker {
  private rules: Map<string, DomainRule> = new Map();
  private regulationRules: Map<string, RegulationRule[]> = new Map();

  constructor() {
    this.initializeComplianceRules();
    this.initializeRegulationRules();
  }

  async checkFinancialCompliance(
    content: ParsedContent,
    financialData: FinancialData[]
  ): Promise<Issue[]> {
    const issues: Issue[] = [];

    // Check general financial compliance
    issues.push(...this.checkGeneralCompliance(content));

    // Check specific regulation compliance
    issues.push(...this.checkSOXCompliance(content));
    issues.push(...this.checkGAAPCompliance(content));
    issues.push(...this.checkSECCompliance(content));

    // Check disclosure requirements
    issues.push(
      ...this.checkDisclosureRequirements(content, financialData)
    );

    // Check risk management requirements
    issues.push(
      ...this.checkRiskManagementCompliance(content, financialData)
    );

    return issues;
  }

  async checkRegulationCompliance(
    content: string,
    regulations: string[]
  ): Promise<ComplianceResult> {
    const violations: ComplianceViolation[] = [];
    const checkedRules: string[] = [];

    for (const regulation of regulations) {
      const regulationRules =
        this.regulationRules.get(regulation.toLowerCase()) || [];

      for (const rule of regulationRules) {
        checkedRules.push(rule.id);

        if (rule.requiredTerms) {
          for (const term of rule.requiredTerms) {
            if (!new RegExp(term, 'i').test(content)) {
              violations.push({
                ruleId: rule.id,
                ruleName: rule.name,
                description: `Missing required term: ${term}`,
                severity: rule.severity,
                suggestion: `Include required disclosure: ${term}`,
              });
            }
          }
        }

        if (rule.prohibitedTerms) {
          for (const term of rule.prohibitedTerms) {
            if (new RegExp(term, 'i').test(content)) {
              violations.push({
                ruleId: rule.id,
                ruleName: rule.name,
                description: `Prohibited term found: ${term}`,
                severity: rule.severity,
                suggestion: `Remove or replace prohibited term: ${term}`,
              });
            }
          }
        }

        if (
          rule.pattern &&
          !new RegExp(rule.pattern, 'i').test(content)
        ) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            description: rule.description,
            severity: rule.severity,
            suggestion: rule.suggestion,
          });
        }
      }
    }

    const confidence =
      violations.length === 0
        ? 95
        : Math.max(20, 95 - violations.length * 10);

    return {
      isCompliant: violations.length === 0,
      violations,
      confidence,
      checkedRules,
    };
  }

  async updateRules(newRules: DomainRule[]): Promise<void> {
    for (const rule of newRules) {
      this.rules.set(rule.id, rule);
    }
  }

  private checkGeneralCompliance(content: ParsedContent): Issue[] {
    const issues: Issue[] = [];
    const text = content.extractedText.toLowerCase();

    // Check for misleading financial statements
    const misleadingTerms = [
      'guaranteed returns',
      'risk-free investment',
      'no risk',
      'certain profit',
      'guaranteed profit',
    ];

    for (const term of misleadingTerms) {
      if (text.includes(term.toLowerCase())) {
        const index = text.indexOf(term.toLowerCase());
        issues.push({
          id: `misleading-statement-${Date.now()}`,
          type: 'compliance_violation',
          severity: 'critical',
          location: {
            start: index,
            end: index + term.length,
            line: 1,
            column: 1,
          },
          description:
            'Potentially misleading financial statement detected',
          evidence: [term],
          confidence: 90,
          moduleSource: 'financial-compliance-checker',
        });
      }
    }

    // Check for required risk disclosures
    const hasRiskDisclosure =
      /(?:risk|risks|may lose|potential loss|not guaranteed)/i.test(
        text
      );
    if (!hasRiskDisclosure && this.containsInvestmentAdvice(text)) {
      issues.push({
        id: `missing-risk-disclosure-${Date.now()}`,
        type: 'compliance_violation',
        severity: 'high',
        location: { start: 0, end: 100, line: 1, column: 1 },
        description:
          'Investment advice lacks required risk disclosure',
        evidence: ['No risk disclosure found'],
        confidence: 85,
        moduleSource: 'financial-compliance-checker',
      });
    }

    return issues;
  }

  private checkSOXCompliance(content: ParsedContent): Issue[] {
    const issues: Issue[] = [];
    const text = content.extractedText.toLowerCase();

    // Check for SOX-related requirements
    if (this.isPublicCompanyDocument(text)) {
      // Check for CEO/CFO certification requirements
      const hasCertification =
        /(?:ceo|cfo|chief executive|chief financial).*(?:certif|attest)/i.test(
          text
        );
      if (!hasCertification) {
        issues.push({
          id: `sox-certification-${Date.now()}`,
          type: 'compliance_violation',
          severity: 'critical',
          location: { start: 0, end: 100, line: 1, column: 1 },
          description:
            'SOX compliance: Missing CEO/CFO certification',
          evidence: ['No executive certification found'],
          confidence: 80,
          moduleSource: 'financial-compliance-checker',
        });
      }

      // Check for internal controls disclosure
      const hasInternalControls = /internal control/i.test(text);
      if (!hasInternalControls) {
        issues.push({
          id: `sox-internal-controls-${Date.now()}`,
          type: 'compliance_violation',
          severity: 'high',
          location: { start: 0, end: 100, line: 1, column: 1 },
          description:
            'SOX compliance: Missing internal controls disclosure',
          evidence: ['No internal controls mention found'],
          confidence: 75,
          moduleSource: 'financial-compliance-checker',
        });
      }
    }

    return issues;
  }

  private checkGAAPCompliance(content: ParsedContent): Issue[] {
    const issues: Issue[] = [];
    const text = content.extractedText.toLowerCase();

    // Check for GAAP-related requirements
    if (this.isFinancialStatement(text)) {
      // Check for required financial statement elements
      const requiredElements = [
        'balance sheet',
        'income statement',
        'cash flow',
        'statement of equity',
      ];

      for (const element of requiredElements) {
        if (!new RegExp(element, 'i').test(text)) {
          issues.push({
            id: `gaap-missing-element-${Date.now()}`,
            type: 'compliance_violation',
            severity: 'medium',
            location: { start: 0, end: 100, line: 1, column: 1 },
            description: `GAAP compliance: Missing ${element}`,
            evidence: [`Required element: ${element}`],
            confidence: 70,
            moduleSource: 'financial-compliance-checker',
          });
        }
      }

      // Check for proper accounting method disclosure
      const hasAccountingMethod =
        /(?:accrual|cash basis|accounting method)/i.test(text);
      if (!hasAccountingMethod) {
        issues.push({
          id: `gaap-accounting-method-${Date.now()}`,
          type: 'compliance_violation',
          severity: 'medium',
          location: { start: 0, end: 100, line: 1, column: 1 },
          description:
            'GAAP compliance: Missing accounting method disclosure',
          evidence: ['No accounting method specified'],
          confidence: 75,
          moduleSource: 'financial-compliance-checker',
        });
      }
    }

    return issues;
  }

  private checkSECCompliance(content: ParsedContent): Issue[] {
    const issues: Issue[] = [];
    const text = content.extractedText.toLowerCase();

    // Check for SEC filing requirements
    if (this.isSECFiling(text)) {
      // Check for required forward-looking statement disclaimer
      const hasForwardLookingDisclaimer =
        /forward.looking.*statement/i.test(text);
      if (!hasForwardLookingDisclaimer) {
        issues.push({
          id: `sec-forward-looking-${Date.now()}`,
          type: 'compliance_violation',
          severity: 'high',
          location: { start: 0, end: 100, line: 1, column: 1 },
          description:
            'SEC compliance: Missing forward-looking statement disclaimer',
          evidence: ['No forward-looking statement disclaimer found'],
          confidence: 85,
          moduleSource: 'financial-compliance-checker',
        });
      }

      // Check for material information disclosure
      const hasMaterialDisclosure =
        /material.*(?:information|change|event)/i.test(text);
      if (!hasMaterialDisclosure) {
        issues.push({
          id: `sec-material-disclosure-${Date.now()}`,
          type: 'compliance_violation',
          severity: 'medium',
          location: { start: 0, end: 100, line: 1, column: 1 },
          description:
            'SEC compliance: Consider material information disclosure',
          evidence: ['No material information disclosure found'],
          confidence: 60,
          moduleSource: 'financial-compliance-checker',
        });
      }
    }

    return issues;
  }

  private checkDisclosureRequirements(
    content: ParsedContent,
    financialData: FinancialData[]
  ): Issue[] {
    const issues: Issue[] = [];
    const text = content.extractedText.toLowerCase();

    // Check for fee disclosure in investment documents
    if (this.containsInvestmentAdvice(text)) {
      const hasFeeDisclosure =
        /(?:fee|fees|commission|expense|cost)/i.test(text);
      if (!hasFeeDisclosure) {
        issues.push({
          id: `missing-fee-disclosure-${Date.now()}`,
          type: 'compliance_violation',
          severity: 'medium',
          location: { start: 0, end: 100, line: 1, column: 1 },
          description: 'Investment document missing fee disclosure',
          evidence: ['No fee or expense information found'],
          confidence: 80,
          moduleSource: 'financial-compliance-checker',
        });
      }
    }

    // Check for conflict of interest disclosure
    if (this.containsRecommendations(text)) {
      const hasConflictDisclosure = /conflict.*interest/i.test(text);
      if (!hasConflictDisclosure) {
        issues.push({
          id: `missing-conflict-disclosure-${Date.now()}`,
          type: 'compliance_violation',
          severity: 'medium',
          location: { start: 0, end: 100, line: 1, column: 1 },
          description: 'Missing conflict of interest disclosure',
          evidence: ['No conflict of interest disclosure found'],
          confidence: 75,
          moduleSource: 'financial-compliance-checker',
        });
      }
    }

    return issues;
  }

  private checkRiskManagementCompliance(
    content: ParsedContent,
    financialData: FinancialData[]
  ): Issue[] {
    const issues: Issue[] = [];
    const text = content.extractedText.toLowerCase();

    // Check for risk assessment in financial documents
    if (financialData.length > 0) {
      const hasRiskAssessment =
        /(?:risk assessment|risk management|risk analysis)/i.test(
          text
        );
      if (!hasRiskAssessment) {
        issues.push({
          id: `missing-risk-assessment-${Date.now()}`,
          type: 'compliance_violation',
          severity: 'medium',
          location: { start: 0, end: 100, line: 1, column: 1 },
          description: 'Financial document lacks risk assessment',
          evidence: ['No risk assessment found'],
          confidence: 70,
          moduleSource: 'financial-compliance-checker',
        });
      }
    }

    return issues;
  }

  private containsInvestmentAdvice(text: string): boolean {
    return /(?:invest|investment|buy|sell|recommend|advise|portfolio)/i.test(
      text
    );
  }

  private containsRecommendations(text: string): boolean {
    return /(?:recommend|suggest|advise|should|ought to)/i.test(text);
  }

  private isPublicCompanyDocument(text: string): boolean {
    return /(?:public company|publicly traded|sec filing|10-k|10-q|8-k)/i.test(
      text
    );
  }

  private isFinancialStatement(text: string): boolean {
    return /(?:financial statement|balance sheet|income statement|cash flow statement)/i.test(
      text
    );
  }

  private isSECFiling(text: string): boolean {
    return /(?:sec|securities and exchange|form 10|form 8|proxy statement)/i.test(
      text
    );
  }

  private initializeComplianceRules(): void {
    const complianceRules: DomainRule[] = [
      {
        id: 'financial-compliance-001',
        name: 'misleading-statements',
        description:
          'Financial documents must not contain misleading statements',
        severity: 'critical',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'financial-compliance-002',
        name: 'risk-disclosure',
        description:
          'Investment advice must include risk disclosures',
        severity: 'high',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'financial-compliance-003',
        name: 'fee-disclosure',
        description:
          'Investment documents must disclose fees and expenses',
        severity: 'medium',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    complianceRules.forEach((rule) => this.rules.set(rule.id, rule));
  }

  private initializeRegulationRules(): void {
    // SOX (Sarbanes-Oxley) rules
    this.regulationRules.set('sox', [
      {
        id: 'sox-001',
        name: 'Executive Certification',
        description: 'CEO and CFO must certify financial statements',
        severity: 'critical',
        requiredTerms: ['certification', 'ceo', 'cfo'],
        suggestion: 'Include executive certification statements',
      },
      {
        id: 'sox-002',
        name: 'Internal Controls',
        description: 'Must disclose internal control assessments',
        severity: 'high',
        requiredTerms: ['internal control'],
        suggestion: 'Include internal control assessment',
      },
    ]);

    // GAAP (Generally Accepted Accounting Principles) rules
    this.regulationRules.set('gaap', [
      {
        id: 'gaap-001',
        name: 'Financial Statement Completeness',
        description: 'Must include all required financial statements',
        severity: 'high',
        requiredTerms: [
          'balance sheet',
          'income statement',
          'cash flow',
        ],
        suggestion: 'Include all required financial statements',
      },
    ]);

    // SEC (Securities and Exchange Commission) rules
    this.regulationRules.set('sec', [
      {
        id: 'sec-001',
        name: 'Forward-Looking Statements',
        description:
          'Must include forward-looking statement disclaimers',
        severity: 'high',
        requiredTerms: ['forward-looking statement'],
        suggestion: 'Include forward-looking statement disclaimer',
      },
    ]);
  }
}

interface RegulationRule {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  pattern?: string;
  requiredTerms?: string[];
  prohibitedTerms?: string[];
  suggestion?: string;
}
