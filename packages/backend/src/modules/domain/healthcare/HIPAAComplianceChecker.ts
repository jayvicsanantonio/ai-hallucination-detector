import { ParsedContent } from '@/models/core/ParsedContent';
import { Issue } from '@/models/core/VerificationResult';
import {
  DomainRule,
  ComplianceResult,
  ComplianceViolation,
} from '@/modules/interfaces/DomainModule';
import { MedicalData } from './HealthcareModule';

export class HIPAAComplianceChecker {
  private rules: Map<string, DomainRule> = new Map();
  private piiPatterns: Map<string, RegExp> = new Map();

  constructor() {
    this.initializeHIPAARules();
    this.initializePIIPatterns();
  }

  async checkHIPAACompliance(
    content: ParsedContent,
    medicalData: MedicalData[]
  ): Promise<Issue[]> {
    const issues: Issue[] = [];

    // Check for PII exposure
    issues.push(...this.detectPII(content));

    // Check for patient identifiers
    issues.push(
      ...this.checkPatientIdentifiers(medicalData, content)
    );

    // Check for required HIPAA disclosures
    issues.push(...this.checkRequiredDisclosures(content));

    // Check for data security requirements
    issues.push(...this.checkDataSecurityRequirements(content));

    // Check for minimum necessary standard
    issues.push(
      ...this.checkMinimumNecessaryStandard(content, medicalData)
    );

    return issues;
  }

  async checkCompliance(
    content: ParsedContent
  ): Promise<ComplianceResult> {
    const violations: ComplianceViolation[] = [];
    const checkedRules: string[] = [];
    const text = content.extractedText.toLowerCase();

    // Check for required HIPAA elements
    const requiredElements = [
      { term: 'privacy notice', description: 'HIPAA privacy notice' },
      {
        term: 'patient rights',
        description: 'Patient rights disclosure',
      },
      {
        term: 'protected health information',
        description: 'PHI definition',
      },
    ];

    for (const element of requiredElements) {
      checkedRules.push(`hipaa-${element.term.replace(' ', '-')}`);

      if (!new RegExp(element.term, 'i').test(text)) {
        violations.push({
          ruleId: `hipaa-${element.term.replace(' ', '-')}`,
          ruleName: `HIPAA ${element.description}`,
          description: `Missing required HIPAA element: ${element.description}`,
          severity: 'high',
          suggestion: `Include ${element.description} in the document`,
        });
      }
    }

    // Check for PII exposure
    const piiIssues = this.detectPII(content);
    for (const issue of piiIssues) {
      violations.push({
        ruleId: issue.id,
        ruleName: 'PII Protection',
        description: issue.description,
        severity: issue.severity,
        location: {
          start: issue.location.start,
          end: issue.location.end,
        },
        suggestion: 'Remove or anonymize personal identifiers',
      });
    }

    const confidence =
      violations.length === 0
        ? 95
        : Math.max(20, 95 - violations.length * 15);

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

  private detectPII(content: ParsedContent): Issue[] {
    const issues: Issue[] = [];
    const text = content.extractedText;

    for (const [piiType, pattern] of this.piiPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        issues.push({
          id: `pii-${piiType}-${Date.now()}`,
          type: 'compliance_violation',
          severity: 'critical',
          location: {
            start: match.index,
            end: match.index + match[0].length,
            line: 1,
            column: 1,
          },
          description: `Potential PII exposure detected: ${piiType}`,
          evidence: [match[0]],
          confidence: 85,
          moduleSource: 'hipaa-compliance-checker',
        });
      }
    }

    return issues;
  }

  private checkPatientIdentifiers(
    medicalData: MedicalData[],
    content: ParsedContent
  ): Issue[] {
    const issues: Issue[] = [];
    const patientIds = medicalData.filter(
      (d) => d.type === 'patient_identifier'
    );

    for (const patientId of patientIds) {
      // Check if patient ID is properly protected
      const surroundingText = content.extractedText.substring(
        Math.max(0, patientId.location.start - 50),
        Math.min(
          content.extractedText.length,
          patientId.location.end + 50
        )
      );

      const hasProtection =
        /(?:redacted|anonymized|protected|de-identified)/i.test(
          surroundingText
        );

      if (!hasProtection) {
        issues.push({
          id: `unprotected-patient-id-${patientId.id}`,
          type: 'compliance_violation',
          severity: 'critical',
          location: patientId.location,
          description: 'Unprotected patient identifier detected',
          evidence: [patientId.value],
          confidence: 90,
          moduleSource: 'hipaa-compliance-checker',
        });
      }
    }

    return issues;
  }

  private checkRequiredDisclosures(content: ParsedContent): Issue[] {
    const issues: Issue[] = [];
    const text = content.extractedText.toLowerCase();

    // Check for required HIPAA disclosures
    const requiredDisclosures = [
      {
        term: 'privacy notice',
        description: 'HIPAA privacy notice',
        severity: 'high' as const,
      },
      {
        term: 'patient rights',
        description: 'Patient rights under HIPAA',
        severity: 'high' as const,
      },
      {
        term: 'protected health information',
        description: 'PHI definition and protection',
        severity: 'medium' as const,
      },
    ];

    for (const disclosure of requiredDisclosures) {
      if (!new RegExp(disclosure.term, 'i').test(text)) {
        issues.push({
          id: `missing-disclosure-${Date.now()}`,
          type: 'compliance_violation',
          severity: disclosure.severity,
          location: { start: 0, end: 100, line: 1, column: 1 },
          description: `Missing required HIPAA disclosure: ${disclosure.description}`,
          evidence: [`Required: ${disclosure.term}`],
          confidence: 80,
          moduleSource: 'hipaa-compliance-checker',
        });
      }
    }

    return issues;
  }

  private checkDataSecurityRequirements(
    content: ParsedContent
  ): Issue[] {
    const issues: Issue[] = [];
    const text = content.extractedText.toLowerCase();

    // Check for security safeguards mentions
    const securityTerms = [
      'encryption',
      'access control',
      'audit log',
      'security measures',
    ];
    const hasSecurityMention = securityTerms.some((term) =>
      text.includes(term)
    );

    if (!hasSecurityMention && this.containsHealthInformation(text)) {
      issues.push({
        id: `missing-security-safeguards-${Date.now()}`,
        type: 'compliance_violation',
        severity: 'medium',
        location: { start: 0, end: 100, line: 1, column: 1 },
        description:
          'Document lacks mention of required security safeguards',
        evidence: ['No security measures mentioned'],
        confidence: 70,
        moduleSource: 'hipaa-compliance-checker',
      });
    }

    // Check for breach notification procedures
    const hasBreachProcedures = /breach.*notification/i.test(text);
    if (
      !hasBreachProcedures &&
      this.containsHealthInformation(text)
    ) {
      issues.push({
        id: `missing-breach-procedures-${Date.now()}`,
        type: 'compliance_violation',
        severity: 'medium',
        location: { start: 0, end: 100, line: 1, column: 1 },
        description: 'Missing breach notification procedures',
        evidence: ['No breach notification procedures found'],
        confidence: 75,
        moduleSource: 'hipaa-compliance-checker',
      });
    }

    return issues;
  }

  private checkMinimumNecessaryStandard(
    content: ParsedContent,
    medicalData: MedicalData[]
  ): Issue[] {
    const issues: Issue[] = [];

    // Check if excessive health information is being disclosed
    if (medicalData.length > 10) {
      issues.push({
        id: `excessive-phi-disclosure-${Date.now()}`,
        type: 'compliance_violation',
        severity: 'medium',
        location: { start: 0, end: 100, line: 1, column: 1 },
        description:
          'Potentially excessive PHI disclosure - review minimum necessary standard',
        evidence: [
          `${medicalData.length} pieces of health information found`,
        ],
        confidence: 60,
        moduleSource: 'hipaa-compliance-checker',
      });
    }

    return issues;
  }

  private containsHealthInformation(text: string): boolean {
    const healthTerms = [
      'patient',
      'medical',
      'health',
      'diagnosis',
      'treatment',
      'medication',
      'doctor',
      'hospital',
      'clinic',
      'healthcare',
    ];

    return healthTerms.some((term) => text.includes(term));
  }

  private initializeHIPAARules(): void {
    const hipaaRules: DomainRule[] = [
      {
        id: 'hipaa-001',
        name: 'pii-protection',
        description:
          'Personal identifiers must be protected or anonymized',
        severity: 'critical',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'hipaa-002',
        name: 'privacy-notice',
        description: 'Required HIPAA privacy notice must be present',
        pattern: 'privacy notice',
        severity: 'high',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'hipaa-003',
        name: 'minimum-necessary',
        description: 'Only minimum necessary PHI should be disclosed',
        severity: 'medium',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    hipaaRules.forEach((rule) => this.rules.set(rule.id, rule));
  }

  private initializePIIPatterns(): void {
    // Social Security Numbers
    this.piiPatterns.set('ssn', /\b\d{3}-\d{2}-\d{4}\b/g);

    // Phone numbers
    this.piiPatterns.set(
      'phone',
      /\b(?:\+1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g
    );

    // Email addresses
    this.piiPatterns.set(
      'email',
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    );

    // Credit card numbers (basic pattern)
    this.piiPatterns.set(
      'credit_card',
      /\b(?:\d{4}[-\s]?){3}\d{4}\b/g
    );

    // Medical record numbers
    this.piiPatterns.set(
      'mrn',
      /\b(?:MRN|mrn|medical record|patient id)[\s#:]*(\d{6,})\b/gi
    );

    // Dates of birth
    this.piiPatterns.set(
      'dob',
      /\b(?:dob|date of birth|born)[\s:]*(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})\b/gi
    );

    // Full names (basic pattern - may have false positives)
    this.piiPatterns.set(
      'full_name',
      /\b[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g
    );

    // Addresses (basic pattern)
    this.piiPatterns.set(
      'address',
      /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b/gi
    );
  }
}
