import { ComplianceRule } from '../../models/knowledge/ComplianceRule';
import { ComplianceRepository } from '../../database/interfaces/ComplianceRepository';

/**
 * Database-backed rules engine that extends the in-memory RulesEngine
 * with persistent storage and advanced rule management capabilities
 */
export class DatabaseRulesEngine {
  constructor(private repository: ComplianceRepository) {}

  async getApplicableRules(
    domain: 'legal' | 'financial' | 'healthcare' | 'insurance',
    jurisdiction: string = 'US'
  ): Promise<ComplianceRule[]> {
    const rules = await this.repository.getRulesByDomain(
      domain,
      jurisdiction
    );
    return rules.filter((rule) => rule.isActive);
  }

  async addRule(
    rule: Omit<ComplianceRule, 'id'>
  ): Promise<ComplianceRule> {
    return await this.repository.createRule(rule);
  }

  async updateRule(
    ruleId: string,
    updates: Partial<ComplianceRule>
  ): Promise<ComplianceRule> {
    return await this.repository.updateRule(ruleId, updates);
  }

  async deactivateRule(ruleId: string): Promise<void> {
    await this.repository.updateRule(ruleId, { isActive: false });
  }

  async deleteRule(ruleId: string): Promise<void> {
    await this.repository.deleteRule(ruleId);
  }

  async getRuleById(ruleId: string): Promise<ComplianceRule | null> {
    return await this.repository.getRuleById(ruleId);
  }

  async getAllRules(): Promise<ComplianceRule[]> {
    return await this.repository.getAllRules();
  }

  /**
   * Bulk import rules from a configuration file or external source
   */
  async importRules(
    rules: Omit<ComplianceRule, 'id'>[]
  ): Promise<ComplianceRule[]> {
    const importedRules: ComplianceRule[] = [];

    for (const rule of rules) {
      try {
        const imported = await this.addRule(rule);
        importedRules.push(imported);
      } catch (error) {
        console.error(
          `Failed to import rule: ${rule.ruleText}`,
          error
        );
      }
    }

    return importedRules;
  }

  /**
   * Validate rule configuration before adding/updating
   */
  validateRule(rule: Partial<ComplianceRule>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!rule.ruleText || rule.ruleText.trim().length === 0) {
      errors.push('Rule text is required');
    }

    if (!rule.regulation || rule.regulation.trim().length === 0) {
      errors.push('Regulation is required');
    }

    if (
      !rule.domain ||
      !['legal', 'financial', 'healthcare', 'insurance'].includes(
        rule.domain
      )
    ) {
      errors.push(
        'Valid domain is required (legal, financial, healthcare, insurance)'
      );
    }

    if (
      !rule.severity ||
      !['low', 'medium', 'high', 'critical'].includes(rule.severity)
    ) {
      errors.push(
        'Valid severity is required (low, medium, high, critical)'
      );
    }

    if (!rule.jurisdiction || rule.jurisdiction.trim().length === 0) {
      errors.push('Jurisdiction is required');
    }

    // Validate regex patterns
    if (rule.patterns) {
      for (const pattern of rule.patterns) {
        try {
          new RegExp(pattern);
        } catch (error) {
          errors.push(`Invalid regex pattern: ${pattern}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get rules that need updates based on regulation changes
   */
  async getOutdatedRules(
    maxAge: number = 365
  ): Promise<ComplianceRule[]> {
    const allRules = await this.getAllRules();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAge);

    return allRules.filter((rule) => rule.lastUpdated < cutoffDate);
  }

  /**
   * Clone a rule for modification (useful for creating variations)
   */
  async cloneRule(
    ruleId: string,
    modifications: Partial<ComplianceRule>
  ): Promise<ComplianceRule> {
    const originalRule = await this.getRuleById(ruleId);
    if (!originalRule) {
      throw new Error(`Rule with ID ${ruleId} not found`);
    }

    const clonedRule: Omit<ComplianceRule, 'id'> = {
      ...originalRule,
      ...modifications,
      lastUpdated: new Date(),
    };

    // Remove the ID to create a new rule
    delete (clonedRule as any).id;

    return await this.addRule(clonedRule);
  }
}
