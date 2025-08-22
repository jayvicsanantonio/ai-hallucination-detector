import { FeedbackData } from '../../models/audit/FeedbackData';
import { FeedbackPatterns } from './FeedbackService';
import { FeedbackRepository } from '../../database/interfaces/FeedbackRepository';
import { Logger } from '../../utils/Logger';
import { Domain } from '../../models/core/ContentTypes';

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

export class PatternAnalyzer {
  private feedbackRepository: FeedbackRepository;
  private logger: Logger;

  constructor(feedbackRepository?: FeedbackRepository) {
    this.feedbackRepository =
      feedbackRepository || new FeedbackRepository();
    this.logger = new Logger('PatternAnalyzer');
  }

  /**
   * Analyze new feedback for patterns
   */
  async analyzeNewFeedback(
    feedbackData: FeedbackData
  ): Promise<string[]> {
    try {
      const patterns: string[] = [];

      // Analyze correction patterns
      if (feedbackData.corrections) {
        patterns.push(
          ...this.extractCorrectionPatterns(feedbackData.corrections)
        );
      }

      // Analyze expert notes patterns
      if (feedbackData.expertNotes) {
        patterns.push(
          ...this.extractExpertNotePatterns(feedbackData.expertNotes)
        );
      }

      // Analyze temporal patterns
      patterns.push(
        ...(await this.analyzeTemporalPatterns(feedbackData))
      );

      this.logger.info('Patterns identified in feedback', {
        verificationId: feedbackData.verificationId,
        patternsCount: patterns.length,
      });

      return patterns;
    } catch (error) {
      this.logger.error('Error analyzing new feedback', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Analyze feedback patterns for insights
   */
  async analyzeFeedbackPatterns(options: {
    domain?: string;
    timeframe?: string;
    userId?: string;
  }): Promise<FeedbackPatterns> {
    try {
      const { domain, timeframe = '30d', userId } = options;

      // Get feedback data for analysis
      const feedbackData =
        await this.feedbackRepository.getFeedbackForAnalysis({
          domain: domain as Domain,
          timeframe,
          userId,
        });

      // Analyze trends
      const trends = await this.analyzeTrends(
        feedbackData,
        timeframe
      );

      // Find common corrections
      const commonCorrections =
        this.findCommonCorrections(feedbackData);

      // Identify improvement areas
      const improvementAreas =
        this.identifyImprovementAreas(feedbackData);

      return {
        domain: domain as Domain,
        timeframe,
        trends,
        commonCorrections,
        improvementAreas,
      };
    } catch (error) {
      this.logger.error('Error analyzing feedback patterns', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Extract patterns from correction text
   */
  private extractCorrectionPatterns(corrections: string): string[] {
    const patterns: string[] = [];

    // Common correction patterns
    const correctionPatterns = [
      /\b(\d+\.?\d*)\s*%/g, // Percentage corrections
      /\$[\d,]+\.?\d*/g, // Currency corrections
      /\b\d{4}-\d{2}-\d{2}\b/g, // Date corrections
      /\b[A-Z]{2,}\b/g, // Acronym corrections
      /\b\w+\s+Act\b/gi, // Legal act corrections
      /\bSection\s+\d+/gi, // Legal section corrections
    ];

    correctionPatterns.forEach((pattern) => {
      const matches = corrections.match(pattern);
      if (matches) {
        patterns.push(`correction_pattern_${pattern.source}`);
      }
    });

    // Semantic patterns
    if (corrections.toLowerCase().includes('not')) {
      patterns.push('negation_correction');
    }

    if (corrections.toLowerCase().includes('should be')) {
      patterns.push('replacement_correction');
    }

    if (corrections.toLowerCase().includes('missing')) {
      patterns.push('addition_correction');
    }

    return patterns;
  }

  /**
   * Extract patterns from expert notes
   */
  private extractExpertNotePatterns(expertNotes: string): string[] {
    const patterns: string[] = [];

    // Expert note patterns
    if (expertNotes.toLowerCase().includes('context')) {
      patterns.push('context_dependent');
    }

    if (expertNotes.toLowerCase().includes('jurisdiction')) {
      patterns.push('jurisdiction_specific');
    }

    if (expertNotes.toLowerCase().includes('outdated')) {
      patterns.push('temporal_accuracy');
    }

    if (expertNotes.toLowerCase().includes('interpretation')) {
      patterns.push('interpretation_issue');
    }

    return patterns;
  }

  /**
   * Analyze temporal patterns in feedback
   */
  private async analyzeTemporalPatterns(
    feedbackData: FeedbackData
  ): Promise<string[]> {
    const patterns: string[] = [];

    try {
      // Get recent feedback for the same verification type
      const recentFeedback =
        await this.feedbackRepository.getRecentFeedback(
          feedbackData.verificationId,
          '7d'
        );

      // Check for recurring issues
      const feedbackTypes = recentFeedback.map((f) => f.userFeedback);
      const incorrectCount = feedbackTypes.filter(
        (t) => t === 'incorrect'
      ).length;

      if (incorrectCount > recentFeedback.length * 0.5) {
        patterns.push('recurring_accuracy_issue');
      }

      // Check for improvement trends
      const chronologicalFeedback = recentFeedback.sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      );

      if (chronologicalFeedback.length >= 3) {
        const recentAccuracy = this.calculateAccuracy(
          chronologicalFeedback.slice(-3)
        );
        const olderAccuracy = this.calculateAccuracy(
          chronologicalFeedback.slice(0, 3)
        );

        if (recentAccuracy > olderAccuracy + 0.1) {
          patterns.push('improving_accuracy');
        } else if (recentAccuracy < olderAccuracy - 0.1) {
          patterns.push('declining_accuracy');
        }
      }
    } catch (error) {
      this.logger.error('Error analyzing temporal patterns', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return patterns;
  }

  /**
   * Analyze trends in feedback data
   */
  private async analyzeTrends(
    feedbackData: FeedbackData[],
    timeframe: string
  ): Promise<TrendAnalysis[]> {
    const trends: TrendAnalysis[] = [];

    try {
      // Group feedback by time periods
      const periods = this.groupByTimePeriod(feedbackData, timeframe);

      for (const [period, data] of Object.entries(periods)) {
        const accuracy = this.calculateAccuracy(data);
        const volume = data.length;

        // Calculate improvement from previous period
        const previousPeriod = this.getPreviousPeriod(
          period,
          timeframe
        );
        const previousData = periods[previousPeriod] || [];
        const previousAccuracy = this.calculateAccuracy(previousData);
        const improvement = accuracy - previousAccuracy;

        trends.push({
          period,
          accuracy,
          volume,
          improvement,
        });
      }
    } catch (error) {
      this.logger.error('Error analyzing trends', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return trends.sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Find common corrections in feedback
   */
  private findCommonCorrections(feedbackData: FeedbackData[]): Array<{
    originalText: string;
    correctedText: string;
    frequency: number;
  }> {
    const corrections = new Map<
      string,
      { correctedText: string; count: number }
    >();

    feedbackData.forEach((feedback) => {
      if (
        feedback.corrections &&
        feedback.userFeedback === 'incorrect'
      ) {
        // Simple pattern matching - in production this would be more sophisticated
        const key = feedback.corrections.substring(0, 50); // Use first 50 chars as key

        if (corrections.has(key)) {
          corrections.get(key)!.count++;
        } else {
          corrections.set(key, {
            correctedText: feedback.corrections,
            count: 1,
          });
        }
      }
    });

    return Array.from(corrections.entries())
      .map(([originalText, { correctedText, count }]) => ({
        originalText,
        correctedText,
        frequency: count,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10); // Top 10 most common corrections
  }

  /**
   * Identify areas for improvement
   */
  private identifyImprovementAreas(
    feedbackData: FeedbackData[]
  ): string[] {
    const areas: string[] = [];

    // Analyze feedback types
    const incorrectCount = feedbackData.filter(
      (f) => f.userFeedback === 'incorrect'
    ).length;
    const partialCount = feedbackData.filter(
      (f) => f.userFeedback === 'partial'
    ).length;
    const total = feedbackData.length;

    if (total === 0) return areas;

    if (incorrectCount / total > 0.3) {
      areas.push(
        'High false positive rate - review detection algorithms'
      );
    }

    if (partialCount / total > 0.2) {
      areas.push(
        'Many partial matches - improve context understanding'
      );
    }

    // Analyze expert notes for common themes
    const expertNotes = feedbackData
      .filter((f) => f.expertNotes)
      .map((f) => f.expertNotes!.toLowerCase());

    if (
      expertNotes.filter((note) => note.includes('context')).length >
      expertNotes.length * 0.3
    ) {
      areas.push('Context sensitivity needs improvement');
    }

    if (
      expertNotes.filter((note) => note.includes('outdated')).length >
      expertNotes.length * 0.2
    ) {
      areas.push('Knowledge base requires more frequent updates');
    }

    return areas;
  }

  /**
   * Calculate accuracy from feedback data
   */
  private calculateAccuracy(feedbackData: FeedbackData[]): number {
    if (feedbackData.length === 0) return 0;

    const correctCount = feedbackData.filter(
      (f) => f.userFeedback === 'correct'
    ).length;
    const partialCount = feedbackData.filter(
      (f) => f.userFeedback === 'partial'
    ).length;

    return (correctCount + partialCount * 0.5) / feedbackData.length;
  }

  /**
   * Group feedback by time period
   */
  private groupByTimePeriod(
    feedbackData: FeedbackData[],
    timeframe: string
  ): Record<string, FeedbackData[]> {
    const groups: Record<string, FeedbackData[]> = {};

    feedbackData.forEach((feedback) => {
      const period = this.getPeriodKey(feedback.timestamp, timeframe);
      if (!groups[period]) {
        groups[period] = [];
      }
      groups[period].push(feedback);
    });

    return groups;
  }

  /**
   * Get period key for grouping
   */
  private getPeriodKey(date: Date, timeframe: string): string {
    if (timeframe.includes('d')) {
      return date.toISOString().split('T')[0]; // Daily
    } else if (timeframe.includes('w')) {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      return weekStart.toISOString().split('T')[0]; // Weekly
    } else {
      return `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, '0')}`; // Monthly
    }
  }

  /**
   * Get previous period key
   */
  private getPreviousPeriod(
    period: string,
    timeframe: string
  ): string {
    const date = new Date(period);

    if (timeframe.includes('d')) {
      date.setDate(date.getDate() - 1);
    } else if (timeframe.includes('w')) {
      date.setDate(date.getDate() - 7);
    } else {
      date.setMonth(date.getMonth() - 1);
    }

    return this.getPeriodKey(date, timeframe);
  }
}
