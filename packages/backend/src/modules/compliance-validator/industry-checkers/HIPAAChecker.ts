import { ComplianceViolation } from '../../../models/knowledge/ComplianceRule';
import { ParsedContent } from '../../../models/core/ParsedContent';

export class HIPAAChecker {
  private readonly PHI_PATTERNS = [
    {
      name: 'SSN',
      pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
      severity: 'critical' as const,
      description: 'Social Security Number detected',
    },
    {
      name: 'Phone',
      pattern: /\b\d{3}-\d{3}-\d{4}\b/g,
      severity: 'medium' as const,
      description: 'Phone number detected',
    },
    {
      name: 'Email',
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      severity: 'medium' as const,
      description: 'Email address detected',
    },
    {
      name: 'Medical Record Number',
      pattern: /\b(MRN|MR#|Medical Record)\s*:?\s*\d+\b/gi,
      severity: 'critical' as const,
      description: 'Medical record number detected',
    },
  ];

  private readonly PHI_KEYWORDS = [
    { keyword: 'patient', severity: 'medium' as const },
    { keyword: 'diagnosis', severity: 'high' as const },
    { keyword: 'treatment', severity: 'medium' as const },
    { keyword: 'medication', severity: 'medium' as const },
    { keyword: 'health condition', severity: 'high' as const },
    { keyword: 'medical history', severity: 'high' as const },
    { keyword: 'lab results', severity: 'high' as const },
    { keyword: 'prescription', severity: 'medium' as const },
  ];

  async checkCompliance(
    content: ParsedContent
  ): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];
    const text = content.extractedText;

    // Check for PHI patterns
    for (const pattern of this.PHI_PATTERNS) {
      const matches = Array.from(text.matchAll(pattern.pattern));
      for (const match of matches) {
        if (match.index !== undefined) {
          violations.push({
            ruleId: `hipaa-phi-${pattern.name.toLowerCase()}`,
            rule: {
              id: `hipaa-phi-${pattern.name.toLowerCase()}`,
              ruleText: `HIPAA requires protection of ${pattern.name}`,
              regulation: 'HIPAA',
              jurisdiction: 'US',
              domain: 'healthcare',
              severity: pattern.severity,
              examples: [],
              keywords: [],
              patterns: [pattern.pattern.source],
              lastUpdated: new Date(),
              isActive: true,
            },
            violationType: 'pattern_match',
            location: {
              start: match.index,
              end: match.index + match[0].length,
              text: match[0],
            },
            confidence: 95,
            severity: pattern.severity,
            description: `${pattern.description} - potential PHI exposure`,
            regulatoryReference: 'HIPAA Privacy Rule 45 CFR 164.502',
            suggestedFix: `Remove or anonymize ${pattern.name} to comply with HIPAA`,
          });
        }
      }
    }

    // Check for PHI keywords in context
    const lowerText = text.toLowerCase();
    for (const { keyword, severity } of this.PHI_KEYWORDS) {
      const keywordIndex = lowerText.indexOf(keyword);
      if (keywordIndex !== -1) {
        // Check if keyword appears in a potentially problematic context
        const context = this.extractContext(text, keywordIndex, 50);
        if (this.isPotentialPHIContext(context)) {
          violations.push({
            ruleId: `hipaa-keyword-${keyword.replace(' ', '-')}`,
            rule: {
              id: `hipaa-keyword-${keyword.replace(' ', '-')}`,
              ruleText: `HIPAA requires careful handling of ${keyword} information`,
              regulation: 'HIPAA',
              jurisdiction: 'US',
              domain: 'healthcare',
              severity: severity,
              examples: [],
              keywords: [keyword],
              patterns: [],
              lastUpdated: new Date(),
              isActive: true,
            },
            violationType: 'keyword_match',
            location: {
              start: keywordIndex,
              end: keywordIndex + keyword.length,
              text: keyword,
            },
            confidence: 75,
            severity: severity,
            description: `Healthcare-related keyword "${keyword}" detected in potentially sensitive context`,
            regulatoryReference: 'HIPAA Privacy Rule 45 CFR 164.502',
            suggestedFix:
              'Review context to ensure PHI is properly protected',
          });
        }
      }
    }

    return violations;
  }

  private extractContext(
    text: string,
    index: number,
    radius: number
  ): string {
    const start = Math.max(0, index - radius);
    const end = Math.min(text.length, index + radius);
    return text.substring(start, end);
  }

  private isPotentialPHIContext(context: string): boolean {
    const sensitiveIndicators = [
      'john',
      'jane',
      'smith',
      'doe', // Common names
      'has',
      'diagnosed',
      'suffers',
      'condition',
      'mr.',
      'mrs.',
      'ms.',
      'dr.',
      'age',
      'years old',
      'born',
    ];

    const lowerContext = context.toLowerCase();
    return sensitiveIndicators.some((indicator) =>
      lowerContext.includes(indicator)
    );
  }
}
