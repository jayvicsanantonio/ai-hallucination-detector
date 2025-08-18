import { ParsedContent } from '@/models/core/ParsedContent';
import { VerificationResult } from '@/models/core/VerificationResult';
import { Domain, UrgencyLevel } from '@/models/core/ContentTypes';
import { ContentMetadata } from '@/models/core/ParsedContent';
export interface VerificationEngine {
    verifyContent(request: VerificationRequest): Promise<VerificationResult>;
    getVerificationStatus(verificationId: string): Promise<VerificationStatus>;
    cancelVerification(verificationId: string): Promise<boolean>;
}
export interface VerificationRequest {
    content: ParsedContent;
    domain: Domain;
    urgency: UrgencyLevel;
    metadata: ContentMetadata;
    userId?: string;
    organizationId?: string;
    options?: VerificationOptions;
}
export interface VerificationOptions {
    skipFactChecking?: boolean;
    skipLogicAnalysis?: boolean;
    skipComplianceCheck?: boolean;
    customRules?: string[];
    confidenceThreshold?: number;
    maxProcessingTime?: number;
}
export interface VerificationStatus {
    verificationId: string;
    status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
    progress: number;
    estimatedTimeRemaining?: number;
    currentStep?: string;
    error?: string;
}
//# sourceMappingURL=VerificationEngine.d.ts.map