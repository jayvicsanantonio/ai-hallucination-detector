import { RiskLevel, IssueType, IssueSeverity } from './ContentTypes';
import { TextLocation } from './TextLocation';
export interface VerificationResult {
    verificationId: string;
    overallConfidence: number;
    riskLevel: RiskLevel;
    issues: Issue[];
    auditTrail: AuditEntry[];
    processingTime: number;
    recommendations: string[];
    timestamp: Date;
}
export interface Issue {
    id: string;
    type: IssueType;
    severity: IssueSeverity;
    location: TextLocation;
    description: string;
    evidence: string[];
    suggestedFix?: string;
    confidence: number;
    moduleSource: string;
}
export interface AuditEntry {
    id: string;
    sessionId: string;
    timestamp: Date;
    action: string;
    component: string;
    details: Record<string, any>;
    userId?: string;
}
//# sourceMappingURL=VerificationResult.d.ts.map