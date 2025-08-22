import { ComplianceViolation } from '../../../models/knowledge/ComplianceRule';
import { ParsedContent } from '../../../models/core/ParsedContent';

export class SOXChecker {
  private readonly FINANCIAL_PATTERNS = [
    {
      name: 'Extreme Percentage Change',
      pattern:
        /\b(revenue|profit|earnings|sales)\s+(increased|decreased|grew|fell)\s+by\s+(\d{3,}|[5-9]\d)%/gi,
      severity: 'high' as const,
      description:
        'Extreme financial percentage change that may require additional scrutiny',
    },
    {
      name: 'Absolute Control Statement',
      pattern:
        /\b(no|zero|none)\s+(material\s+)?(weaknesses?|deficiencies|issues|problems)\b/gi,
      severity: 'medium' as const,
      description: 'Absolute statement about internal controls',
    },
    {
      name: 'Unqualified Financial Claims',
      pattern:
        /\b(guaranteed|certain|definitely|absolutely)\s+(profitable|revenue|growth)\b/gi,
      severity: 'high' as const,
      description: 'Unqualified financial projections or guarantees',
    },
  ];

  private readonly SOX_KEYWORDS = [
    { keyword: 'material weakness', severity: 'critical' as const },
    { keyword: 'internal controls', severity: 'high' as const },
    { keyword: 'financial reporting', severity: 'medium' as const },
    { keyword: 'management assessment', severity: 'medium' as const },
    { keyword: 'auditor opinion', severity: 'high' as const },
    { keyword: 'deficiency', severity: 'high' as const },
    { keyword: 'restatement', severity: 'critical' as const },
  ];

  async checkCompliance(
    content: ParsedContent
  ): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];
    const text = content.extractedText;

    // Check for problematic financial patterns
    for (const pattern of this.FINANCIAL_PATTERNS) {
      const matches = Array.from(text.matchAll(pattern.pattern));
      for (const match of matches) {
        if (match.index !== undefined) {
          violations.push({
            ruleId: `sox-pattern-${pattern.name
              .toLowerCase()
              .replace(/\s+/g, '-')}`,
            rule: {
              id: `sox-pattern-${pattern.name
                .toLowerCase()
                .replace(/\s+/g, '-')}`,
              ruleText: `SOX requires accurate and substantiated financial reporting`,
              regulation: 'SOX',
              jurisdiction: 'US',
              domain: 'financial',
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
            confidence: 85,
            severity: pattern.severity,
            description: pattern.description,
            regulatoryReference: 'SOX Section 302 & 404',
            suggestedFix:
              'Provide supporting documentation and qualify financial statements appropriately',
          });
        }
      }
    }

    // Check for SOX-related keywords that may need additional scrutiny
    const lowerText = text.toLowerCase();
    for (const { keyword, severity } of this.SOX_KEYWORDS) {
      const keywordIndex = lowerText.indexOf(keyword);
      if (keywordIndex !== -1) {
        const context = this.extractContext(text, keywordIndex, 100);
        const riskLevel = this.assessKeywordRisk(keyword, context);

        if (riskLevel > 0.6) {
          violations.push({
            ruleId: `sox-keyword-${keyword.replace(/\s+/g, '-')}`,
            rule: {
              id: `sox-keyword-${keyword.replace(/\s+/g, '-')}`,
              ruleText: `SOX requires proper disclosure and assessment of ${keyword}`,
              regulation: 'SOX',
              jurisdiction: 'US',
              domain: 'financial',
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
            confidence: Math.round(riskLevel * 100),
            severity: severity,
            description: `SOX-related term "${keyword}" detected in potentially problematic context`,
            regulatoryReference: 'SOX Section 302 & 404',
            suggestedFix:
              'Ensure proper documentation and management assessment of internal controls',
          });
        }
      }
    }

    // Check for numerical inconsistencies in financial data
    const numericalViolations =
      this.checkNumericalConsistency(content);
    violations.push(...numericalViolations);

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

  private assessKeywordRisk(
    keyword: string,
    context: string
  ): number {
    const lowerContext = context.toLowerCase();

    // Risk indicators
    const highRiskIndicators = [
      'no',
      'none',
      'zero',
      'never',
      'always',
      'guaranteed',
    ];
    const mediumRiskIndicators = [
      'minimal',
      'insignificant',
      'unlikely',
      'certain',
    ];
    const lowRiskIndicators = [
      'potential',
      'possible',
      'may',
      'could',
      'might',
    ];

    let riskScore = 0.3; // Base risk for SOX keywords

    for (const indicator of highRiskIndicators) {
      if (lowerContext.includes(indicator)) {
        riskScore += 0.4;
        break;
      }
    }

    for (const indicator of mediumRiskIndicators) {
      if (lowerContext.includes(indicator)) {
        riskScore += 0.2;
        break;
      }
    }

    for (const indicator of lowRiskIndicators) {
      if (lowerContext.includes(indicator)) {
        riskScore -= 0.1;
        break;
      }
    }

    return Math.min(1.0, Math.max(0.0, riskScore));
  }

  private checkNumericalConsistency(
    content: ParsedContent
  ): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];
    const text = content.extractedText;

    // Look for financial figures that might be inconsistent
    const numberPattern = /\$[\d,]+(?:\.\d{2})?/g;
    const numbers = Array.from(text.matchAll(numberPattern));

    // Simple check for suspiciously round numbers in financial contexts
    for (const match of numbers) {
      if (match.index !== undefined) {
        const numberStr = match[0].replace(/[$,]/g, '');
        const number = parseFloat(numberStr);

        // Flag suspiciously round numbers over $1M
        if (number >= 1000000 && number % 1000000 === 0) {
          const context = this.extractContext(text, match.index, 50);
          if (this.isFinancialContext(context)) {
            violations.push({
              ruleId: 'sox-round-numbers',
              rule: {
                id: 'sox-round-numbers',
                ruleText:
                  'Financial figures should be precise and substantiated',
                regulation: 'SOX',
                jurisdiction: 'US',
                domain: 'financial',
                severity: 'medium',
                examples: [],
                keywords: [],
                patterns: [],
                lastUpdated: new Date(),
                isActive: true,
              },
              violationType: 'pattern_match',
              location: {
                start: match.index,
                end: match.index + match[0].length,
                text: match[0],
              },
              confidence: 70,
              severity: 'medium',
              description:
                'Suspiciously round financial figure detected',
              regulatoryReference: 'SOX Section 302',
              suggestedFix:
                'Verify accuracy of financial figures and provide supporting documentation',
            });
          }
        }
      }
    }

    return violations;
  }

  private isFinancialContext(context: string): boolean {
    const financialTerms = [
      'revenue',
      'profit',
      'loss',
      'earnings',
      'income',
      'assets',
      'liabilities',
      'equity',
      'cash flow',
      'expenses',
      'costs',
      'sales',
      'margin',
    ];

    const lowerContext = context.toLowerCase();
    return financialTerms.some((term) => lowerContext.includes(term));
  }
}
