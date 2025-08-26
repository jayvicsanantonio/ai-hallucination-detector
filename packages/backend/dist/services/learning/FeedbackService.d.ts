import { FeedbackData } from '../../models/audit/FeedbackData';
import { FeedbackRepository } from '../../database/interfaces/FeedbackRepository';
import { KnowledgeBaseUpdater } from './KnowledgeBaseUpdater';
import { PatternAnalyzer } from './PatternAnalyzer';
import { Domain } from '../../models/core/ContentTypes';
export interface FeedbackStats {
    totalFeedback: number;
    correctCount: number;
    incorrectCount: number;
    partialCount: number;
    averageConfidence: number;
    commonIssues: Array<{
        issueType: string;
        count: number;
        accuracy: number;
    }>;
}
export interface FeedbackPatterns {
    domain: Domain;
    timeframe: string;
    trends: Array<{
        period: string;
        accuracy: number;
        volume: number;
    }>;
    commonCorrections: Array<{
        originalText: string;
        correctedText: string;
        frequency: number;
    }>;
    improvementAreas: string[];
}
export interface ProcessedFeedback {
    id: string;
    processed: boolean;
    knowledgeBaseUpdated: boolean;
    patternsIdentified: string[];
}
export declare class FeedbackService {
    private feedbackRepository;
    private knowledgeBaseUpdater;
    private patternAnalyzer;
    private logger;
    constructor(feedbackRepository?: FeedbackRepository, knowledgeBaseUpdater?: KnowledgeBaseUpdater, patternAnalyzer?: PatternAnalyzer);
    /**
     * Process user feedback and update knowledge base
     */
    processFeedback(feedbackData: FeedbackData): Promise<ProcessedFeedback>;
    /**
     * Get feedback statistics for a verification session
     */
    getFeedbackStats(verificationId: string): Promise<FeedbackStats>;
    /**
     * Analyze feedback patterns for insights
     */
    analyzeFeedbackPatterns(options: {
        domain?: string;
        timeframe?: string;
        userId?: string;
    }): Promise<FeedbackPatterns>;
    /**
     * Update accuracy metrics based on feedback
     */
    private updateAccuracyMetrics;
    /**
     * Calculate average confidence from feedback
     */
    private calculateAverageConfidence;
    /**
     * Get common issues from feedback
     */
    private getCommonIssues;
    /**
     * Get feedback data by domain for training purposes
     */
    getFeedbackByDomain(domain: Domain): Promise<FeedbackData[]>;
    /**
     * Calculate accuracy impact of feedback
     */
    private calculateAccuracyImpact;
}
//# sourceMappingURL=FeedbackService.d.ts.map