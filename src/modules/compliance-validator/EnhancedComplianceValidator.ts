import {
  ComplianceRule,
  ComplianceViolation,
  ComplianceCheckResult,
} from '../../models/knowledge/ComplianceRule';
import { ParsedContent } from '../../models/core/ParsedContent';
import { DatabaseRulesEngine } from './DatabaseRulesEngine';
import { HIPAAChecker } from './industry-checkers/HIPAAChecker';
import { SOXChecker } from './industry-checkers/SOXChecker';
import { GDPRChecker } from './industry-checkers/GDPRChecker';
import { ComplianceRepository } from '../../database/interfaces/ComplianceRepository';

/**
 * Enhanced compliance validator with database persistence,
 * advanced rule matching, and comprehensive violation tracking
 */
export class EnhancedComplianceValidator {
  private rulesEngine: DatabaseRulesEngine;
  private hipaaChecker: HIPAAChecker;
  private soxChecker: SOXChecker;
  private gdprChecker: GDPRChecker;

  constructor(
    private repository: ComplianceRepository,
    rulesEngine?: DatabaseRulesEngine
  ) {
    this.rulesEngine =
      rulesEngine || new DatabaseRulesEngine(repository);
    this.hipaaChecker = new HIPAAChecker();
    this.soxChecker = new SOXChecker();
    this.gdprChecker = new GDPRChecker();
  }

  async validateCompliance(
    content: ParsedContent,
    domain: 'legal' | 'financial' | 'healthcare' | 'insurance',
    jurisdiction: string = 'US',
    sessionId?: string
  ): Promise<ComplianceCheckResult> {
    // Get applicable rules for the domain and jurisdiction
    const applicableRules = await this.rulesEngine.getApplicableRules(
      domain,
      jurisdiction
    );

    const violations: ComplianceViolation[] = [];

    // Run general rule-based compliance checks
    const generalViolations = await this.checkGeneralCompliance(
      content,
      applicableRules
    );
    violations.push(...generalViolations);

    // Run industry-specific compliance checks
    const industryViolations =
      await this.checkIndustrySpecificCompliance(content, domain);
    violations.push(...industryViolations);

    // Run semantic analysis for context-aware violations
    const semanticViolations = await this.checkSemanticCompliance(
      content,
      applicableRules,
      domain
    );
    violations.push(...semanticViolations);

    // Calculate overall risk and compliance score
    const overallRisk = this.calculateOverallRisk(violations);
    const complianceScore = this.calculateComplianceScore(
      violations,
      applicableRules.length
    );

    // Record violations for audit trail if session ID provided
    if (sessionId) {
      await this.recordViolations(violations, sessionId);
    }

    return {
      violations,
      overallRisk,
      complianceScore,
      checkedRules: applicableRules.length,
      applicableRules,
    };
  }

  private async checkGeneralCompliance(
    content: ParsedContent,
    rules: ComplianceRule[]
  ): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];

    for (const rule of rules) {
      const ruleViolations = await this.checkRuleViolations(
        content,
        rule
      );
      violations.push(...ruleViolations);
    }

    return violations;
  }

  private async checkRuleViolations(
    content: ParsedContent,
    rule: ComplianceRule
  ): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];
    const text = content.extractedText.toLowerCase();

    // Enhanced keyword matching with context analysis
    for (const keyword of rule.keywords) {
      const matches = this.findKeywordMatches(
        text,
        keyword.toLowerCase()
      );
      for (const match of matches) {
        const context = this.extractContext(
          content.extractedText,
          match.start,
          100
        );
        const contextualRisk = this.assessContextualRisk(
          keyword,
          context,
          rule.domain
        );

        if (contextualRisk > 0.6) {
          violations.push({
            ruleId: rule.id,
            rule,
            violationType: 'keyword_match',
            location: match,
            confidence: Math.round(contextualRisk * 100),
            severity: rule.severity,
            description: `Potential compliance violation: Found keyword "${keyword}" in high-risk context for ${rule.regulation}`,
            regulatoryReference: `${rule.regulation} - ${rule.ruleText}`,
            suggestedFix: `Review content for compliance with ${rule.regulation} requirements`,
          });
        }
      }
    }

    // Enhanced pattern matching with confidence scoring
    for (const pattern of rule.patterns) {
      const matches = this.findPatternMatches(text, pattern);
      for (const match of matches) {
        const confidence = this.calculatePatternConfidence(
          pattern,
          match.text,
          rule
        );

        violations.push({
          ruleId: rule.id,
          rule,
          violationType: 'pattern_match',
          location: match,
          confidence,
          severity: rule.severity,
          description: `Pattern match violation: Content matches restricted pattern for ${rule.regulation}`,
          regulatoryReference: `${rule.regulation} - ${rule.ruleText}`,
          suggestedFix: `Modify content to comply with ${rule.regulation} pattern restrictions`,
        });
      }
    }

    return violations;
  }

  private async checkIndustrySpecificCompliance(
    content: ParsedContent,
    domain: string
  ): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];

    switch (domain) {
      case 'healthcare':
        const hipaaViolations =
          await this.hipaaChecker.checkCompliance(content);
        violations.push(...hipaaViolations);
        break;
      case 'financial':
        const soxViolations = await this.soxChecker.checkCompliance(
          content
        );
        violations.push(...soxViolations);
        break;
      case 'legal':
        const gdprViolations = await this.gdprChecker.checkCompliance(
          content
        );
        violations.push(...gdprViolations);
        break;
      case 'insurance':
        // Insurance-specific checks would go here
        break;
    }

    return violations;
  }

  private async checkSemanticCompliance(
    content: ParsedContent,
    rules: ComplianceRule[],
    domain: string
  ): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];

    // Check for missing required disclosures
    const missingDisclosures = this.checkRequiredDisclosures(
      content,
      domain
    );
    violations.push(...missingDisclosures);

    // Check for contradictory statements
    const contradictions = this.checkContradictoryStatements(
      content,
      rules
    );
    violations.push(...contradictions);

    return violations;
  }

  private checkRequiredDisclosures(
    content: ParsedContent,
    domain: string
  ): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];
    const text = content.extractedText.toLowerCase();

    const requiredDisclosures: Record<string, string[]> = {
      financial: [
        'risk disclosure',
        'investment risk',
        'past performance',
      ],
      healthcare: ['privacy notice', 'patient rights', 'hipaa'],
      legal: ['data protection', 'privacy policy', 'consent'],
      insurance: [
        'policy terms',
        'coverage limitations',
        'exclusions',
      ],
    };

    const disclosures = requiredDisclosures[domain] || [];

    for (const disclosure of disclosures) {
      if (!text.includes(disclosure)) {
        violations.push({
          ruleId: `missing-disclosure-${domain}`,
          rule: {
            id: `missing-disclosure-${domain}`,
            ruleText: `Required disclosure missing for ${domain} domain`,
            regulation: `${domain.toUpperCase()} Regulations`,
            jurisdiction: 'US',
            domain: domain as any,
            severity: 'medium',
            examples: [],
            keywords: [disclosure],
            patterns: [],
            lastUpdated: new Date(),
            isActive: true,
          },
          violationType: 'semantic_match',
          location: {
            start: 0,
            end: 50,
            text: content.extractedText.substring(0, 50) + '...',
          },
          confidence: 85,
          severity: 'medium',
          description: `Missing required disclosure: "${disclosure}"`,
          regulatoryReference: `${domain.toUpperCase()} disclosure requirements`,
          suggestedFix: `Add required ${disclosure} disclosure to the document`,
        });
      }
    }

    return violations;
  }

  private checkContradictoryStatements(
    content: ParsedContent,
    rules: ComplianceRule[]
  ): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];
    const text = content.extractedText.toLowerCase();

    // Simple contradiction detection patterns
    const contradictionPatterns = [
      {
        positive: 'guaranteed',
        negative: 'may lose',
        severity: 'critical' as const,
      },
      {
        positive: 'risk-free',
        negative: 'risk',
        severity: 'high' as const,
      },
      {
        positive: 'always profitable',
        negative: 'may lose',
        severity: 'critical' as const,
      },
    ];

    for (const pattern of contradictionPatterns) {
      if (
        text.includes(pattern.positive) &&
        text.includes(pattern.negative)
      ) {
        violations.push({
          ruleId: 'contradiction-detected',
          rule: {
            id: 'contradiction-detected',
            ruleText:
              'Content must not contain contradictory statements',
            regulation: 'General Compliance',
            jurisdiction: 'US',
            domain: 'legal',
            severity: pattern.severity,
            examples: [],
            keywords: [pattern.positive, pattern.negative],
            patterns: [],
            lastUpdated: new Date(),
            isActive: true,
          },
          violationType: 'semantic_match',
          location: {
            start: text.indexOf(pattern.positive),
            end:
              text.indexOf(pattern.positive) +
              pattern.positive.length,
            text: pattern.positive,
          },
          confidence: 90,
          severity: pattern.severity,
          description: `Contradictory statements detected: "${pattern.positive}" and "${pattern.negative}"`,
          regulatoryReference:
            'Truth in advertising and disclosure requirements',
          suggestedFix:
            'Remove contradictory statements and ensure consistent messaging',
        });
      }
    }

    return violations;
  }

  private findKeywordMatches(
    text: string,
    keyword: string
  ): Array<{ start: number; end: number; text: string }> {
    const matches: Array<{
      start: number;
      end: number;
      text: string;
    }> = [];
    let index = 0;

    while ((index = text.indexOf(keyword, index)) !== -1) {
      matches.push({
        start: index,
        end: index + keyword.length,
        text: text.substring(index, index + keyword.length),
      });
      index += keyword.length;
    }

    return matches;
  }

  private findPatternMatches(
    text: string,
    pattern: string
  ): Array<{ start: number; end: number; text: string }> {
    const matches: Array<{
      start: number;
      end: number;
      text: string;
    }> = [];

    try {
      const regex = new RegExp(pattern, 'gi');
      let match;

      while ((match = regex.exec(text)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
        });
      }
    } catch (error) {
      console.warn(`Invalid regex pattern: ${pattern}`, error);
    }

    return matches;
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

  private assessContextualRisk(
    keyword: string,
    context: string,
    domain: string
  ): number {
    const lowerContext = context.toLowerCase();
    let riskScore = 0.3; // Base risk

    // Domain-specific risk indicators
    const riskIndicators: Record<string, string[]> = {
      healthcare: [
        'patient',
        'diagnosis',
        'treatment',
        'medical',
        'health',
      ],
      financial: [
        'investment',
        'profit',
        'loss',
        'money',
        'financial',
      ],
      legal: [
        'contract',
        'agreement',
        'legal',
        'liability',
        'rights',
      ],
      insurance: [
        'claim',
        'coverage',
        'policy',
        'premium',
        'benefit',
      ],
    };

    // Low-risk contexts that should reduce the score
    const lowRiskContexts = [
      'system',
      'portal',
      'software',
      'application',
      'update',
      'interface',
      'user experience',
      'technology',
      'platform',
      'service',
    ];

    // Check for low-risk context first
    for (const lowRiskTerm of lowRiskContexts) {
      if (lowerContext.includes(lowRiskTerm)) {
        riskScore -= 0.2;
      }
    }

    const indicators = riskIndicators[domain] || [];
    for (const indicator of indicators) {
      if (lowerContext.includes(indicator)) {
        riskScore += 0.2;
      }
    }

    // General high-risk indicators
    const highRiskTerms = [
      'personal',
      'confidential',
      'private',
      'sensitive',
    ];
    for (const term of highRiskTerms) {
      if (lowerContext.includes(term)) {
        riskScore += 0.3;
      }
    }

    return Math.min(1.0, Math.max(0.0, riskScore));
  }

  private calculatePatternConfidence(
    pattern: string,
    matchText: string,
    rule: ComplianceRule
  ): number {
    let confidence = 85; // Base confidence

    // Increase confidence for exact matches
    if (matchText.length === pattern.length) {
      confidence += 10;
    }

    // Adjust based on rule severity
    switch (rule.severity) {
      case 'critical':
        confidence += 5;
        break;
      case 'high':
        confidence += 3;
        break;
      case 'medium':
        confidence += 1;
        break;
    }

    return Math.min(100, confidence);
  }

  private calculateOverallRisk(
    violations: ComplianceViolation[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (violations.length === 0) return 'low';

    const criticalCount = violations.filter(
      (v) => v.severity === 'critical'
    ).length;
    const highCount = violations.filter(
      (v) => v.severity === 'high'
    ).length;
    const mediumCount = violations.filter(
      (v) => v.severity === 'medium'
    ).length;

    if (criticalCount > 0) return 'critical';
    if (highCount > 2) return 'critical';
    if (highCount > 0 || mediumCount > 5) return 'high';
    if (mediumCount > 0) return 'medium';

    return 'low';
  }

  private calculateComplianceScore(
    violations: ComplianceViolation[],
    totalRules: number
  ): number {
    if (totalRules === 0) return 100;

    let penaltyPoints = 0;

    for (const violation of violations) {
      switch (violation.severity) {
        case 'critical':
          penaltyPoints += 25;
          break;
        case 'high':
          penaltyPoints += 15;
          break;
        case 'medium':
          penaltyPoints += 8;
          break;
        case 'low':
          penaltyPoints += 3;
          break;
      }
    }

    const score = Math.max(0, 100 - penaltyPoints);
    return Math.round(score);
  }

  private async recordViolations(
    violations: ComplianceViolation[],
    sessionId: string
  ): Promise<void> {
    for (const violation of violations) {
      try {
        await this.repository.recordViolation({
          ...violation,
          verification_session_id: sessionId,
        } as unknown);
      } catch (error) {
        console.error('Failed to record violation:', error);
      }
    }
  }

  // Public methods for rule management
  async addRule(
    rule: Omit<ComplianceRule, 'id'>
  ): Promise<ComplianceRule> {
    const validation = this.rulesEngine.validateRule(rule);
    if (!validation.isValid) {
      throw new Error(
        `Invalid rule: ${validation.errors.join(', ')}`
      );
    }
    return await this.rulesEngine.addRule(rule);
  }

  async updateRule(
    ruleId: string,
    updates: Partial<ComplianceRule>
  ): Promise<ComplianceRule> {
    // Only validate fields that are being updated, not all required fields
    if (Object.keys(updates).length > 0) {
      // Get existing rule to merge with updates for validation
      const existingRule = await this.rulesEngine.getRuleById(ruleId);
      if (!existingRule) {
        throw new Error(`Rule with ID ${ruleId} not found`);
      }

      const mergedRule = { ...existingRule, ...updates };
      const validation = this.rulesEngine.validateRule(mergedRule);
      if (!validation.isValid) {
        throw new Error(
          `Invalid rule updates: ${validation.errors.join(', ')}`
        );
      }
    }
    return await this.rulesEngine.updateRule(ruleId, updates);
  }

  async getViolationStats(
    domain?: string,
    timeRange?: { start: Date; end: Date }
  ) {
    return await this.repository.getViolationStats(domain, timeRange);
  }
}
