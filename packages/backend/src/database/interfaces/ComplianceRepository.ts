import {
  ComplianceRule,
  ComplianceViolation,
} from '../../models/knowledge/ComplianceRule';

export interface ComplianceRepository {
  // Rule management
  createRule(
    rule: Omit<ComplianceRule, 'id'>
  ): Promise<ComplianceRule>;
  updateRule(
    id: string,
    updates: Partial<ComplianceRule>
  ): Promise<ComplianceRule>;
  deleteRule(id: string): Promise<void>;
  getRuleById(id: string): Promise<ComplianceRule | null>;
  getRulesByDomain(
    domain: string,
    jurisdiction?: string
  ): Promise<ComplianceRule[]>;
  getAllRules(): Promise<ComplianceRule[]>;

  // Violation tracking
  recordViolation(
    violation: Omit<ComplianceViolation, 'id'>
  ): Promise<void>;
  getViolationsBySession(
    sessionId: string
  ): Promise<ComplianceViolation[]>;
  getViolationsByRule(ruleId: string): Promise<ComplianceViolation[]>;

  // Analytics and reporting
  getViolationStats(
    domain?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    totalViolations: number;
    violationsBySeverity: Record<string, number>;
    violationsByRule: Record<string, number>;
    trendsOverTime: Array<{ date: Date; count: number }>;
  }>;
}
