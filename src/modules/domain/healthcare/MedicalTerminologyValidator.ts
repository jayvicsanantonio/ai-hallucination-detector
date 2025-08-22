import { ParsedContent } from '@/models/core/ParsedContent';
import { Issue } from '@/models/core/VerificationResult';
import { DomainRule } from '@/modules/interfaces/DomainModule';
import { MedicalData } from './HealthcareModule';

export class MedicalTerminologyValidator {
  private rules: Map<string, DomainRule> = new Map();
  private medicalTerms: Map<string, MedicalTerm> = new Map();
  private drugInteractions: Map<string, string[]> = new Map();

  constructor() {
    this.initializeTerminologyRules();
    this.initializeMedicalTerms();
    this.initializeDrugInteractions();
  }

  async validateTerminology(
    content: ParsedContent,
    medicalData: MedicalData[]
  ): Promise<Issue[]> {
    const issues: Issue[] = [];

    // Validate medical terminology usage
    issues.push(...this.validateMedicalTerms(content));

    // Validate dosage formats and units
    issues.push(...this.validateDosageFormats(medicalData));

    // Check for terminology consistency
    issues.push(...this.checkTerminologyConsistency(content));

    // Validate abbreviations and acronyms
    issues.push(...this.validateMedicalAbbreviations(content));

    // Check for outdated or deprecated terms
    issues.push(...this.checkDeprecatedTerms(content));

    return issues;
  }

  async updateRules(newRules: DomainRule[]): Promise<void> {
    for (const rule of newRules) {
      this.rules.set(rule.id, rule);
    }
  }

  private validateMedicalTerms(content: ParsedContent): Issue[] {
    const issues: Issue[] = [];
    const text = content.extractedText;

    // Look for potential medical terms and validate them
    const medicalTermPattern =
      /\b[A-Z][a-z]+(?:itis|osis|emia|uria|pathy|trophy|plasia|scopy|tomy|ectomy)\b/g;

    let match;
    while ((match = medicalTermPattern.exec(text)) !== null) {
      const term = match[0].toLowerCase();

      if (!this.medicalTerms.has(term)) {
        // Check for common misspellings
        const suggestion = this.findSimilarTerm(term);

        issues.push({
          id: `unknown-medical-term-${Date.now()}`,
          type: 'factual_error',
          severity: 'medium',
          location: {
            start: match.index,
            end: match.index + match[0].length,
            line: 1,
            column: 1,
          },
          description: `Unknown or potentially misspelled medical term: ${match[0]}`,
          evidence: suggestion
            ? [`Did you mean: ${suggestion}?`]
            : [match[0]],
          confidence: 70,
          moduleSource: 'medical-terminology-validator',
        });
      }
    }

    return issues;
  }

  private validateDosageFormats(medicalData: MedicalData[]): Issue[] {
    const issues: Issue[] = [];
    const medications = medicalData.filter(
      (d) => d.type === 'medication'
    );

    for (const medication of medications) {
      if (medication.dosage) {
        const dosageIssue = this.validateDosageFormat(medication);
        if (dosageIssue) {
          issues.push(dosageIssue);
        }
      }
    }

    return issues;
  }

  private checkTerminologyConsistency(
    content: ParsedContent
  ): Issue[] {
    const issues: Issue[] = [];
    const text = content.extractedText.toLowerCase();

    // Check for inconsistent terminology usage
    const terminologyVariants = [
      {
        terms: ['myocardial infarction', 'heart attack', 'mi'],
        preferred: 'myocardial infarction',
      },
      {
        terms: ['cerebrovascular accident', 'stroke', 'cva'],
        preferred: 'cerebrovascular accident',
      },
      {
        terms: ['hypertension', 'high blood pressure'],
        preferred: 'hypertension',
      },
    ];

    for (const variant of terminologyVariants) {
      const foundTerms = variant.terms.filter((term) =>
        text.includes(term)
      );

      if (foundTerms.length > 1) {
        issues.push({
          id: `terminology-inconsistency-${Date.now()}`,
          type: 'factual_error',
          severity: 'low',
          location: { start: 0, end: 100, line: 1, column: 1 },
          description: `Inconsistent medical terminology usage`,
          evidence: [
            `Found: ${foundTerms.join(', ')}`,
            `Recommend using: ${variant.preferred}`,
          ],
          confidence: 75,
          moduleSource: 'medical-terminology-validator',
        });
      }
    }

    return issues;
  }

  private validateMedicalAbbreviations(
    content: ParsedContent
  ): Issue[] {
    const issues: Issue[] = [];
    const text = content.extractedText;

    // Common medical abbreviations that should be spelled out for clarity
    const dangerousAbbreviations = [
      {
        abbrev: 'U',
        fullForm: 'units',
        reason: 'Can be mistaken for 0',
      },
      {
        abbrev: 'IU',
        fullForm: 'international units',
        reason: 'Can be mistaken for IV',
      },
      {
        abbrev: 'QD',
        fullForm: 'daily',
        reason: 'Can be mistaken for QID',
      },
      {
        abbrev: 'QOD',
        fullForm: 'every other day',
        reason: 'Can be mistaken for QD',
      },
      {
        abbrev: 'MS',
        fullForm: 'morphine sulfate or magnesium sulfate',
        reason: 'Ambiguous',
      },
    ];

    for (const abbrev of dangerousAbbreviations) {
      const pattern = new RegExp(`\\b${abbrev.abbrev}\\b`, 'g');
      let match;

      while ((match = pattern.exec(text)) !== null) {
        issues.push({
          id: `dangerous-abbreviation-${Date.now()}`,
          type: 'compliance_violation',
          severity: 'medium',
          location: {
            start: match.index,
            end: match.index + match[0].length,
            line: 1,
            column: 1,
          },
          description: `Potentially dangerous medical abbreviation: ${abbrev.abbrev}`,
          evidence: [
            `Reason: ${abbrev.reason}`,
            `Recommend: ${abbrev.fullForm}`,
          ],
          confidence: 85,
          moduleSource: 'medical-terminology-validator',
        });
      }
    }

    return issues;
  }

  private checkDeprecatedTerms(content: ParsedContent): Issue[] {
    const issues: Issue[] = [];
    const text = content.extractedText.toLowerCase();

    // Deprecated or outdated medical terms
    const deprecatedTerms = [
      {
        old: 'mongolism',
        new: 'Down syndrome',
        reason: 'Outdated and offensive',
      },
      {
        old: 'mental retardation',
        new: 'intellectual disability',
        reason: 'Outdated terminology',
      },
      {
        old: 'diabetic',
        new: 'person with diabetes',
        reason: 'Person-first language preferred',
      },
      {
        old: 'schizophrenic',
        new: 'person with schizophrenia',
        reason: 'Person-first language preferred',
      },
    ];

    for (const term of deprecatedTerms) {
      if (text.includes(term.old)) {
        const index = text.indexOf(term.old);
        issues.push({
          id: `deprecated-term-${Date.now()}`,
          type: 'compliance_violation',
          severity: 'medium',
          location: {
            start: index,
            end: index + term.old.length,
            line: 1,
            column: 1,
          },
          description: `Deprecated medical terminology: ${term.old}`,
          evidence: [
            `Reason: ${term.reason}`,
            `Recommend: ${term.new}`,
          ],
          confidence: 90,
          moduleSource: 'medical-terminology-validator',
        });
      }
    }

    return issues;
  }

  private validateDosageFormat(
    medication: MedicalData
  ): Issue | null {
    if (!medication.dosage) return null;

    // Check for proper dosage format
    const validDosagePattern =
      /^\d+(?:\.\d+)?\s*(?:mg|g|ml|mcg|units?|tablets?|capsules?)(?:\s+(?:once|twice|three times|four times)\s+(?:daily|per day|a day))?$/i;

    if (!validDosagePattern.test(medication.dosage)) {
      return {
        id: `invalid-dosage-format-${medication.id}`,
        type: 'factual_error',
        severity: 'medium',
        location: medication.location,
        description: `Invalid dosage format: ${medication.dosage}`,
        evidence: [
          'Expected format: number + unit + frequency',
          'Example: 500 mg twice daily',
        ],
        confidence: 80,
        moduleSource: 'medical-terminology-validator',
      };
    }

    // Check for dangerous dosage units
    const dangerousUnits = ['cc', 'u']; // cc can be confused with zeros, u can be confused with 0
    const unitMatch = medication.dosage.match(/\d+\s*([a-z]+)/i);

    if (
      unitMatch &&
      dangerousUnits.includes(unitMatch[1].toLowerCase())
    ) {
      return {
        id: `dangerous-dosage-unit-${medication.id}`,
        type: 'compliance_violation',
        severity: 'high',
        location: medication.location,
        description: `Potentially dangerous dosage unit: ${unitMatch[1]}`,
        evidence: [
          unitMatch[1] === 'cc'
            ? 'Use "ml" instead of "cc"'
            : 'Use "units" instead of "u"',
        ],
        confidence: 90,
        moduleSource: 'medical-terminology-validator',
      };
    }

    return null;
  }

  private findSimilarTerm(term: string): string | null {
    // Simple similarity check - in a real implementation, use a more sophisticated algorithm
    const threshold = 0.8;

    for (const [knownTerm] of this.medicalTerms) {
      if (this.calculateSimilarity(term, knownTerm) > threshold) {
        return knownTerm;
      }
    }

    return null;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein distance-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private initializeTerminologyRules(): void {
    const terminologyRules: DomainRule[] = [
      {
        id: 'terminology-001',
        name: 'medical-term-accuracy',
        description:
          'Medical terms must be correctly spelled and recognized',
        severity: 'medium',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'terminology-002',
        name: 'dosage-format-validation',
        description:
          'Dosage formats must follow standard medical conventions',
        severity: 'high',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'terminology-003',
        name: 'abbreviation-safety',
        description:
          'Dangerous medical abbreviations should be avoided',
        severity: 'medium',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    terminologyRules.forEach((rule) => this.rules.set(rule.id, rule));
  }

  private initializeMedicalTerms(): void {
    // Common medical terms - in a real implementation, this would be a comprehensive medical dictionary
    const terms = [
      {
        term: 'pneumonia',
        category: 'condition',
        definition: 'Infection of the lungs',
      },
      {
        term: 'hypertension',
        category: 'condition',
        definition: 'High blood pressure',
      },
      {
        term: 'diabetes',
        category: 'condition',
        definition: 'Blood sugar regulation disorder',
      },
      {
        term: 'arthritis',
        category: 'condition',
        definition: 'Joint inflammation',
      },
      {
        term: 'bronchitis',
        category: 'condition',
        definition: 'Bronchial tube inflammation',
      },
      {
        term: 'gastritis',
        category: 'condition',
        definition: 'Stomach lining inflammation',
      },
      {
        term: 'nephritis',
        category: 'condition',
        definition: 'Kidney inflammation',
      },
      {
        term: 'hepatitis',
        category: 'condition',
        definition: 'Liver inflammation',
      },
      {
        term: 'dermatitis',
        category: 'condition',
        definition: 'Skin inflammation',
      },
      {
        term: 'appendectomy',
        category: 'procedure',
        definition: 'Surgical removal of appendix',
      },
      {
        term: 'colonoscopy',
        category: 'procedure',
        definition: 'Colon examination procedure',
      },
      {
        term: 'endoscopy',
        category: 'procedure',
        definition: 'Internal examination procedure',
      },
    ];

    terms.forEach((termData) => {
      this.medicalTerms.set(termData.term, {
        term: termData.term,
        category: termData.category,
        definition: termData.definition,
      });
    });
  }

  private initializeDrugInteractions(): void {
    // Common drug interactions - in a real implementation, this would be a comprehensive database
    this.drugInteractions.set('warfarin', [
      'aspirin',
      'ibuprofen',
      'acetaminophen',
    ]);
    this.drugInteractions.set('digoxin', [
      'furosemide',
      'amiodarone',
    ]);
    this.drugInteractions.set('lithium', [
      'furosemide',
      'lisinopril',
    ]);
  }
}

interface MedicalTerm {
  term: string;
  category: string;
  definition: string;
}
