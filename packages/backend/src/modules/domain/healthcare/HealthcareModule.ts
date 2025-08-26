import {
  DomainModule,
  ValidationResult,
  DomainRule,
  ModuleInfo,
  ComplianceResult,
} from '@/modules/interfaces/DomainModule';
import { ParsedContent } from '@/models/core/ParsedContent';
import { FeedbackData } from '@/models/audit/FeedbackData';
import { Domain } from '@/models/core/ContentTypes';
import { Issue } from '@/models/core/VerificationResult';
import { MedicalAccuracyValidator } from './MedicalAccuracyValidator';
import { HIPAAComplianceChecker } from './HIPAAComplianceChecker';
import { MedicalTerminologyValidator } from './MedicalTerminologyValidator';

export class HealthcareModule implements DomainModule {
  readonly domain: Domain = 'healthcare';
  readonly version: string = '1.0.0';

  private medicalValidator: MedicalAccuracyValidator;
  private hipaaChecker: HIPAAComplianceChecker;
  private terminologyValidator: MedicalTerminologyValidator;
  private rules: Map<string, DomainRule> = new Map();

  constructor() {
    this.medicalValidator = new MedicalAccuracyValidator();
    this.hipaaChecker = new HIPAAComplianceChecker();
    this.terminologyValidator = new MedicalTerminologyValidator();
    this.initializeDefaultRules();
  }

  async validateContent(
    content: ParsedContent
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const issues: Issue[] = [];

    try {
      // Extract medical data
      const medicalData = await this.extractMedicalData(content);

      // Validate medical accuracy
      const medicalIssues =
        await this.medicalValidator.validateMedicalAccuracy(
          content,
          medicalData
        );
      issues.push(...medicalIssues);

      // Check HIPAA compliance
      const hipaaIssues =
        await this.hipaaChecker.checkHIPAACompliance(
          content,
          medicalData
        );
      issues.push(...hipaaIssues);

      // Validate medical terminology and dosages
      const terminologyIssues =
        await this.terminologyValidator.validateTerminology(
          content,
          medicalData
        );
      issues.push(...terminologyIssues);

      // Calculate overall confidence based on issues found
      const confidence = this.calculateConfidence(issues, content);
      const processingTime = Date.now() - startTime;

      return {
        moduleId: 'healthcare-module',
        issues,
        confidence,
        processingTime,
        metadata: {
          medicalDataFound: medicalData.length,
          rulesApplied: this.rules.size,
          hipaaCompliant: hipaaIssues.length === 0,
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      return {
        moduleId: 'healthcare-module',
        issues: [
          {
            id: `healthcare-error-${Date.now()}`,
            type: 'compliance_violation',
            severity: 'medium',
            location: { start: 0, end: 0, line: 1, column: 1 },
            description: `Healthcare validation failed: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
            evidence: [],
            confidence: 0,
            moduleSource: 'healthcare-module',
          },
        ],
        confidence: 0,
        processingTime,
        metadata: {
          error:
            error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  async updateRules(newRules: DomainRule[]): Promise<void> {
    for (const rule of newRules) {
      this.rules.set(rule.id, rule);
    }

    // Update validators with new rules
    await this.medicalValidator.updateRules(
      newRules.filter((r) => r.name.includes('medical'))
    );
    await this.hipaaChecker.updateRules(
      newRules.filter((r) => r.name.includes('hipaa'))
    );
  }

  async learnFromFeedback(feedback: FeedbackData): Promise<void> {
    // Implement learning logic based on user feedback
    console.log(
      `Learning from feedback for healthcare module: ${feedback.userFeedback}`
    );

    if (feedback.corrections) {
      // Parse corrections and update validation patterns
      await this.updateValidationPatterns(feedback);
    }
  }

  getModuleInfo(): ModuleInfo {
    return {
      name: 'Healthcare Domain Module',
      version: this.version,
      domain: this.domain,
      description:
        'Validates healthcare documents for medical accuracy, HIPAA compliance, and terminology validation',
      capabilities: [
        'Medical accuracy validation',
        'HIPAA compliance checking',
        'Medical terminology and dosage validation',
        'PII detection and protection',
        'Clinical data verification',
      ],
      lastUpdated: new Date(),
      rulesCount: this.rules.size,
    };
  }

  // Healthcare-specific methods
  async validateMedicalAccuracy(
    content: string
  ): Promise<ValidationResult> {
    const parsedContent: ParsedContent = {
      id: 'temp-content',
      originalContent: content,
      extractedText: content,
      contentType: 'text',
      structure: {
        sections: [],
        tables: [],
        figures: [],
        references: [],
      },
      entities: [],
      metadata: {},
      createdAt: new Date(),
    };

    const medicalData = await this.extractMedicalData(parsedContent);
    return this.medicalValidator.validateMedicalData(medicalData);
  }

  async checkHIPAACompliance(
    content: string
  ): Promise<ComplianceResult> {
    const parsedContent: ParsedContent = {
      id: 'temp-content',
      originalContent: content,
      extractedText: content,
      contentType: 'text',
      structure: {
        sections: [],
        tables: [],
        figures: [],
        references: [],
      },
      entities: [],
      metadata: {},
      createdAt: new Date(),
    };

    return this.hipaaChecker.checkCompliance(parsedContent);
  }

  private async extractMedicalData(
    content: ParsedContent
  ): Promise<MedicalData[]> {
    const medicalData: MedicalData[] = [];
    const text = content.extractedText;

    // Extract medications and dosages
    const medicationPattern =
      /\b([A-Z][a-z]+(?:in|ol|ide|ate|ine|ium)?)\s+(\d+(?:\.\d+)?\s*(?:mg|g|ml|mcg|units?))\b/gi;
    let match;
    while ((match = medicationPattern.exec(text)) !== null) {
      medicalData.push({
        id: `medication-${medicalData.length}`,
        type: 'medication',
        value: match[0],
        location: {
          start: match.index,
          end: match.index + match[0].length,
        },
        medication: match[1],
        dosage: match[2],
      });
    }

    // Extract medical conditions
    const conditionPattern =
      /\b(?:diagnosis|condition|disease|disorder|syndrome):\s*([A-Z][a-z\s]+)/gi;
    while ((match = conditionPattern.exec(text)) !== null) {
      medicalData.push({
        id: `condition-${medicalData.length}`,
        type: 'medical_condition',
        value: match[1].trim(),
        location: {
          start: match.index,
          end: match.index + match[0].length,
        },
      });
    }

    // Extract vital signs
    const vitalSignsPatterns = [
      {
        name: 'blood_pressure',
        pattern: /\b(\d{2,3}\/\d{2,3})\s*mmHg\b/gi,
      },
      { name: 'heart_rate', pattern: /\b(\d{2,3})\s*bpm\b/gi },
      {
        name: 'temperature',
        pattern: /\b(\d{2,3}(?:\.\d)?)\s*°?[FC]\b/gi,
      },
      {
        name: 'weight',
        pattern: /\b(\d{2,3}(?:\.\d)?)\s*(?:kg|lbs?)\b/gi,
      },
    ];

    for (const vitalPattern of vitalSignsPatterns) {
      while ((match = vitalPattern.pattern.exec(text)) !== null) {
        medicalData.push({
          id: `vital-${medicalData.length}`,
          type: 'vital_sign',
          value: match[0],
          location: {
            start: match.index,
            end: match.index + match[0].length,
          },
          vitalType: vitalPattern.name,
          numericValue: this.parseVitalSign(
            match[1],
            vitalPattern.name
          ),
        });
      }
    }

    // Extract patient identifiers (for HIPAA compliance checking)
    const patientIdPattern =
      /\b(?:patient|pt|id|mrn)[\s#:]*(\d{4,})\b/gi;
    while ((match = patientIdPattern.exec(text)) !== null) {
      medicalData.push({
        id: `patient-id-${medicalData.length}`,
        type: 'patient_identifier',
        value: match[0],
        location: {
          start: match.index,
          end: match.index + match[0].length,
        },
        identifier: match[1],
      });
    }

    return medicalData;
  }

  private parseVitalSign(value: string, type: string): number {
    switch (type) {
      case 'blood_pressure':
        const bpParts = value.split('/');
        return parseFloat(bpParts[0]); // Return systolic pressure
      case 'heart_rate':
      case 'temperature':
      case 'weight':
        return parseFloat(value);
      default:
        return 0;
    }
  }

  private initializeDefaultRules(): void {
    const defaultRules: DomainRule[] = [
      {
        id: 'healthcare-001',
        name: 'medical-accuracy',
        description:
          'Ensures medical information is accurate and evidence-based',
        severity: 'critical',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'healthcare-002',
        name: 'hipaa-compliance',
        description: 'Validates HIPAA compliance and PII protection',
        pattern: '(patient|medical record|health information)',
        severity: 'critical',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'healthcare-003',
        name: 'dosage-validation',
        description:
          'Validates medication dosages and administration',
        severity: 'high',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    defaultRules.forEach((rule) => this.rules.set(rule.id, rule));
  }

  private calculateConfidence(
    issues: Issue[],
    content: ParsedContent
  ): number {
    if (issues.length === 0) return 95;

    const criticalIssues = issues.filter(
      (i) => i.severity === 'critical'
    ).length;
    const highIssues = issues.filter(
      (i) => i.severity === 'high'
    ).length;
    const mediumIssues = issues.filter(
      (i) => i.severity === 'medium'
    ).length;
    const lowIssues = issues.filter(
      (i) => i.severity === 'low'
    ).length;

    // Healthcare issues are weighted more heavily due to safety concerns
    const contentLength = content.extractedText.length;
    const issueWeight =
      criticalIssues * 50 +
      highIssues * 25 +
      mediumIssues * 12 +
      lowIssues * 6;
    const normalizedWeight = Math.min(
      issueWeight / (contentLength / 1000),
      95
    );

    return Math.max(5, 95 - normalizedWeight);
  }

  private async updateValidationPatterns(
    feedback: FeedbackData
  ): Promise<void> {
    // Implementation for updating validation patterns based on feedback
    console.log(
      `Updating healthcare validation patterns based on feedback: ${feedback.corrections}`
    );
  }
}

// Supporting interfaces
export interface MedicalData {
  id: string;
  type:
    | 'medication'
    | 'medical_condition'
    | 'vital_sign'
    | 'patient_identifier'
    | 'procedure';
  value: string;
  location: {
    start: number;
    end: number;
  };
  medication?: string;
  dosage?: string;
  vitalType?: string;
  numericValue?: number;
  identifier?: string;
  context?: string;
}
