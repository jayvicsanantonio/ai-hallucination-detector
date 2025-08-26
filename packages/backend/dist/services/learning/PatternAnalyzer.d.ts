import { FeedbackData } from '../../models/audit/FeedbackData';
import { FeedbackPatterns } from './FeedbackService';
import { FeedbackRepository } from '../../database/interfaces/FeedbackRepository';
export interface PatternInsight {
    pattern: string;
    frequency: number;
    accuracy: number;
    recommendation: string;
}
export interface TrendAnalysis {
    period: string;
    accuracy: number;
    volume: number;
    improvement: number;
}
export declare class PatternAnalyzer {
    private feedbackRepository;
    private logger;
    constructor(feedbackRepository?: FeedbackRepository);
    /**
     * Analyze new feedback for patterns
     */
    analyzeNewFeedback(feedbackData: FeedbackData): Promise<string[]>;
    /**
     * Analyze feedback patterns for insights
     */
    analyzeFeedbackPatterns(options: {
        domain?: string;
        timeframe?: string;
        userId?: string;
    }): Promise<FeedbackPatterns>;
    /**
     * Extract patterns from correction text
     */
    private extractCorrectionPatterns;
    /**
     * Extract patterns from expert notes
     */
    private extractExpertNotePatterns;
    /**
     * Analyze temporal patterns in feedback
     */
    private analyzeTemporalPatterns;
    /**
     * Analyze trends in feedback data
     */
    private analyzeTrends;
    /**
     * Find common corrections in feedback
     */
    private findCommonCorrections;
    /**
     * Identify areas for improvement
     */
    private identifyImprovementAreas;
    /**
     * Calculate accuracy from feedback data
     */
    private calculateAccuracy;
    /**
     * Group feedback by time period
     */
    private groupByTimePeriod;
    /**
     * Get period key for grouping
     */
    private getPeriodKey;
    /**
     * Get previous period key
     */
    private getPreviousPeriod;
}
//# sourceMappingURL=PatternAnalyzer.d.ts.map