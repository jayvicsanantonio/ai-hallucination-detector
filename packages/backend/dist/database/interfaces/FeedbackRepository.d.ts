import { FeedbackData } from '../../models/audit/FeedbackData';
import { Domain } from '../../models/core/ContentTypes';
export interface FeedbackRepository {
    /**
     * Create new feedback entry
     */
    create(feedbackData: FeedbackData): Promise<FeedbackData & {
        id: string;
    }>;
    /**
     * Find feedback by verification ID
     */
    findByVerificationId(verificationId: string): Promise<FeedbackData[]>;
    /**
     * Get verification result for feedback processing
     */
    getVerificationResult(verificationId: string): Promise<any>;
    /**
     * Update accuracy metrics
     */
    updateAccuracyMetrics(verificationId: string, accuracyImpact: number): Promise<void>;
    /**
     * Get common issues for a verification
     */
    getCommonIssues(verificationId: string): Promise<Array<{
        issueType: string;
        count: number;
        accuracy: number;
    }>>;
    /**
     * Get feedback for pattern analysis
     */
    getFeedbackForAnalysis(options: {
        domain?: Domain;
        timeframe: string;
        userId?: string;
    }): Promise<FeedbackData[]>;
    /**
     * Get recent feedback for temporal analysis
     */
    getRecentFeedback(verificationId: string, timeframe: string): Promise<FeedbackData[]>;
    /**
     * Get feedback statistics
     */
    getFeedbackStats(options: {
        domain?: Domain;
        timeframe?: string;
        userId?: string;
    }): Promise<{
        totalFeedback: number;
        accuracyTrend: number[];
        commonPatterns: string[];
    }>;
    /**
     * Find feedback by domain for training purposes
     */
    findByDomain(domain: Domain): Promise<FeedbackData[]>;
}
export declare class FeedbackRepository implements FeedbackRepository {
    private feedbackStore;
    private verificationResults;
}
//# sourceMappingURL=FeedbackRepository.d.ts.map