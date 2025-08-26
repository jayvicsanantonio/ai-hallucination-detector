import { FeedbackData } from '../../models/audit/FeedbackData';
import { FeedbackRepository } from '../../database/interfaces/FeedbackRepository';
import { KnowledgeBaseUpdater } from './KnowledgeBaseUpdater';
import { PatternAnalyzer } from './PatternAnalyzer';
import { Logger } from '../../utils/Logger';
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

export class FeedbackService {
  private feedbackRepository: FeedbackRepository;
  private knowledgeBaseUpdater: KnowledgeBaseUpdater;
  private patternAnalyzer: PatternAnalyzer;
  private logger: Logger;

  constructor(
    feedbackRepository?: FeedbackRepository,
    knowledgeBaseUpdater?: KnowledgeBaseUpdater,
    patternAnalyzer?: PatternAnalyzer
  ) {
    this.feedbackRepository =
      feedbackRepository || new FeedbackRepository();
    this.knowledgeBaseUpdater =
      knowledgeBaseUpdater || new KnowledgeBaseUpdater();
    this.patternAnalyzer = patternAnalyzer || new PatternAnalyzer();
    this.logger = new Logger('FeedbackService');
  }

  /**
   * Process user feedback and update knowledge base
   */
  async processFeedback(
    feedbackData: FeedbackData
  ): Promise<ProcessedFeedback> {
    try {
      this.logger.info('Processing feedback', {
        verificationId: feedbackData.verificationId,
        feedbackType: feedbackData.userFeedback,
      });

      // Store feedback in database
      const storedFeedback = await this.feedbackRepository.create(
        feedbackData
      );

      // Analyze patterns in the feedback
      const patterns = await this.patternAnalyzer.analyzeNewFeedback(
        feedbackData
      );

      // Update knowledge base if corrections provided
      let knowledgeBaseUpdated = false;
      if (
        feedbackData.corrections &&
        feedbackData.userFeedback === 'incorrect'
      ) {
        await this.knowledgeBaseUpdater.updateFromFeedback(
          feedbackData
        );
        knowledgeBaseUpdated = true;
      }

      // Update verification accuracy metrics
      await this.updateAccuracyMetrics(feedbackData);

      this.logger.info('Feedback processed successfully', {
        feedbackId: storedFeedback.id,
        patternsFound: patterns.length,
        knowledgeBaseUpdated,
      });

      return {
        id: storedFeedback.id,
        processed: true,
        knowledgeBaseUpdated,
        patternsIdentified: patterns,
      };
    } catch (error) {
      this.logger.error('Error processing feedback', {
        error: error instanceof Error ? error.message : String(error),
        verificationId: feedbackData.verificationId,
      });
      throw error;
    }
  }

  /**
   * Get feedback statistics for a verification session
   */
  async getFeedbackStats(
    verificationId: string
  ): Promise<FeedbackStats> {
    try {
      const feedback =
        await this.feedbackRepository.findByVerificationId(
          verificationId
        );

      const stats: FeedbackStats = {
        totalFeedback: feedback.length,
        correctCount: feedback.filter(
          (f) => f.userFeedback === 'correct'
        ).length,
        incorrectCount: feedback.filter(
          (f) => f.userFeedback === 'incorrect'
        ).length,
        partialCount: feedback.filter(
          (f) => f.userFeedback === 'partially_correct'
        ).length,
        averageConfidence: this.calculateAverageConfidence(feedback),
        commonIssues: await this.getCommonIssues(verificationId),
      };

      return stats;
    } catch (error) {
      this.logger.error('Error getting feedback stats', {
        error: error instanceof Error ? error.message : String(error),
        verificationId,
      });
      throw error;
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
      return await this.patternAnalyzer.analyzeFeedbackPatterns(
        options
      );
    } catch (error) {
      this.logger.error('Error analyzing feedback patterns', {
        error: error instanceof Error ? error.message : String(error),
        options,
      });
      throw error;
    }
  }

  /**
   * Update accuracy metrics based on feedback
   */
  private async updateAccuracyMetrics(
    feedbackData: FeedbackData
  ): Promise<void> {
    try {
      // Get the original verification result
      const verificationResult =
        await this.feedbackRepository.getVerificationResult(
          feedbackData.verificationId
        );

      if (!verificationResult) {
        this.logger.warn(
          'Verification result not found for feedback',
          {
            verificationId: feedbackData.verificationId,
          }
        );
        return;
      }

      // Calculate accuracy impact
      const accuracyImpact = this.calculateAccuracyImpact(
        feedbackData,
        verificationResult
      );

      // Update metrics in database
      await this.feedbackRepository.updateAccuracyMetrics(
        feedbackData.verificationId,
        accuracyImpact
      );
    } catch (error) {
      this.logger.error('Error updating accuracy metrics', {
        error: error instanceof Error ? error.message : String(error),
        verificationId: feedbackData.verificationId,
      });
    }
  }

  /**
   * Calculate average confidence from feedback
   */
  private calculateAverageConfidence(
    feedback: FeedbackData[]
  ): number {
    const confidenceValues = feedback
      .filter((f) => f.confidence !== undefined)
      .map((f) => f.confidence!);

    if (confidenceValues.length === 0) return 0;

    return (
      confidenceValues.reduce((sum, conf) => sum + conf, 0) /
      confidenceValues.length
    );
  }

  /**
   * Get common issues from feedback
   */
  private async getCommonIssues(verificationId: string): Promise<
    Array<{
      issueType: string;
      count: number;
      accuracy: number;
    }>
  > {
    try {
      return await this.feedbackRepository.getCommonIssues(
        verificationId
      );
    } catch (error) {
      this.logger.error('Error getting common issues', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Get feedback data by domain for training purposes
   */
  async getFeedbackByDomain(domain: Domain): Promise<FeedbackData[]> {
    try {
      return await this.feedbackRepository.findByDomain(domain);
    } catch (error) {
      this.logger.error('Error getting feedback by domain', {
        error: error instanceof Error ? error.message : String(error),
        domain,
      });
      throw error;
    }
  }

  /**
   * Calculate accuracy impact of feedback
   */
  private calculateAccuracyImpact(
    feedbackData: FeedbackData,
    verificationResult: any
  ): number {
    // Simple accuracy calculation based on feedback type
    switch (feedbackData.userFeedback) {
      case 'correct':
        return 1.0;
      case 'incorrect':
        return 0.0;
      case 'partially_correct':
        return 0.5;
      default:
        return 0.5;
    }
  }
}
