"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseRulesEngine = void 0;
/**
 * Database-backed rules engine that extends the in-memory RulesEngine
 * with persistent storage and advanced rule management capabilities
 */
class DatabaseRulesEngine {
    constructor(repository) {
        this.repository = repository;
    }
    async getApplicableRules(domain, jurisdiction = 'US') {
        const rules = await this.repository.getRulesByDomain(domain, jurisdiction);
        return rules.filter((rule) => rule.isActive);
    }
    async addRule(rule) {
        return await this.repository.createRule(rule);
    }
    async updateRule(ruleId, updates) {
        return await this.repository.updateRule(ruleId, updates);
    }
    async deactivateRule(ruleId) {
        await this.repository.updateRule(ruleId, { isActive: false });
    }
    async deleteRule(ruleId) {
        await this.repository.deleteRule(ruleId);
    }
    async getRuleById(ruleId) {
        return await this.repository.getRuleById(ruleId);
    }
    async getAllRules() {
        return await this.repository.getAllRules();
    }
    /**
     * Bulk import rules from a configuration file or external source
     */
    async importRules(rules) {
        const importedRules = [];
        for (const rule of rules) {
            try {
                const imported = await this.addRule(rule);
                importedRules.push(imported);
            }
            catch (error) {
                console.error(`Failed to import rule: ${rule.ruleText}`, error);
            }
        }
        return importedRules;
    }
    /**
     * Validate rule configuration before adding/updating
     */
    validateRule(rule) {
        const errors = [];
        if (!rule.ruleText || rule.ruleText.trim().length === 0) {
            errors.push('Rule text is required');
        }
        if (!rule.regulation || rule.regulation.trim().length === 0) {
            errors.push('Regulation is required');
        }
        if (!rule.domain ||
            !['legal', 'financial', 'healthcare', 'insurance'].includes(rule.domain)) {
            errors.push('Valid domain is required (legal, financial, healthcare, insurance)');
        }
        if (!rule.severity ||
            !['low', 'medium', 'high', 'critical'].includes(rule.severity)) {
            errors.push('Valid severity is required (low, medium, high, critical)');
        }
        if (!rule.jurisdiction || rule.jurisdiction.trim().length === 0) {
            errors.push('Jurisdiction is required');
        }
        // Validate regex patterns
        if (rule.patterns) {
            for (const pattern of rule.patterns) {
                try {
                    new RegExp(pattern);
                }
                catch (error) {
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
    async getOutdatedRules(maxAge = 365) {
        const allRules = await this.getAllRules();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - maxAge);
        return allRules.filter((rule) => rule.lastUpdated < cutoffDate);
    }
    /**
     * Clone a rule for modification (useful for creating variations)
     */
    async cloneRule(ruleId, modifications) {
        const originalRule = await this.getRuleById(ruleId);
        if (!originalRule) {
            throw new Error(`Rule with ID ${ruleId} not found`);
        }
        const clonedRule = {
            ...originalRule,
            ...modifications,
            lastUpdated: new Date(),
        };
        // Remove the ID to create a new rule
        delete clonedRule.id;
        return await this.addRule(clonedRule);
    }
}
exports.DatabaseRulesEngine = DatabaseRulesEngine;
//# sourceMappingURL=DatabaseRulesEngine.js.map