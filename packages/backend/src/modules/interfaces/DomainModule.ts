import { ParsedContent } from '@/models/core/ParsedContent';
import { Issue } from '@/models/core/VerificationResult';
import { FeedbackData } from '@/models/audit/FeedbackData';
import { Domain } from '@/models/core/ContentTypes';

export interface DomainModule {
  readonly domain: Domain;
  readonly version: string;

  validateContent(content: ParsedContent): Promise<ValidationResult>;
  updateRules(newRules: DomainRule[]): Promise<void>;
  learnFromFeedback(feedback: FeedbackData): Promise<void>;
  getModuleInfo(): ModuleInfo;
}

export interface ValidationResult {
  moduleId: string;
  issues: Issue[];
  confidence: number; // 0-100
  processingTime: number;
  metadata?: Record<string, any>;
}

export interface DomainRule {
  id: string;
  name: string;
  description: string;
  pattern?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModuleInfo {
  name: string;
  version: string;
  domain: Domain;
  description: string;
  capabilities: string[];
  lastUpdated: Date;
  rulesCount: number;
}

export interface ComplianceResult {
  isCompliant: boolean;
  violations: ComplianceViolation[];
  confidence: number;
  checkedRules: string[];
}

export interface ComplianceViolation {
  ruleId: string;
  ruleName: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location?: {
    start: number;
    end: number;
  };
  suggestion?: string;
}
