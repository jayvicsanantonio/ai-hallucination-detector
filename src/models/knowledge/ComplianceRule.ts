export interface ComplianceRule {
  id: string;
  ruleText: string;
  regulation: string;
  jurisdiction: string;
  domain: 'legal' | 'financial' | 'healthcare' | 'insurance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  examples: string[];
  keywords: string[];
  patterns: string[];
  lastUpdated: Date;
  isActive: boolean;
}

export interface ComplianceViolation {
  ruleId: string;
  rule: ComplianceRule;
  violationType: 'keyword_match' | 'pattern_match' | 'semantic_match';
  location: {
    start: number;
    end: number;
    text: string;
  };
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestedFix?: string;
  regulatoryReference: string;
}

export interface ComplianceCheckResult {
  violations: ComplianceViolation[];
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  complianceScore: number; // 0-100, higher is better
  checkedRules: number;
  applicableRules: ComplianceRule[];
}
