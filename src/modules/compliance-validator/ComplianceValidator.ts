import {
  ComplianceRule,
  ComplianceViolation,
  ComplianceCheckResult,
} from '../../models/knowledge/ComplianceRule';
import { ParsedContent } from '../../models/core/ParsedContent';
import { RulesEngine } from './RulesEngine';
import { HIPAAChecker } from './industry-checkers/HIPAAChecker';
import { SOXChecker } from './industry-checkers/SOXChecker';
import { GDPRChecker } from './industry-checkers/GDPRChecker';

export class ComplianceValidator {
  private rulesEngine: RulesEngine;
  private hipaaChecker: HIPAAChecker;
  private soxChecker: SOXChecker;
  private gdprChecker: GDPRChecker;

  constructor(rulesEngine: RulesEngine) {
    this.rulesEngine = rulesEngine;
    this.hipaaChecker = new HIPAAChecker();
    this.soxChecker = new SOXChecker();
    this.gdprChecker = new GDPRChecker();
  }

  async validateCompliance(
    content: ParsedContent,
    domain: 'legal' | 'financial' | 'healthcare' | 'insurance',
    jurisdiction: string = 'US'
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

    // Calculate overall risk and compliance score
    const overallRisk = this.calculateOverallRisk(violations);
    const complianceScore = this.calculateComplianceScore(
      violations,
      applicableRules.length
    );

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

    // Check keyword matches
    for (const keyword of rule.keywords) {
      const matches = this.findKeywordMatches(
        text,
        keyword.toLowerCase()
      );
      for (const match of matches) {
        violations.push({
          ruleId: rule.id,
          rule,
          violationType: 'keyword_match',
          location: match,
          confidence: 85,
          severity: rule.severity,
          description: `Potential compliance violation: Found keyword "${keyword}" which may violate ${rule.regulation}`,
          regulatoryReference: `${rule.regulation} - ${rule.ruleText}`,
          suggestedFix: `Review content for compliance with ${rule.regulation} requirements`,
        });
      }
    }

    // Check pattern matches
    for (const pattern of rule.patterns) {
      const matches = this.findPatternMatches(text, pattern);
      for (const match of matches) {
        violations.push({
          ruleId: rule.id,
          rule,
          violationType: 'pattern_match',
          location: match,
          confidence: 90,
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
}
